from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.schemas import StartupContext
from app.agents.gtm.services import refine_icp_service, generate_marketing_campaign_service
from pydantic import BaseModel

router = APIRouter(prefix="/api/gtm", tags=["gtm"])

class MarketingCampaignRequest(BaseModel):
    focus: str

@router.post("/refine-icp")
def refine_icp(db: Session = Depends(get_db)):
    """
    Generate a detailed Ideal Customer Profile (ICP) based on startup industry and save it to context.
    """
    startup = db.query(StartupContext).first()
    if not startup:
        raise HTTPException(
            status_code=400,
            detail="No StartupContext found. Please seed a startup profile first."
        )
    
    try:
        result = refine_icp_service(startup, db)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/marketing-campaign")
def generate_marketing_campaign(payload: MarketingCampaignRequest, db: Session = Depends(get_db)):
    """
    Generate a multi-channel marketing blueprint matching stored target ICP constraints.
    """
    startup = db.query(StartupContext).first()
    if not startup:
        raise HTTPException(
            status_code=400,
            detail="No StartupContext found. Please seed a startup profile first."
        )
    
    try:
        campaign = generate_marketing_campaign_service(payload.focus, startup)
        return {"marketing_campaign": campaign}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
