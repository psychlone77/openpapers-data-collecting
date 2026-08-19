from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
import os
from services.pdf_service import PDFService

router = APIRouter(prefix="/pdf", tags=["PDF Extraction"])

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
