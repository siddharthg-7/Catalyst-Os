import os
import json
import logging
import time
import random
from typing import List, Dict, Any, Optional, Literal
import re
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from google import genai
from google.genai import types
from dotenv import load_dotenv

# Define directory levels
current_file = Path(__file__).resolve()
py_service_dir = current_file.parent.parent.parent          # py_service root
repo_root_dir = py_service_dir.parent.parent                # Catalyst-Os root

# Scan both locations sequentially for a valid .env file
env_locations = [
    repo_root_dir / ".env",
    py_service_dir / ".env"
]

# Load the first matching environment file found on disk
for path in env_locations:
    if path.exists():
        load_dotenv(dotenv_path=path, override=True)
        break

# Safely extract credentials
api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")

if not api_key:
    raise ValueError(f"Orchestrator configuration failure: API token missing. Verified paths: {[str(p) for p in env_locations]}")

client = genai.Client(api_key=api_key)

from app.core.database import get_db
from app.models.schemas import StartupContext, ApprovalGate

# Setup router
router = APIRouter(prefix="/api", tags=["orchestrate"])
logger = logging.getLogger("orchestrator")

# ==========================================
# 1. Pydantic Validation & Plan Models
# ==========================================

class AgentSubTask(BaseModel):
    task_id: int = Field(description="Unique incremental execution step index starting at 1")
    agent_domain: Literal["hiring", "finance", "legal", "gtm", "investment"] = Field(description="The target specialized agent domain responsible for this sub-task")
    action_verb: str = Field(description="The targeted internal service method invocation string (e.g., 'generate_job_description', 'calculate_runway_impact', 'generate_nda', 'refine_icp', 'marketing_campaign')")
    extracted_payload: str = Field(description="The targeted text prompt fragment or unstructured configuration input (or JSON string) specific to this sub-task")
    is_critical: bool = Field(description="Set to True if this task involves generating official legal records, executing external distributions, or altering high-stakes states")

class MasterOrchestrationPlan(BaseModel):
    strategic_intent: str = Field(description="The orchestrator's analytical summary explaining how it intends to satisfy the compound user prompt")
    ordered_tasks: List[AgentSubTask] = Field(description="The array of sequenced sub-tasks sorted sequentially by execution dependency requirements")

class OrchestrateRequest(BaseModel):
    command: str

class StepProcessed(BaseModel):
    id: int
    domain: str
    action: str
    outcome: str

class OrchestrationResponse(BaseModel):
    execution_status: str
    orchestrator_summary: str
    steps_processed: List[StepProcessed]

# ==========================================
# 2. Retry Utility for Gemini Calls
# ==========================================

def call_gemini_with_retry(client, model, contents, config, max_retries=3):
    """
    Wraps the Gemini API generate_content call with an exponential backoff retry mechanism.
    Catches 503 Unavailable / Overloaded spikes and applies random jitter.
    Supports dynamic RetryInfo backoff extraction.
    """
    base_delay = 1.0
    for attempt in range(max_retries):
        try:
            return client.models.generate_content(model=model, contents=contents, config=config)
        except Exception as e:
            error_msg = str(e)
            if "RetryInfo" in error_msg or "429" in error_msg:
                # Check if the error specifies a exact retry delay string (e.g., '9s')
                delay_match = re.search(r"'retryDelay':\s*'(\d+)s'", error_msg)
                sleep_duration = int(delay_match.group(1)) if delay_match else 10
                
                print(f"⚠️ Rate limit threshold reached. Google requested a sleep window. Backing off for {sleep_duration} seconds...")
                time.sleep(sleep_duration + 1) # Add a 1-second safety buffer
                if attempt < max_retries - 1:
                    continue
            
            err_str = error_msg.upper()
            is_temporary = any(x in err_str for x in ["503", "UNAVAILABLE", "OVERLOADED", "RESOURCE_EXHAUSTED", "LIMIT"])
            if is_temporary and attempt < max_retries - 1:
                sleep_time = (base_delay * (2 ** attempt)) + random.uniform(0, 0.5)
                time.sleep(sleep_time)
                continue
            raise e

# ==========================================
# 3. Dynamic Execution & Dispatcher Logic
# ==========================================

