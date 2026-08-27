from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import List
import os
import shutil
import uuid
from services.pdf_service import PDFService

router = APIRouter(prefix="/pdf", tags=["PDF Extraction"])

@router.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    os.makedirs("data/uploads", exist_ok=True)
    file_id = str(uuid.uuid4())
    file_path = os.path.abspath(f"data/uploads/{file_id}_{file.filename}")
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        return {"pdf_path": file_path}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class CropRequest(BaseModel):
    # For now we use the explicit path, later we can lookup via document_id
    pdf_path: str 
    page_number: int
    bbox: List[float] # [x0, y0, x1, y1]
    dpi: int = 300

class CropResponse(BaseModel):
    image_base64: str

@router.post("/crop", response_model=CropResponse)
async def generate_crop(request: CropRequest):
    if not os.path.exists(request.pdf_path):
        raise HTTPException(status_code=404, detail="PDF file not found")
        
    try:
        b64_image = PDFService.extract_crop(
            pdf_path=request.pdf_path,
            page_number=request.page_number,
            bbox=request.bbox,
            dpi=request.dpi
        )
        return CropResponse(image_base64=b64_image)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class ProcessRequest(BaseModel):
    pdf_path: str
    language: str = "en"
    paper_type: str = "MCQ"

class ProcessResponse(BaseModel):
    curation_markdown: str
    bounding_boxes: List[dict]
    images_dict: dict

@router.post("/process", response_model=ProcessResponse)
async def process_pdf(request: ProcessRequest):
    if not os.path.exists(request.pdf_path):
        raise HTTPException(status_code=404, detail="PDF file not found")

    import json
    try:
        # Dummy response for development: read from cached JSON to simulate real flow
        cached_res_path = os.path.join(os.path.dirname(__file__), "..", "mineru_last_res.json")
        if not os.path.exists(cached_res_path):
            raise HTTPException(status_code=500, detail="mineru_last_res.json not found to simulate dummy response")
            
        with open(cached_res_path, "r", encoding="utf-8") as f:
            res = json.load(f)
            
        model_output_data = {}
        results_dict = res.get("results", {})
        if results_dict and isinstance(results_dict, dict):
            # Usually keyed by filename, grab the first one
            first_key = list(results_dict.keys())[0]
            file_result = results_dict[first_key]
            
            # model_output might be a string (JSON encoded) or dict
            mo = file_result.get("model_output", {})
            if isinstance(mo, str):
                try:
                    model_output_data = json.loads(mo)
                except:
                    model_output_data = {}
            else:
                model_output_data = mo
                
        # Parse model_output into curation syntax markdown and bounding boxes
        from services.ast_service import ASTService
        curation_markdown, bounding_boxes, images_dict = ASTService.parse_model_output_to_curation_markdown(
            model_output_data, 
            request.pdf_path,
            request.language,
            request.paper_type
        )
        
        return ProcessResponse(
            curation_markdown=curation_markdown,
            bounding_boxes=bounding_boxes,
            images_dict=images_dict
        )
        
        # --- ORIGINAL MINERU IMPLEMENTATION (COMMENTED OUT FOR DEVELOPMENT) ---
        # import httpx
        # import json
        # 
        # url = "http://154.9.228.248:23709/file_parse"
        # 
        # with open(request.pdf_path, "rb") as f:
        #     files = {
        #         "files": (os.path.basename(request.pdf_path), f, "application/pdf")
        #     }
        #     data = {
        #         "effort": "high",
        #         "parse_method": "ocr",
        #         "formula_enable": True,
        #         "table_enable": True,
        #         "image_analysis": True,
        #         "return_md": True,
        #         "return_model_output": True,
        #         "return_content_list": True,
        #         "return_images": True,
        #     }
        #     
        #     async with httpx.AsyncClient(timeout=300.0) as client:
        #         response = await client.post(url, files=files, data=data)
        #         
        #         if response.status_code != 200:
        #             raise HTTPException(status_code=response.status_code, detail=f"MinerU Error: {response.text}")
        #         
        #         res = response.json()
        #         
        #         # Save response for debugging
        #         with open("mineru_last_res.json", "w") as out:
        #             json.dump(res, out, indent=2)
        #         
        #         markdown_text = ""
        #         model_output_data = {}
        #         
        #         results_dict = res.get("results", {})
        #         if results_dict and isinstance(results_dict, dict):
        #             # Usually keyed by filename, grab the first one
        #             first_key = list(results_dict.keys())[0]
        #             file_result = results_dict[first_key]
        #             
        #             markdown_text = file_result.get("md_content", "")
        #             
        #             # model_output might be a string (JSON encoded) or dict
        #             mo = file_result.get("model_output", {})
        #             if isinstance(mo, str):
        #                 try:
        #                     model_output_data = json.loads(mo)
        #                 except:
        #                     model_output_data = {}
        #             else:
        #                 model_output_data = mo
        #         
        #         if not markdown_text:
        #             markdown_text = "Failed to extract markdown from MinerU response. See mineru_last_res.json."
        #             
        #         model_output = model_output_data
        #         
        #         # Parse model_output into curation syntax markdown and bounding boxes
        #         from services.ast_service import ASTService
        #         curation_markdown, bounding_boxes = ASTService.parse_model_output_to_curation_markdown(
        #             model_output_data, 
        #             request.pdf_path,
        #             request.language,
        #             request.paper_type
        #         )
        #         
        #         return ProcessResponse(
        #             curation_markdown=curation_markdown,
        #             bounding_boxes=bounding_boxes
        #         )
        # ----------------------------------------------------------------------
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
