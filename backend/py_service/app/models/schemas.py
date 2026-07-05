import uuid
from sqlalchemy import Column, String, Float, Text, JSON
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional
from app.core.database import Base

# ==========================================
# 1. SQLAlchemy Database Models
# ==========================================

class StartupContext(Base):
    """
    Stores global startup profile context shared by all agents.
    """
    __tablename__ = "startup_contexts"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    company_name = Column(String, nullable=False)
    industry = Column(String, nullable=False)
    target_icp = Column(Text, nullable=True)
    current_monthly_burn = Column(Float, default=0.0)
    cash_on_hand = Column(Float, default=0.0)


class Candidate(Base):
    """
    Stores screened candidate resumes and match analysis results.
    """
    __tablename__ = "candidates"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    resume_text = Column(Text, nullable=True)
    match_score = Column(Float, default=0.0)
    analysis_report = Column(Text, nullable=True)


class ApprovalGate(Base):
    """
    Stores action items requiring human verification before execution.
    """
    __tablename__ = "approval_gates"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    action_type = Column(String, nullable=False)  # e.g., 'LEGAL_CONTRACT', 'INVESTOR_UPDATE'
    payload = Column(JSON, nullable=False)         # Document details, drafted agreements, etc.
    status = Column(String, default="PENDING")     # PENDING, APPROVED, REJECTED


# ==========================================
# 2. Pydantic Validation & Serialization Schemas
# ==========================================

# StartupContext Schemas
class StartupContextBase(BaseModel):
    company_name: str
    industry: str
    target_icp: Optional[str] = None
    current_monthly_burn: float = 0.0
    cash_on_hand: float = 0.0

class StartupContextCreate(StartupContextBase):
    pass

class StartupContextUpdate(BaseModel):
    company_name: Optional[str] = None
    industry: Optional[str] = None
    target_icp: Optional[str] = None
    current_monthly_burn: Optional[float] = None
    cash_on_hand: Optional[float] = None

class StartupContextModel(StartupContextBase):
    id: str

    class Config:
        from_attributes = True


# Candidate Schemas
class CandidateBase(BaseModel):
    name: str
    email: str
    resume_text: Optional[str] = None
    match_score: float = 0.0
    analysis_report: Optional[str] = None

class CandidateCreate(CandidateBase):
    pass

class CandidateModel(CandidateBase):
    id: str

    class Config:
        from_attributes = True


# ApprovalGate Schemas
class ApprovalGateBase(BaseModel):
    action_type: str
    payload: Dict[str, Any]
    status: str = "PENDING"

class ApprovalGateCreate(ApprovalGateBase):
    pass

class ApprovalGateUpdateStatus(BaseModel):
    status: str

class ApprovalGateModel(ApprovalGateBase):
    id: str

    class Config:
        from_attributes = True


# Gemini Structured Outputs Schema
class ResumeScreeningSchema(BaseModel):
    """
    Pydantic schema passed directly to Gemini SDK for resume screening structured outputs.
    """
    name: str = Field(description="Full name of the candidate extracted from the resume")
    email: str = Field(description="Email address of the candidate extracted from the resume")
    match_score: float = Field(description="Score between 0 and 100 (float) indicating how closely the candidate matches the job description")
    analysis_summary: str = Field(description="Detailed analysis report outlining strengths, weaknesses, and matching criteria")
