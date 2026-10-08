"""
Unified Google ADK API Router for Catalyst OS (v1).
Exposes endpoints for the AI Chief of Staff, executive briefs, deterministic scenarios,
health metrics, tasks, approvals, and the decision audit log.
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional
import datetime

from app.agents.specialists.chief_of_staff import chief_pipeline
from app.services.health_service import calculate_startup_health
from app.agents.tools.finance_tools import simulate_scenario, calculate_runway, simulate_hiring_cost
from app.agents.tools.ops_tools import list_startup_tasks, create_startup_task, create_founder_reminder
from app.agents.tools.approval_tools import get_pending_approvals, review_approval_item, submit_approval_request
from app.agents.tools.database_tools import get_startup_context, get_decision_history, record_decision

router = APIRouter(prefix="/api/v1", tags=["ADK Executive Team"])


# Request Schemas
class CommandRequest(BaseModel):
    command: str = Field(description="Natural language founder command or query")
    user_id: Optional[str] = Field(default="founder", description="Founder or team user ID")
    session_id: Optional[str] = Field(default=None, description="Optional conversation session ID")


class ScenarioRequest(BaseModel):
    cash_on_hand: Optional[float] = None
    monthly_burn: Optional[float] = None
    hiring_roles: Optional[List[Dict[str, Any]]] = None
    marketing_budget_change: Optional[float] = 0.0
    expected_mrr_growth: Optional[float] = 0.0


class TaskCreateRequest(BaseModel):
    title: str
    assigned_to: str
    deadline: str
    priority: Optional[str] = "medium"


class ApprovalReviewRequest(BaseModel):
    comment: Optional[str] = None


# --- 1. Founder Command Entrypoint ---
@router.post("/commands")
async def execute_founder_command(req: CommandRequest):
    """
    Primary intelligence interface. Routes the founder's command through the Google ADK
    Chief of Staff pipeline, selectively executing relevant specialists and validating with the Auditor.
    """
    if not req.command or not req.command.strip():
        raise HTTPException(status_code=400, detail="Command cannot be empty.")
    
    result = await chief_pipeline.execute_command(
        command=req.command.strip(),
        user_id=req.user_id,
        session_id=req.session_id
    )
    return result


# --- 2. Daily Executive Brief ---
@router.get("/brief")
def get_daily_executive_brief():
    """
    Returns the real-time daily operational brief generated from actual startup data.
    """
    return chief_pipeline.generate_daily_brief()


# --- 3. Executive Agents Directory ---
@router.get("/agents")
def get_executive_agents():
    """
    Lists the AI Executive Team and their operational statuses.
    """
    return [
        {
            "id": "chief_of_staff",
            "name": "Sophia Vance",
            "role": "Chief of Staff",
            "avatar": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150",
            "status": "active",
            "framework": "Google ADK 2.6.0"
        },
        {
            "id": "finance",
            "name": "Marcus Sterling",
            "role": "Chief Financial Officer (CFO)",
            "avatar": "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150",
            "status": "ready",
            "framework": "Google ADK 2.6.0"
        },
        {
            "id": "growth",
            "name": "Elena Rostova",
            "role": "VP of Growth & Marketing",
            "avatar": "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150",
            "status": "ready",
            "framework": "Google ADK 2.6.0"
        },
        {
            "id": "operations",
            "name": "David Chen",
            "role": "Chief Operating Officer (COO)",
            "avatar": "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150",
            "status": "ready",
            "framework": "Google ADK 2.6.0"
        },
        {
            "id": "talent",
            "name": "Sarah Jenkins",
            "role": "Head of People & Talent",
            "avatar": "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=150",
            "status": "ready",
            "framework": "Google ADK 2.6.0"
        },
        {
            "id": "auditor",
            "name": "Sentinel One",
            "role": "Independent AI Auditor",
            "avatar": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150",
            "status": "verifying",
            "framework": "Google ADK 2.6.0"
        }
    ]


# --- 4. Startup Health Score (Deterministic) ---
@router.get("/health-score")
def get_startup_health_score():
    """
    Computes objective startup health across Finance, Operations, Growth, and Hiring.
    """
    ctx = get_startup_context()
    tasks = list_startup_tasks()
    approvals = get_pending_approvals()

    return calculate_startup_health(
        cash_on_hand=ctx.get("cash_on_hand", 245000.0),
        monthly_burn=ctx.get("current_monthly_burn", 18500.0),
        active_tasks=len(tasks),
        pending_approvals=len(approvals)
    )


# --- 5. Deterministic Scenario Simulator ---
@router.post("/scenarios/simulate")
def run_scenario_simulation(req: ScenarioRequest):
    """
    Simulates what-if outcomes deterministically without LLM arithmetic errors.
    """
    ctx = get_startup_context()
    cash = req.cash_on_hand if req.cash_on_hand is not None else ctx.get("cash_on_hand", 245000.0)
    burn = req.monthly_burn if req.monthly_burn is not None else ctx.get("current_monthly_burn", 18500.0)

    return simulate_scenario(
        cash_on_hand=cash,
        current_burn=burn,
        hiring_roles=req.hiring_roles,
        marketing_budget_change=req.marketing_budget_change or 0.0,
        expected_mrr_growth=req.expected_mrr_growth or 0.0
    )


# --- 6. Human-in-the-Loop Approval Center ---
@router.get("/approvals")
def list_approvals():
    """
    Returns pending and active approval gate records.
    """
    return get_pending_approvals()


@router.post("/approvals/{id}/approve")
def approve_action(id: str, req: Optional[ApprovalReviewRequest] = None):
    """
    Approves an action item and commits the recorded decision to the audit log.
    """
    comment = req.comment if req else None
    result = review_approval_item(id, "approved", comment)
    if result.get("status") == "NOT_FOUND":
        raise HTTPException(status_code=404, detail="Approval ticket not found")

    item = result["item"]
    record_decision(
        title=item["title"],
        description=item["description"],
        category=item.get("type", "General"),
        financial_impact=-float(item.get("financial_change", 0.0)),
        impact_text=item.get("impact", "Approved by founder.")
    )
    return result


@router.post("/approvals/{id}/reject")
def reject_action(id: str, req: Optional[ApprovalReviewRequest] = None):
    """
    Rejects an action item.
    """
    comment = req.comment if req else None
    result = review_approval_item(id, "rejected", comment)
    if result.get("status") == "NOT_FOUND":
        raise HTTPException(status_code=404, detail="Approval ticket not found")
    return result


# --- 7. Decision Audit Log ---
@router.get("/decisions")
def get_decisions():
    """
    Returns the immutable audit log of executive founder decisions.
    """
    return get_decision_history()


# --- 8. Operational Tasks ---
@router.get("/tasks")
def get_tasks(assigned_to: Optional[str] = None):
    """
    Returns active tasks.
    """
    return list_startup_tasks(assigned_to)


@router.post("/tasks")
def create_task(req: TaskCreateRequest):
    """
    Creates a new assigned operational task.
    """
    return create_startup_task(
        title=req.title,
        assigned_to=req.assigned_to,
        deadline=req.deadline,
        priority=req.priority or "medium"
    )
