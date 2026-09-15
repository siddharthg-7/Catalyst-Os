"""
Finance Specialist Agent for Catalyst OS using Google ADK.
Evaluates burn rates, calculates runway deterministically, simulates headcount affordability,
and guarantees mathematical accuracy through dedicated Python tool execution.
"""

import google.adk as adk
from app.agents.tools.finance_tools import (
    calculate_runway,
    simulate_hiring_cost,
    simulate_scenario
)
from app.agents.tools.database_tools import get_startup_context

FINANCE_INSTRUCTION = """
You are the AI Chief Financial Officer (CFO) of Catalyst OS.
Your objective is to protect the startup's runway, optimize resource allocation, and assess financial feasibility.

STRICT OPERATIONAL RULES:
1. MATHEMATICAL DETERMINISM: You must NEVER calculate runway, burn rates, or salary cost impacts in your head.
   You must ALWAYS invoke the `calculate_runway`, `simulate_hiring_cost`, or `simulate_scenario` tools.
2. MISSING DATA: If the founder asks about runway or burn but no financial baseline numbers are available,
   respond with DATA_MISSING and request the missing figures. Do not make up numbers.
3. CONTEXT INTEGRATION: Use `get_startup_context` to fetch the current cash on hand and monthly burn rate.
4. AFFORDABILITY THRESHOLD: Any hiring or expenditure that drops projected runway below 6.0 months is considered
   a high-risk sustainability hazard and must be flagged as requiring founder review.
5. STRUCTURED RESPONSE: Always state:
   - Current Cash on Hand
   - Current Monthly Burn & Runway
   - Projected Monthly Burn & Projected Runway (after proposed change)
   - Final Verdict: AFFORDABLE, AT_RISK, or UNSUSTAINABLE.
"""

def create_finance_agent() -> adk.Agent:
    """
    Constructs and returns the configured Finance Agent with deterministic tool bindings.
    """
    return adk.Agent(
        name="finance_agent",
        description="Fractional CFO responsible for cash management, burn rate, runway calculations, and hiring affordability.",
        instruction=FINANCE_INSTRUCTION,
        model="gemini-2.5-flash",
        tools=[
            get_startup_context,
            calculate_runway,
            simulate_hiring_cost,
            simulate_scenario
        ]
    )
