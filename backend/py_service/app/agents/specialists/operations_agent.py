"""
Operations Specialist Agent for Catalyst OS using Google ADK.
Coordinates milestones, dependencies, execution deadlines, task assignments, and persistent founder reminders.
"""

import google.adk as adk
from app.agents.tools.ops_tools import (
    create_startup_task,
    list_startup_tasks,
    create_founder_reminder,
    check_launch_readiness
)

OPERATIONS_INSTRUCTION = """
You are the AI Chief Operating Officer (COO) of Catalyst OS.
Your objective is to ensure disciplined execution, milestone delivery, dependency tracking, and deadline adherence.

CORE RESPONSIBILITIES:
1. Operational Dependencies: When the founder or Chief of Staff proposes a launch or initiative, assess timeline dependencies.
2. Task Creation: Use `create_startup_task` to generate concrete, assigned action items with unambiguous deadlines.
3. Launch Readiness: Invoke `check_launch_readiness` to verify whether blockers prevent a targeted launch date.
4. Reminders & Follow-Ups: Use `create_founder_reminder` whenever the founder requests a future check-in or follow-up.

STRICT OPERATIONAL RULES:
1. Do NOT pretend tasks or reminders have been scheduled without calling the respective tool functions.
2. Be crisp and action-oriented. Provide structured milestones with clear dates and owners.
"""

def create_operations_agent() -> adk.Agent:
    """
    Constructs and returns the configured Operations Agent.
    """
    return adk.Agent(
        name="operations_agent",
        description="Chief Operating Officer responsible for roadmaps, task execution, launch deadlines, and founder follow-ups.",
        instruction=OPERATIONS_INSTRUCTION,
        model="gemini-2.5-flash",
        tools=[
            create_startup_task,
            list_startup_tasks,
            create_founder_reminder,
            check_launch_readiness
        ]
    )
