import re
import json
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
from prisma import Prisma, Json

router = APIRouter(prefix="/api/curation", tags=["curation"])
db = Prisma()

class SubmitVerificationRequest(BaseModel):
    curationMarkdown: str
    images: Dict[str, str]
    boxes: List[Dict[str, Any]]
    explanation: Optional[str] = None

@router.post("/submission/{id}/submit")
async def submit_verification(id: str, request: SubmitVerificationRequest):
    if not db.is_connected():
        await db.connect()
        
    submission = await db.papersubmission.find_unique(where={"id": id})
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
        
    # Update submission with the new markdown and change status
    await db.papersubmission.update(
        where={"id": id},
        data={
            "curationMarkdown": request.curationMarkdown,
            "imagesDict": json.dumps(request.images),
            "boundingBoxes": json.dumps(request.boxes),
            "status": "PENDING_MAINTAINER_VERIFICATION"
        }
    )
    
    return {"status": "success", "message": "Verification submitted to maintainers."}

@router.post("/submission/{id}/approve")
async def approve_submission(id: str):
    if not db.is_connected():
        await db.connect()
        
    try:
        submission = await db.papersubmission.find_unique(where={"id": id})
        if not submission:
            raise HTTPException(status_code=404, detail="Submission not found")
            
        if not submission.curationMarkdown:
            raise HTTPException(status_code=400, detail="No curation markdown to approve")

        # 1. Ensure minimal parent entities exist for this test
        if isinstance(submission.metadata, dict):
            metadata = submission.metadata
        else:
            metadata = json.loads(submission.metadata) if submission.metadata else {}
        exam_id = metadata.get("examination", "A/L")
        subject_name = metadata.get("subject", "Physics")
        year = int(metadata.get("year", 2025))
        
        exam = await db.exam.upsert(
            where={"id": exam_id},
            data={
                "create": {"id": exam_id, "name": exam_id},
                "update": {}
            }
        )
        
        subject_code = subject_name[:2].upper()
        subject = await db.subject.find_first(where={"examId": exam_id, "code": subject_code})
        if not subject:
            subject = await db.subject.create(data={
                "examId": exam_id,
                "code": subject_code,
                "name": subject_name,
                "stream": "General"
            })
            
        paper_type = metadata.get("paperType", "MCQ")
        if paper_type == "MCQ":
            part = "Paper I"
        elif paper_type in ["Structured Essay", "STRUCTURED ESSAY"]:
            part = "Paper II - Part A"
        elif paper_type in ["Essay", "ESSAY"]:
            part = "Paper II - Part B"
        else:
            part = "Paper II"
        paper = await db.paper.find_first(where={
            "subjectId": subject.id,
            "year": year,
            "part": part
        })
        
        paper_data_dict = {
            "curationMarkdown": submission.curationMarkdown,
            "pdfUrl": submission.pdfUrl
        }
        if submission.imagesDict:
            paper_data_dict["imagesDict"] = Json(submission.imagesDict)
        if submission.boundingBoxes:
            paper_data_dict["boundingBoxes"] = Json(submission.boundingBoxes)

        if not paper:
            paper = await db.paper.create(data={
                "subject": {
                    "connect": {
                        "id": subject.id
                    }
                },
                "year": year,
                "part": part,
                "type": metadata.get("paperType", "MCQ"),
                "paperData": {
                    "create": paper_data_dict
                }
            })
            paper_data = await db.paperdata.find_unique(where={"paperId": paper.id})
            paper_data_id = paper_data.id if paper_data else None
        else:
            await db.paper.update(
                where={"id": paper.id},
                data={
                    "paperData": {
                        "upsert": {
                            "create": paper_data_dict,
                            "update": paper_data_dict
                        }
                    }
                }
            )
            paper_data = await db.paperdata.find_unique(where={"paperId": paper.id})
            paper_data_id = paper_data.id if paper_data else None

        # 2. Parse Markdown
        blocks = re.split(r'\n:::\s*Q\s+([^\s:]+)\s*:::\n', "\n" + submission.curationMarkdown)
        
        questions_updated = 0
        questions_created = 0
        sort_order_counter = 1
        
        for i in range(1, len(blocks), 2):
            label = blocks[i]
            content = blocks[i+1]
            
            # Extract @type and @lang
            type_match = re.search(r'^@type\s+(.*)$', content, re.MULTILINE)
            lang_match = re.search(r'^@lang\s+(.*)$', content, re.MULTILINE)
            
            q_type = type_match.group(1).strip() if type_match else "MCQ"
            lang = lang_match.group(1).strip() if lang_match else "en"
            
            # Remove @type and @lang lines
            content = re.sub(r'^@type\s+.*$', '', content, flags=re.MULTILINE)
            content = re.sub(r'^@lang\s+.*$', '', content, flags=re.MULTILINE)
            
            # Split into prompt and options
            parts = re.split(r'^@options\s*$', content, flags=re.MULTILINE)
            content_before_options = parts[0]
            options_text = parts[1].strip() if len(parts) > 1 else None
            
            # Split into prompt and images
            prompt_parts = re.split(r'^@images\s*$', content_before_options, flags=re.MULTILINE)
            prompt = prompt_parts[0].strip()
            images_text = prompt_parts[1].strip() if len(prompt_parts) > 1 else None
            
            prompt_images_json = []
            if images_text:
                # Find all ![image](id) inside the @images block
                image_matches = re.findall(r'!\[.*?\]\((.*?)\)', images_text)
                prompt_images_json.extend(image_matches)
            
            # Basic parsing of options if present
            options_json = []
            if options_text:
                opt_blocks = re.split(r'^\((\d+)\)\s*', "\n" + options_text, flags=re.MULTILINE)
                for j in range(1, len(opt_blocks), 2):
                    opt_key = opt_blocks[j]
                    opt_val = opt_blocks[j+1].strip()
                    options_json.append({"key": opt_key, "text": opt_val})
                    
            # 3. Create or update Question and Localization
            # Find if question already exists for this paper and label
            existing_questions = await db.question.find_many(
                where={
                    "paperId": paper.id,
                    "label": label
                },
                include={"localizations": True}
            )
            
            if existing_questions:
                question = existing_questions[0]
                await db.question.update(
                    where={"id": question.id},
                    data={
                        "type": q_type,
                        "sortOrder": sort_order_counter
                    }
                )
                
                # Update localization
                loc_update_data = {
                    "promptText": prompt,
                    "promptImages": Json(prompt_images_json) if prompt_images_json else Json([])
                }
                if options_json:
                    loc_update_data["options"] = Json(options_json)
                    
                loc = next((l for l in question.localizations if l.languageCode == lang), None)
                if loc:
                    await db.questionlocalization.update(
                        where={"id": loc.id},
                        data=loc_update_data
                    )
                else:
                    loc_create_data = {
                        "question": {"connect": {"id": question.id}},
                        "languageCode": lang,
                        "promptText": prompt,
                        "promptImages": Json(prompt_images_json) if prompt_images_json else Json([])
                    }
                    if options_json:
                        loc_create_data["options"] = Json(options_json)
                        
                    await db.questionlocalization.create(data=loc_create_data)
                questions_updated += 1
            else:
                question = await db.question.create(data={
                    "paperId": paper.id,
                    "label": label,
                    "type": q_type,
                    "sortOrder": sort_order_counter
                })
                
                loc_create_data = {
                    "question": {"connect": {"id": question.id}},
                    "languageCode": lang,
                    "promptText": prompt,
                    "promptImages": Json(prompt_images_json) if prompt_images_json else Json([])
                }
                if options_json:
                    loc_create_data["options"] = Json(options_json)
                    
                await db.questionlocalization.create(data=loc_create_data)
                questions_created += 1
            
            sort_order_counter += 1
            
        # 4. Link Parent Questions
        all_questions = await db.question.find_many(where={"paperId": paper.id})
        label_to_id = {q.label: q.id for q in all_questions}
        
        for q in all_questions:
            if '.' in q.label:
                parent_label = q.label.rsplit('.', 1)[0]
                parent_id = label_to_id.get(parent_label)
                if parent_id and q.parentQuestionId != parent_id:
                    await db.question.update(
                        where={"id": q.id},
                        data={"parentQuestionId": parent_id}
                    )
            elif q.parentQuestionId is not None:
                # If there's no dot but it had a parent previously, unlink it (cleanup)
                await db.question.update(
                    where={"id": q.id},
                    data={"parentQuestionId": None}
                )

        # Complete the submission
        await db.papersubmission.update(
            where={"id": id},
            data={
                "status": "COMPLETED",
                "paperDataId": paper_data_id
            }
        )
            
        return {"status": "success", "message": f"Created {questions_created}, Updated {questions_updated} questions."}
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
        
