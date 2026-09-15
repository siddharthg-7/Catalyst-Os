"""
Human-in-the-Loop Approval Queue tools for Catalyst OS.
Ensures high-risk actions (hiring, contracts, external outreach, major budget shifts)
are gated behind founder approval before execution.
"""

from typing import Dict, Any, List, Optional
import uuid
import datetime

# Approval storage bridging runtime agents and frontend Approval Queue
_APPROVAL_QUEUE: List[Dict[str, Any]] = [
    {
        "id": "appr-001",
        "title": "Hire Senior Backend Engineer",
        "description": "Approve opening hiring pipeline and offer allocation for $140,000 annual compensation.",
        "type": "TALENT_HIRING",
        "risk_level": "medium",
        "status": "pending_review",
        "impact": "Monthly burn increases by $11,666. Runway decreases from 13.2 to 9.8 months.",
        "financial_change": 140000.0,
        "created_at": datetime.datetime.now().isoformat()
    }
]


def submit_approval_request(
    title: str,
    description: str,
    action_type: str,
    risk_level: str,
    impact: str,
    financial_change: float = 0.0,
    payload: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Submits an action item to the Founder Approval Center for review before execution.

    Args:
        title: Short descriptive title of the action requiring approval.
        description: Detailed context of what will happen.
        action_type: Category (e.g., 'HIRING', 'LEGAL_DOCUMENT', 'MARKETING_CAMPAIGN', 'FINANCIAL_TRANSACTION').
        risk_level: 'low', 'medium', 'high', or 'critical'.
        impact: Projected impact on startup runway, timeline, or operations.
        financial_change: Dollar amount involved in the decision.
        payload: Optional structured data payload needed for execution upon approval.

    Returns:
        Structured approval ticket details.
    """
    approval_id = f"appr-{uuid.uuid4().hex[:6]}"
    record = {
        "id": approval_id,
        "title": title,
        "description": description,
        "type": action_type.upper(),
        "risk_level": risk_level.lower(),
        "status": "pending_review",
        "impact": impact,
        "financial_change": float(financial_change),
        "payload": payload or {},
        "created_at": datetime.datetime.now().isoformat()
    }
    _APPROVAL_QUEUE.append(record)

    return {
        "status": "APPROVAL_REQUIRED",
        "approval_id": approval_id,
        "record": record,
        "message": f"Action '{title}' classified as {risk_level.upper()} risk and submitted to the Founder Approval Center."
    }


def get_pending_approvals() -> List[Dict[str, Any]]:
    """
    Retrieves all pending approval items currently waiting for founder decision.
    """
    return [item for item in _APPROVAL_QUEUE if item["status"] == "pending_review"]


def review_approval_item(approval_id: str, decision: str, comment: Optional[str] = None) -> Dict[str, Any]:
    """
    Applies the founder's decision ('approved' or 'rejected') to an approval item.
    """
    for item in _APPROVAL_QUEUE:
        if item["id"] == approval_id:
            item["status"] = decision.lower()
            item["decision_comment"] = comment
            item["reviewed_at"] = datetime.datetime.now().isoformat()
            return {
                "status": "SUCCESS",
                "item": item,
                "message": f"Approval item {approval_id} has been {decision.upper()}."
            }
    return {"status": "NOT_FOUND", "error": f"Approval item {approval_id} not found."}