def execute_sub_task(task: AgentSubTask, context: StartupContext, db: Session) -> dict:
    """
    Dynamically routes the action verb to the appropriate modular service.
    """
    domain = task.agent_domain.lower()
    verb = task.action_verb.lower()
    payload_str = task.extracted_payload

    # Attempt to load payload string as JSON dictionary for structured parameters
    payload_data = {}
    try:
        payload_data = json.loads(payload_str)
    except Exception:
        payload_data = {"raw_value": payload_str}

    if domain == "hiring":
        from app.agents.hiring.services import generate_job_description_service
        if "job_description" in verb or "generate" in verb:
            title = payload_data.get("role_title") or payload_data.get("raw_value") or "Software Engineer"
            resp = payload_data.get("key_responsibilities") or payload_data.get("raw_value") or "Design and code APIs."
            res = generate_job_description_service(title, resp, context)
            return {"status": "SUCCESS", "result": res}
        else:
            raise ValueError(f"Hiring agent verb not supported: {task.action_verb}")

    elif domain == "finance":
        from app.agents.finance.services import analyze_expenses_service, runway_calculator_service
        if "expenses" in verb or "analyze" in verb:
            res = analyze_expenses_service(payload_str, context, db)
            return {"status": "SUCCESS", "result": res}
        elif "runway" in verb or "calculator" in verb or "impact" in verb:
            role = payload_data.get("new_hire_role") or payload_data.get("role_title") or payload_data.get("raw_value") or "Engineer"
            res = runway_calculator_service(role, context)
            return {"status": "SUCCESS", "result": res}
        else:
            raise ValueError(f"Finance agent verb not supported: {task.action_verb}")

    elif domain == "legal":
        from app.agents.legal.services import generate_employee_contract_service, generate_nda_service
        if "employee_contract" in verb or "contract" in verb:
            name = payload_data.get("candidate_name") or "John Doe"
            role = payload_data.get("role") or "Software Engineer"
            salary = float(payload_data.get("salary") or 130000.0)
            start_date = payload_data.get("start_date") or "2026-09-01"
            res = generate_employee_contract_service(name, role, salary, start_date, context)
            return {"status": "SUCCESS", "result": res}
        elif "nda" in verb:
            # generate_nda_service writes to ApprovalGate directly and returns it
            party = payload_data.get("party_name") or payload_data.get("raw_value") or "Counterparty Corp"
            purpose = payload_data.get("purpose") or "Strategic Partnership Discussions"
            res = generate_nda_service(party, purpose, context, db)
            return {"status": "PENDING_APPROVAL", "gate_id": res.id, "result": "NDA drafted and saved to ApprovalGate."}
        else:
            raise ValueError(f"Legal agent verb not supported: {task.action_verb}")

    elif domain == "investment":
        from app.agents.investment.services import generate_investor_update_service
        if "investor_update" in verb or "update" in verb:
            achievements = payload_data.get("achievements") or payload_data.get("raw_value") or ""
            res = generate_investor_update_service(achievements, context, db)
            return {"status": "PENDING_APPROVAL", "gate_id": res.id, "result": "Investor update drafted and saved to ApprovalGate."}
        else:
            raise ValueError(f"Investment agent verb not supported: {task.action_verb}")

    elif domain == "gtm":
        from app.agents.gtm.services import refine_icp_service, generate_marketing_campaign_service
        if "refine" in verb or "icp" in verb:
            res = refine_icp_service(context, db)
            return {"status": "SUCCESS", "result": res}
        elif "marketing_campaign" in verb or "campaign" in verb:
            focus = payload_data.get("focus") or payload_data.get("raw_value") or "Developer Adoption"
            res = generate_marketing_campaign_service(focus, context)
            return {"status": "SUCCESS", "result": res}
        else:
            raise ValueError(f"GTM agent verb not supported: {task.action_verb}")

    else:
        raise ValueError(f"Unsupported specialized agent domain: {task.agent_domain}")

# ==========================================
# 4. FastAPI Router Handler
# ==========================================

