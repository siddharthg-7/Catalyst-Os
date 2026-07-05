from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.schemas import StartupContext, ApprovalGateModel
from app.agents.investment.services import generate_investor_update_service
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/api/investment", tags=["investment"])

class InvestorUpdateRequest(BaseModel):
    achievements: Optional[str] = None

@router.post("/investor-update", response_model=ApprovalGateModel)
def draft_investor_update(payload: InvestorUpdateRequest, db: Session = Depends(get_db)):
    """
    Draft a monthly progress update email for investors. The draft is written directly
    to the ApprovalGate table in PENDING status.
    """
    startup = db.query(StartupContext).first()
    if not startup:
        raise HTTPException(
            status_code=400,
            detail="No StartupContext found. Please seed a startup profile first."
        )
    
    try:
        approval_gate = generate_investor_update_service(
            achievements=payload.achievements,
            context=startup,
            db=db
        )
        return approval_gate
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