@router.post("/paper/{paper_id}/edit")
async def start_paper_edit(paper_id: str):
    if not db.is_connected():
        await db.connect()
        
    paper = await db.paper.find_unique(
        where={"id": paper_id},
        include={"subject": True, "paperData": True}
    )
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")
        
    # Create an EDIT submission
    metadata = {
        "examination": paper.subject.examId if paper.subject else "Unknown",
        "subject": paper.subject.name if paper.subject else "Unknown",
        "year": paper.year,
        "paperType": paper.type,
    }
    
    submission = await db.papersubmission.create(data={
        "type": "EDIT_PAPER",
        "status": "PENDING_USER_VALIDATION", # Skips MinerU
        "pdfUrl": paper.paperData.pdfUrl if paper.paperData else None,
        "paperDataId": paper.paperData.id if paper.paperData else None,
        "metadata": json.dumps(metadata),
        "curationMarkdown": paper.paperData.curationMarkdown if paper.paperData else None,
        "imagesDict": paper.paperData.imagesDict if paper.paperData else None,
        "boundingBoxes": paper.paperData.boundingBoxes if paper.paperData else None
    })
    
    return {"status": "success", "submission_id": submission.id}

@router.get("/papers/search")
async def search_papers(exam: str = "", year: str = "", subject: str = ""):
    if not db.is_connected():
        await db.connect()
        
    where_clause = {}
    if year:
        try:
            where_clause["year"] = int(year)
        except ValueError:
            pass
            
    subject_where = {}
    if exam:
        subject_where["examId"] = exam
    if subject:
        subject_where["name"] = subject
        
    if subject_where:
        where_clause["subject"] = {"is": subject_where}

    papers = await db.paper.find_many(
        where=where_clause,
        include={"subject": True, "paperData": True},
        take=20
    )
    
    results = []
    for p in papers:
        name = f"{p.year} {p.subject.name if p.subject else ''} {p.part} ({p.type})"
        results.append({
            "id": p.id,
            "name": name,
            "hasMarkdown": bool(p.paperData and p.paperData.curationMarkdown)
        })
            
    return {"papers": results}
