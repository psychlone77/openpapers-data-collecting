from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from prisma import Prisma
import json
import httpx
import os
from services.ast_service import ASTService

router = APIRouter(prefix="/api/queue", tags=["queue"])
db = Prisma()

class AddToQueueRequest(BaseModel):
    pdf_path: str
    metadata: Dict[str, Any]
    pages: Optional[List[int]] = None
    submitter_email: Optional[str] = None

@router.post("")
async def add_to_queue(request: AddToQueueRequest):
    if not db.is_connected():
        await db.connect()
    
    metadata = request.metadata
    if request.pages:
        metadata["pages"] = request.pages

    # Keep only string representations for nested dicts/lists to avoid Prisma JSON serialization issues
    # Prisma Python is a bit sensitive with JSON fields
    metadata_json = json.dumps(metadata)
    
    submission = await db.papersubmission.create(data={
        "type": "NEW_PAPER",
        "status": "PENDING_MINERU",
        "pdfPath": request.pdf_path,
        "metadata": metadata_json,
        "submitterEmail": request.submitter_email
    })
    
    return {"status": "success", "id": submission.id}

@router.get("")
async def get_queue():
    if not db.is_connected():
        await db.connect()
    
    submissions = await db.papersubmission.find_many(
        order={"createdAt": "desc"}
    )
    return {"submissions": submissions}

@router.get("/{id}")
async def get_submission(id: str):
    if not db.is_connected():
        await db.connect()
    
    submission = await db.papersubmission.find_unique(where={"id": id})
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    # Check if we have paper context
    paper = None
    if submission.paperId:
        paper = await db.paper.find_unique(where={"id": submission.paperId})
        
    return {
        "submission": submission,
        "paper": paper
    }

@router.post("/{id}/trigger-mineru")
async def trigger_mineru(id: str, background_tasks: BackgroundTasks):
    if not db.is_connected():
        await db.connect()
    
    submission = await db.papersubmission.find_unique(where={"id": id})
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    if submission.status not in ["PENDING_MINERU", "EXTRACTION_FAILED"]:
        raise HTTPException(status_code=400, detail="Submission is not pending MinerU")
    
    # Update status to indicate processing has started
    await db.papersubmission.update(
        where={"id": id},
        data={"status": "PROCESSING_EXTRACTION"}
    )
    
    # We should run this as a background task
    background_tasks.add_task(run_mineru_task, id)
    return {"status": "success", "message": "MinerU task started"}

async def run_mineru_task(submission_id: str):
    if not db.is_connected():
        await db.connect()
    
    try:
        submission = await db.papersubmission.find_unique(where={"id": submission_id})
        if not submission:
            return
            
        target_pdf_path = submission.pdfPath
        
        # Determine language/paper_type from metadata or defaults
        language = "en"
        paper_type = "MCQ"
        exam_type = "unknown"
        pages = None        
        if submission.metadata:
            try:
                metadata_dict = json.loads(submission.metadata) if isinstance(submission.metadata, str) else submission.metadata
                language = metadata_dict.get("language", "en")
                paper_type = metadata_dict.get("paperType", "MCQ")
                exam_type = metadata_dict.get("examType", "unknown")
                pages = metadata_dict.get("pages")
            except:
                pass

        if pages:
            import fitz
            doc = fitz.open(target_pdf_path)
            page_indices = [p - 1 for p in pages if 0 <= p - 1 < len(doc)]
            if page_indices:
                cropped_pdf_path = target_pdf_path.replace(".pdf", "_cropped.pdf")
                new_doc = fitz.open()
                for p in page_indices:
                    new_doc.insert_pdf(doc, from_page=p, to_page=p)
                new_doc.save(cropped_pdf_path)
                new_doc.close()
                target_pdf_path = cropped_pdf_path
            doc.close()

        url = "http://1.208.108.242:33525/file_parse"
        
        with open(target_pdf_path, "rb") as f:
            files = {
                "files": (os.path.basename(target_pdf_path), f, "application/pdf")
            }
            data = {
                "effort": "high",
                "parse_method": "ocr",
                "formula_enable": True,
                "table_enable": True,
                "image_analysis": True,
                "return_md": True,
                "return_model_output": True,
                "return_content_list": True,
                "return_images": True,
            }
            
            async with httpx.AsyncClient(timeout=300.0) as client:
                response = await client.post(url, files=files, data=data)
                
                if response.status_code != 200:
                    raise Exception(f"MinerU Error: {response.text}")
                
                res = response.json()
                
                results_dict = res.get("results", {})
                model_output_data = {}
                if results_dict and isinstance(results_dict, dict):
                    first_key = list(results_dict.keys())[0]
                    file_result = results_dict[first_key]
                    
                    mo = file_result.get("model_output", {})
                    if isinstance(mo, str):
                        try:
                            model_output_data = json.loads(mo)
                        except:
                            pass
                    else:
                        model_output_data = mo
                
                curation_markdown, bounding_boxes, images_dict = ASTService.parse_model_output_to_curation_markdown(
                    model_output_data, 
                    target_pdf_path,
                    language,
                    paper_type,
                    exam_type,
                    pages
                )
                
                await db.papersubmission.update(
                    where={"id": submission_id},
                    data={
                        "rawMineruOutput": json.dumps(res),
                        "curationMarkdown": curation_markdown,
                        "boundingBoxes": json.dumps(bounding_boxes),
                        "imagesDict": json.dumps(images_dict),
                        "status": "PENDING_USER_VALIDATION",
                        "pdfPath": target_pdf_path
                    }
                )
                
                print(f"\n========================================================")
                print(f"USER NOTIFICATION: Extraction complete!")
                print(f"Please validate your paper at: http://localhost:3000/validate/{submission_id}")
                print(f"========================================================\n")
                
                if submission.submitterEmail:
                    print(f"Mock Email sent to {submission.submitterEmail}: MinerU extraction complete. Please validate your paper.")
                    
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"MinerU background task failed for {submission_id}: {e}")
        
        try:
            await db.papersubmission.update(
                where={"id": submission_id},
                data={"status": "EXTRACTION_FAILED"}
            )
        except Exception as update_err:
            print(f"Failed to update status to EXTRACTION_FAILED: {update_err}")
