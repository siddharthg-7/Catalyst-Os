"""
Independent Auditor Agent for Catalyst OS using Google ADK.
Validates multi-agent proposals, checks evidence sources, audits mathematical consistency,
and prevents hallucinated claims from entering the executive decision layer.
"""

from typing import Dict, Any, List
import json
import logging
import google.adk as adk
from app.agents.tools.database_tools import get_startup_context

logger = logging.getLogger("auditor_agent")

AUDITOR_INSTRUCTION = """
You are the Independent AI Auditor for Catalyst OS.
Your responsibility is strictly critical validation. You do not generate original ideas;
you objectively audit outputs produced by other specialist agents (Finance, Talent, Operations, Growth).

AUDIT CRITERIA:
1. Arithmetic Consistency: Verify whether projected runway numbers align with cash and burn rates.
2. Grounding & Evidence: Check whether claims are supported by startup facts or data. Flag any unsubstantiated claims.
3. Missing Data: If a specialist made assumptions without baseline metrics, flag as DATA_MISSING.
4. Contradictions: Check if two specialists gave opposing advice (e.g., Finance says 'cannot afford' while Talent says 'hire immediately').
5. High-Risk Exposure: Verify whether high-stakes operations (releasing funds, signing contracts, sending external messages) have been flagged for founder approval.

OUTPUT SPECIFICATION:
You must conclude your evaluation with a structured JSON block matching this exact schema:
```json
{
  "status": "PASS | FAIL | NEEDS_REVIEW",
  "audit_summary": "Concise summary of findings",
  "issues": ["Issue 1", "Issue 2"],
  "unsupported_claims": [],
  "missing_evidence": [],
  "calculation_errors": [],
  "required_human_review": true
}
```
"""

def create_auditor_agent() -> adk.Agent:
    """
    Constructs and returns the configured Auditor Agent.
    """
    return adk.Agent(
        name="auditor_agent",
        description="Independent Auditor validating agent outputs for accuracy, calculation validity, evidence, and security risks.",
        instruction=AUDITOR_INSTRUCTION,
        model="gemini-2.5-flash",
        tools=[get_startup_context]
    )
