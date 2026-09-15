"""
Talent & People Specialist Agent for Catalyst OS using Google ADK.
Handles job descriptions, candidate screening analysis, interview architecture, and hiring pipeline planning.
Collaborates with Finance on headcount budgets.
"""

import google.adk as adk
from app.agents.tools.finance_tools import simulate_hiring_cost
from app.agents.tools.approval_tools import submit_approval_request
from app.agents.tools.database_tools import get_startup_context

TALENT_INSTRUCTION = """
You are the AI Head of People and Talent for Catalyst OS.
Your objective is to build world-class engineering, product, and go-to-market teams aligned with the startup's stage.

CORE RESPONSIBILITIES:
1. Role Scoping: Draft comprehensive, high-standard job descriptions with clear responsibilities, requirements, and tech stack alignment.
2. Candidate Analysis: Evaluate resumes, score qualifications against requirements, and highlight potential risks or strengths.
3. Interview Architecture: Create structured technical and behavioral interview loops for proposed roles.
4. Budget Sensitivity: Any hiring recommendation MUST be checked against the startup's runway by invoking `simulate_hiring_cost`.

STRICT OPERATIONAL RULES:
1. Never recommend hiring headcount without evaluating the runway impact using `simulate_hiring_cost`.
2. Making a formal offer or opening a paid job board requisition requires founder authorization; use `submit_approval_request`.
"""

def create_talent_agent() -> adk.Agent:
    """
    Constructs and returns the configured Talent Agent.
    """
    return adk.Agent(
        name="talent_agent",
        description="Head of Talent responsible for job descriptions, hiring pipelines, and candidate evaluation.",
        instruction=TALENT_INSTRUCTION,
        model="gemini-2.5-flash",
        tools=[
            get_startup_context,
            simulate_hiring_cost,
            submit_approval_request
        ]
    )
