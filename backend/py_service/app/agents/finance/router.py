from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.schemas import StartupContext
from app.agents.finance.services import analyze_expenses_service, runway_calculator_service
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/api/finance", tags=["finance"])

class ExpenseAnalysisRequest(BaseModel):
    expenses_data: str

@router.post("/analyze-expenses")
def analyze_expenses(payload: ExpenseAnalysisRequest, db: Session = Depends(get_db)):
    """
    Parse monthly expenses from text or CSV and update startup burn rate.
    """
    startup = db.query(StartupContext).first()
    if not startup:
        raise HTTPException(
            status_code=400,
            detail="No StartupContext found. Please seed a startup profile first."
        )
    
    try:
        result = analyze_expenses_service(payload.expenses_data, startup, db)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/runway-calculator")
def calculate_runway(
    new_hire_role: Optional[str] = Query(None, description="Proposed new hire role to calculate runway impact"),
    db: Session = Depends(get_db)
):
    """
    Calculate current runway, or project runway impact of a new hire.
    """
    startup = db.query(StartupContext).first()
    if not startup:
        raise HTTPException(
            status_code=400,
            detail="No StartupContext found. Please seed a startup profile first."
        )
    
    try:
        result = runway_calculator_service(new_hire_role, startup)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
