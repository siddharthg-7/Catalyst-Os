from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.schemas import StartupContext, ApprovalGateModel
from app.agents.legal.services import generate_employee_contract_service, generate_nda_service
from pydantic import BaseModel

router = APIRouter(prefix="/api/legal", tags=["legal"])

class EmployeeContractRequest(BaseModel):
    candidate_name: str
    role: str
    salary: float
    start_date: str

class NdaRequest(BaseModel):
    party_name: str
    purpose: str

@router.post("/employee-contract")
def generate_employee_contract(payload: EmployeeContractRequest, db: Session = Depends(get_db)):
    """
    Generate an employee contract in Markdown format. Returns the generated contract text directly.
    """
    startup = db.query(StartupContext).first()
    if not startup:
        raise HTTPException(
            status_code=400,
            detail="No StartupContext found. Please seed a startup profile first."
        )
    
    try:
        contract_text = generate_employee_contract_service(
            candidate_name=payload.candidate_name,
            role=payload.role,
            salary=payload.salary,
            start_date=payload.start_date,
            context=startup
        )
        return {"employee_contract": contract_text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/nda", response_model=ApprovalGateModel)
def generate_nda(payload: NdaRequest, db: Session = Depends(get_db)):
    """
    Generate a mutual NDA. The output is written directly to the ApprovalGate table in PENDING status.
    """
    startup = db.query(StartupContext).first()
    if not startup:
        raise HTTPException(
            status_code=400,
            detail="No StartupContext found. Please seed a startup profile first."
        )
    
    try:
        approval_gate = generate_nda_service(
            party_name=payload.party_name,
            purpose=payload.purpose,
            context=startup,
            db=db
        )
        return approval_gate
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
