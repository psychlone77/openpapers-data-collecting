import re
import json
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
from prisma import Prisma

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
            
        part = "Paper I" if metadata.get("paperType") == "MCQ" else "Paper II"
        paper = await db.paper.find_first(where={
            "subjectId": subject.id,
            "year": year,
            "part": part
        })
        
        if not paper:
            paper = await db.paper.create(data={
                "subjectId": subject.id,
                "year": year,
                "part": part,
                "type": metadata.get("paperType", "MCQ"),
                "curationMarkdown": submission.curationMarkdown,
                "imagesDict": submission.imagesDict,
                "boundingBoxes": submission.boundingBoxes,
                "pdfPath": submission.pdfPath
            })
        else:
            await db.paper.update(
                where={"id": paper.id},
                data={
                    "curationMarkdown": submission.curationMarkdown,
                    "imagesDict": submission.imagesDict,
                    "boundingBoxes": submission.boundingBoxes,
                    "pdfPath": submission.pdfPath
                }
            )

        # 2. Parse Markdown
        blocks = re.split(r'\n:::\s*Q\s+([^\s:]+)\s*:::\n', "\n" + submission.curationMarkdown)
        
        questions_updated = 0
        questions_created = 0
        
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
                        "sortOrder": int(label) if label.isdigit() else 0
                    }
                )
                
                # Update localization
                loc = next((l for l in question.localizations if l.languageCode == lang), None)
                if loc:
                    await db.questionlocalization.update(
                        where={"id": loc.id},
                        data={
                            "promptText": prompt,
                            "promptImages": json.dumps(prompt_images_json),
                            "options": json.dumps(options_json) if options_json else None
                        }
                    )
                else:
                    await db.questionlocalization.create(data={
                        "questionId": question.id,
                        "languageCode": lang,
                        "promptText": prompt,
                        "promptImages": json.dumps(prompt_images_json),
                        "options": json.dumps(options_json) if options_json else None
                    })
                questions_updated += 1
            else:
                question = await db.question.create(data={
                    "paperId": paper.id,
                    "label": label,
                    "type": q_type,
                    "sortOrder": int(label) if label.isdigit() else 0
                })
                
                await db.questionlocalization.create(data={
                    "questionId": question.id,
                    "languageCode": lang,
                    "promptText": prompt,
                    "promptImages": json.dumps(prompt_images_json),
                    "options": json.dumps(options_json) if options_json else None
                })
                questions_created += 1
            
        # Complete the submission
        await db.papersubmission.update(
            where={"id": id},
            data={
                "status": "COMPLETED",
                "paperId": paper.id
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
        include={"subject": True}
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
        "pdfPath": paper.pdfPath,
        "paperId": paper.id,
        "metadata": json.dumps(metadata),
        "curationMarkdown": paper.curationMarkdown,
        "imagesDict": paper.imagesDict,
        "boundingBoxes": paper.boundingBoxes
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
        include={"subject": True},
        take=20
    )
    
    results = []
    for p in papers:
        name = f"{p.year} {p.subject.name if p.subject else ''} {p.part} ({p.type})"
        results.append({
            "id": p.id,
            "name": name,
            "hasMarkdown": bool(p.curationMarkdown)
        })
            
    return {"papers": results}