@router.post("/orchestrate", response_model=OrchestrationResponse)
def orchestrate_command(payload: OrchestrateRequest, db: Session = Depends(get_db)):
    """
    Exposes the master planning and sequential multi-agent execution pipeline.
    """
    logger.info(f"Received master orchestrator command: {payload.command}")

    # Fetch startup context snapshot
    startup = db.query(StartupContext).first()
    if not startup:
        raise HTTPException(
            status_code=400,
            detail="No StartupContext found. Please seed a startup profile first."
        )

    # ------------------------------------------
    # Phase A: Decomposition Phase (The Planner Node)
    # ------------------------------------------
    
    planner_system_instruction = (
        "You are the master AI planner for Catalyst OS (Autonomous Startup Operating System).\n"
        "Your task is to parse a compound founder instruction and decompose it into a series of "
        "chronologically ordered specialised sub-tasks (hiring, finance, legal, gtm, or investment).\n"
        "Available actions per agent domain:\n"
        "- hiring: 'generate_job_description' (payload specifies title and responsibilities)\n"
        "- finance: 'analyze_expenses' (payload specifies raw text/CSV expenses), 'calculate_runway_impact' (payload specifies new hire role)\n"
        "- legal: 'generate_employee_contract' (payload specifies candidate_name, role, salary, start_date), 'generate_nda' (payload specifies party_name, purpose)\n"
        "- investment: 'investor_update' (payload specifies accomplishments/achievements)\n"
        "- gtm: 'refine_icp' (empty payload), 'marketing_campaign' (payload specifies campaign focus)\n\n"
        "High-stakes tasks like generating NDAs, drafting employee contracts for signature, and compiling "
        "investor updates are critical. Set `is_critical=True` for those steps.\n"
        "Return the resulting master plan matching the MasterOrchestrationPlan schema exactly."
    )

    prompt = (
        f"Decompose the following user command:\n"
        f"Command: \"{payload.command}\"\n\n"
        f"Make sure to customise the extracted payloads and sequence parameters to align "
        f"perfectly with the startup profile details."
    )

    try:
        response = call_gemini_with_retry(
            client=client,
            model="gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=planner_system_instruction,
                response_mime_type="application/json",
                response_schema=MasterOrchestrationPlan,
                temperature=0.2
            )
        )

        if hasattr(response, 'parsed') and response.parsed:
            plan = response.parsed
        else:
            plan_data = json.loads(response.text)
            plan = MasterOrchestrationPlan(**plan_data)

    except Exception as e:
        logger.error(f"Planner node failure: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate orchestration plan: {str(e)}")

    logger.info(f"Generated orchestration plan: {plan.strategic_intent}")

    # ------------------------------------------
    # Phase B & C: Sequential Execution & Critical Action Gate Monitoring
    # ------------------------------------------
    steps_processed = []
    execution_status = "COMPLETED"
    summary_parts = []
    
    # Sort tasks strictly by task_id ascending
    ordered_tasks = sorted(plan.ordered_tasks, key=lambda t: t.task_id)

    for task in ordered_tasks:
        # Hydrate StartupContext fresh from DB at start of each loop iteration (State Propagation)
        db.refresh(startup)
        
        logger.info(f"Processing sub-task {task.task_id}: {task.agent_domain}/{task.action_verb} (Critical: {task.is_critical})")

        # Check if the task is critical (Human-in-the-Loop Gate)
        if task.is_critical:
            # Suspend progression, store PENDING gate record
            # First, check if the service creates the gate naturally
            if "nda" in task.action_verb.lower() or "investor_update" in task.action_verb.lower():
                try:
                    res = execute_sub_task(task, startup, db)
                    steps_processed.append(StepProcessed(
                        id=task.task_id,
                        domain=task.agent_domain,
                        action=task.action_verb,
                        outcome="PENDING_APPROVAL"
                    ))
                    summary_parts.append(f"Suspended execution for critical {task.agent_domain} task. Sent to approval gate.")
                except Exception as ex:
                    steps_processed.append(StepProcessed(
                        id=task.task_id,
                        domain=task.agent_domain,
                        action=task.action_verb,
                        outcome="FAILED"
                    ))
                    summary_parts.append(f"Critical task execution failed: {str(ex)}")
            else:
                # Manually register custom approval gate
                gate = ApprovalGate(
                    action_type="CRITICAL_ACTION",
                    payload={
                        "domain": task.agent_domain,
                        "action": task.action_verb,
                        "extracted_payload": task.extracted_payload
                    },
                    status="PENDING"
                )
                db.add(gate)
                db.commit()
                db.refresh(gate)

                steps_processed.append(StepProcessed(
                    id=task.task_id,
                    domain=task.agent_domain,
                    action=task.action_verb,
                    outcome="PENDING_APPROVAL"
                ))
                summary_parts.append(f"Halted at critical step {task.task_id}. Approval gate id: {gate.id}.")

            execution_status = "COMPLETED_WITH_GATES"
            # Suspend progression: break out of execution path
            break

        # Standard non-critical task execution
        try:
            res = execute_sub_task(task, startup, db)
            steps_processed.append(StepProcessed(
                id=task.task_id,
                domain=task.agent_domain,
                action=task.action_verb,
                outcome="SUCCESS"
            ))
            summary_parts.append(f"Successfully processed {task.action_verb}.")
        except Exception as ex:
            logger.error(f"Task {task.task_id} execution failed: {str(ex)}")
            steps_processed.append(StepProcessed(
                id=task.task_id,
                domain=task.agent_domain,
                action=task.action_verb,
                outcome="FAILED"
            ))
            summary_parts.append(f"Task {task.action_verb} failed: {str(ex)}")
            execution_status = "COMPLETED_WITH_ERRORS"
            break

        # Force a quota cool-down window to safeguard the API free-tier caps
        print(f"--> [Orchestrator] Task {task.task_id} completed. Cooling down API quota for 2.5 seconds...")
        time.sleep(2.5)

    # Build final diagnostic output
    orchestrator_summary = (
        f"{plan.strategic_intent} "
        f"{' '.join(summary_parts)}"
    )

    return OrchestrationResponse(
        execution_status=execution_status,
        orchestrator_summary=orchestrator_summary,
        steps_processed=steps_processed
    )
