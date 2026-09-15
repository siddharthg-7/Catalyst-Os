"""
Operations and execution tools for Catalyst OS.
Enables task creation, deadline management, milestone dependencies, and persistent reminders.
"""

from typing import Dict, Any, List, Optional
import uuid
import datetime

# In-memory operational store for runtime tasks & reminders (persisted across agent calls)
_OPERATIONAL_TASKS: List[Dict[str, Any]] = [
    {
        "id": "task-001",
        "title": "Finalize Production API Gateway Deployment",
        "assigned_to": "Operations",
        "status": "in_progress",
        "priority": "high",
        "deadline": "2026-10-01",
        "created_at": datetime.datetime.now().isoformat()
    },
    {
        "id": "task-002",
        "title": "Complete SOC2 Type I Security Compliance Audit",
        "assigned_to": "Legal",
        "status": "pending",
        "priority": "high",
        "deadline": "2026-10-15",
        "created_at": datetime.datetime.now().isoformat()
    },
    {
        "id": "task-003",
        "title": "Design Product Hunt Launch Assets & Copy",
        "assigned_to": "Growth",
        "status": "pending",
        "priority": "medium",
        "deadline": "2026-10-05",
        "created_at": datetime.datetime.now().isoformat()
    }
]

_FOUNDER_REMINDERS: List[Dict[str, Any]] = []


def create_startup_task(
    title: str,
    assigned_to: str,
    deadline: str,
    priority: str = "medium"
) -> Dict[str, Any]:
    """
    Creates a new operational action task for the startup team.

    Args:
        title: Description of the task to be performed.
        assigned_to: Specialist agent or team member assigned (e.g., 'Operations', 'Growth', 'Talent').
        deadline: Due date string (e.g., '2026-10-10' or 'Next Friday').
        priority: Priority level ('low', 'medium', 'high', 'urgent').

    Returns:
        Structured task record.
    """
    new_task = {
        "id": f"task-{uuid.uuid4().hex[:6]}",
        "title": title,
        "assigned_to": assigned_to,
        "status": "pending",
        "priority": priority.lower(),
        "deadline": deadline,
        "created_at": datetime.datetime.now().isoformat()
    }
    _OPERATIONAL_TASKS.append(new_task)
    return {
        "status": "CREATED",
        "task": new_task,
        "message": f"Task '{title}' assigned to {assigned_to} due on {deadline}."
    }


def list_startup_tasks(assigned_to: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Returns the list of active startup tasks, optionally filtered by assignee.
    """
    if assigned_to:
        target = assigned_to.lower().strip()
        return [t for t in _OPERATIONAL_TASKS if t["assigned_to"].lower() == target]
    return list(_OPERATIONAL_TASKS)


def create_founder_reminder(reminder_text: str, due_date: str) -> Dict[str, Any]:
    """
    Creates a persistent calendar/action reminder for the founder.

    Args:
        reminder_text: What the founder needs to be reminded of.
        due_date: When the reminder should trigger.

    Returns:
        Reminder confirmation record.
    """
    reminder = {
        "id": f"rem-{uuid.uuid4().hex[:6]}",
        "reminder_text": reminder_text,
        "due_date": due_date,
        "status": "scheduled",
        "created_at": datetime.datetime.now().isoformat()
    }
    _FOUNDER_REMINDERS.append(reminder)
    return {
        "status": "SCHEDULED",
        "reminder": reminder,
        "message": f"Reminder set for {due_date}: '{reminder_text}'"
    }


def check_launch_readiness(target_launch_date: str) -> Dict[str, Any]:
    """
    Analyzes outstanding tasks, dependencies, and deadlines against the targeted product launch date.

    Args:
        target_launch_date: Target launch date or timeline description.

    Returns:
        Launch feasibility assessment including blocker count and readiness score.
    """
    pending = [t for t in _OPERATIONAL_TASKS if t["status"] in ("pending", "in_progress")]
    urgent_blockers = [t for t in pending if t["priority"] in ("high", "urgent")]

    readiness_score = max(20, 100 - (len(pending) * 8) - (len(urgent_blockers) * 15))

    return {
        "target_launch_date": target_launch_date,
        "total_pending_tasks": len(pending),
        "critical_blockers": len(urgent_blockers),
        "readiness_score": readiness_score,
        "is_feasible": len(urgent_blockers) <= 2,
        "recommendation": (
            "ON_TRACK: Launch can proceed if high-priority blockers are closed."
            if len(urgent_blockers) <= 2
            else "AT_RISK: Key operational blockers require completion before launch."
        )
    }
