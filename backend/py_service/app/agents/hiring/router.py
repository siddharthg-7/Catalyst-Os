from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.schemas import StartupContext, CandidateModel
from app.agents.hiring.services import generate_job_description_service, screen_resume_service
from pydantic import BaseModel

router = APIRouter(prefix="/api/hiring", tags=["hiring"])

class JobDescriptionRequest(BaseModel):
    role_title: str
    key_responsibilities: str

@router.post("/job-description")
def generate_job_description(payload: JobDescriptionRequest, db: Session = Depends(get_db)):
    """
    Generate a tailored job description based on global StartupContext.
    """
    startup = db.query(StartupContext).first()
    if not startup:
        raise HTTPException(
            status_code=400,
            detail="No StartupContext found. Please seed a startup profile first."
        )
    
    try:
        jd = generate_job_description_service(payload.role_title, payload.key_responsibilities, startup)
        return {"job_description": jd}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/screen-resume", response_model=CandidateModel)
async def screen_resume(
    file: UploadFile = File(...),
    job_description: str = Form(...),
    db: Session = Depends(get_db)
):
    """
    Upload a candidate resume PDF and screen it against the target job description.
    """
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF resumes are supported.")
    
    startup = db.query(StartupContext).first()
    if not startup:
        raise HTTPException(
            status_code=400,
            detail="No StartupContext found. Please seed a startup profile first."
        )
    
    try:
        pdf_bytes = await file.read()
        candidate = screen_resume_service(pdf_bytes, job_description, startup, db)
        return candidate
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
