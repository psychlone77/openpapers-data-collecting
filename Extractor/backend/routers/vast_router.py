from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from services.vast_service import VastService

router = APIRouter(prefix="/vast", tags=["Vast AI"])

class CreateInstanceRequest(BaseModel):
    gpu_type: str = "RTX_3090"
    image: str = "pytorch/pytorch:latest"

class DestroyInstanceRequest(BaseModel):
    instance_id: int

@router.post("/auto-boot")
async def auto_boot_instance(request: CreateInstanceRequest):
    """Searches for the cheapest GPU and immediately creates an instance."""
    try:
        offers = await VastService.search_instances(gpu_type=request.gpu_type)
        if not offers:
            raise HTTPException(status_code=404, detail="No suitable offers found")
        
        # Offers are typically sorted by dlperf_usd- (best value first), so we take the first one
        best_offer = offers[0]
        offer_id = best_offer.get("id")
        
        if not offer_id:
            raise HTTPException(status_code=500, detail="Offer ID missing in search results")

        result = await VastService.create_instance(offer_id=offer_id, image=request.image)
        return {
            "status": "success",
            "offer_used": best_offer,
            "create_result": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/destroy")
async def destroy_instance(request: DestroyInstanceRequest):
    try:
        result = await VastService.destroy_instance(request.instance_id)
        return {"status": "success", "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
