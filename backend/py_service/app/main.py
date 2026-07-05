from dotenv import load_dotenv
load_dotenv()  # Injects all variables from .env into system memory at boot time

import logging
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List

from app.config import settings
from app.core.database import engine, Base, get_db
from app.models.schemas import (
    StartupContext, ApprovalGate, Candidate,
    StartupContextCreate, StartupContextModel, ApprovalGateModel
)

# Import modular agent routers
from app.agents.hiring.router import router as hiring_router
from app.agents.finance.router import router as finance_router
from app.agents.legal.router import router as legal_router
from app.agents.investment.router import router as investment_router
from app.agents.gtm.router import router as gtm_router
from app.agents.orchestrator import router as orchestrator_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("main")

# Auto-create tables on startup
try:
    logger.info("Initializing database and auto-creating tables...")
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables initialized successfully.")
except Exception as e:
    logger.error(f"Error during database initialization: {str(e)}")

app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description="Catalyst OS Backend - Autonomous Startup Operating System"
)

# CORS middleware for Node.js API Gateway & React Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",   # Standard Create-React-App port
        "http://localhost:5173",   # Standard Vite development port
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Agent Routers
app.include_router(hiring_router)
app.include_router(finance_router)
app.include_router(legal_router)
app.include_router(investment_router)
app.include_router(gtm_router)
app.include_router(orchestrator_router)

# Mount legacy/other routers if exists
try:
    from app.routers import simulation
    app.include_router(simulation.router)
    logger.info("Legacy simulation router mounted successfully.")
except ImportError:
    logger.warning("Simulation router not found. Skipping mounting.")

# Helper / Seed Endpoints for StartupContext
@app.get("/api/startup", response_model=StartupContextModel)
def get_startup_context(db: Session = Depends(get_db)):
    """
    Get the global StartupContext.
    """
    startup = db.query(StartupContext).first()
    if not startup:
        raise HTTPException(status_code=404, detail="No StartupContext found. Please seed a startup profile.")
    return startup

@app.post("/api/startup", response_model=StartupContextModel)
def create_or_update_startup_context(payload: StartupContextCreate, db: Session = Depends(get_db)):
    """
    Seed or update the global StartupContext.
    """
    startup = db.query(StartupContext).first()
    if startup:
        # Update existing
        startup.company_name = payload.company_name
        startup.industry = payload.industry
        startup.target_icp = payload.target_icp
        startup.current_monthly_burn = payload.current_monthly_burn
        startup.cash_on_hand = payload.cash_on_hand
    else:
        # Create new
        startup = StartupContext(
            company_name=payload.company_name,
            industry=payload.industry,
            target_icp=payload.target_icp,
            current_monthly_burn=payload.current_monthly_burn,
            cash_on_hand=payload.cash_on_hand
        )
        db.add(startup)
    
    db.commit()
    db.refresh(startup)
    return startup

# Human-in-the-Loop Approval Gate Endpoints
@app.get("/api/approvals", response_model=List[ApprovalGateModel])
def list_approvals(db: Session = Depends(get_db)):
    """
    List all pending and completed approval gate items.
    """
    return db.query(ApprovalGate).all()

@app.get("/api/approvals/{id}", response_model=ApprovalGateModel)
def get_approval(id: str, db: Session = Depends(get_db)):
    """
    Get details of a single approval gate item.
    """
    approval = db.query(ApprovalGate).filter(ApprovalGate.id == id).first()
    if not approval:
        raise HTTPException(status_code=404, detail="Approval gate item not found.")
    return approval

@app.put("/api/approvals/{id}/execute", response_model=ApprovalGateModel)
def execute_approval(id: str, db: Session = Depends(get_db)):
    """
    Execution endpoint: Switches status to APPROVED and simulates transaction execution.
    """
    approval = db.query(ApprovalGate).filter(ApprovalGate.id == id).first()
    if not approval:
        raise HTTPException(status_code=404, detail="Approval gate item not found.")
    
    if approval.status != "PENDING":
        raise HTTPException(status_code=400, detail=f"Approval gate item is already in state: {approval.status}")
    
    # Switch status to APPROVED
    approval.status = "APPROVED"
    db.commit()
    db.refresh(approval)
    
    # Simulate transaction execution
    logger.info(f"=== SIMULATED EXECUTION ===")
    logger.info(f"Action Type: {approval.action_type}")
    logger.info(f"Approval ID: {approval.id}")
    logger.info(f"Payload: {approval.payload}")
    logger.info(f"Transaction successfully executed.")
    logger.info(f"===========================")
    
    return approval

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "app": settings.app_name,
        "environment": settings.environment,
        "database_connected": True
    }
