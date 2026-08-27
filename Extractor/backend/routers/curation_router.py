import re
import json
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, List
from prisma import Prisma

router = APIRouter(prefix="/api/curation", tags=["curation"])
db = Prisma()

class SaveCurationRequest(BaseModel):
    curationMarkdown: str
    images: Dict[str, str]

@router.post("/save")
async def save_curation(request: SaveCurationRequest):
    if not db.is_connected():
        await db.connect()
        
    try:
        # 1. Ensure minimal parent entities exist for this test
        # We will hardcode Exam, Subject, and Paper for now since UI doesn't provide them yet.
        exam_id = "sl_al"
        exam = await db.exam.upsert(
            where={"id": exam_id},
            data={
                "create": {"id": exam_id, "name": "Sri Lankan GCE A/L"},
                "update": {}
            }
        )
        
        subject_code = "01"
        subject = await db.subject.find_first(where={"examId": exam_id, "code": subject_code})
        if not subject:
            subject = await db.subject.create(data={
                "examId": exam_id,
                "code": subject_code,
                "name": "Physics",
                "stream": "Physical Science"
            })
            
        paper = await db.paper.find_first(where={
            "subjectId": subject.id,
            "year": 2025,
            "part": "Paper I"
        })
        if not paper:
            paper = await db.paper.create(data={
                "subjectId": subject.id,
                "year": 2025,
                "part": "Paper I",
                "type": "MCQ"
            })

        # 2. Parse Markdown
        blocks = re.split(r'\n:::\s*Q\s+([^\s:]+)\s*:::\n', "\n" + request.curationMarkdown)
        
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
            
        return {"status": "success", "message": f"Saved {questions_created} questions to database."}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
