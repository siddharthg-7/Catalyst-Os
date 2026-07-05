import time
import random
from google import genai
from google.genai import types
from sqlalchemy.orm import Session
from app.models.schemas import StartupContext, Candidate, ApprovalGate
from typing import Optional

INVESTMENT_PERSONA = (
    "You are an Elite Founder Coach and Investor Relations specialist. You are expert at structuring "
    "startup updates to highlight growth momentum, present financial metrics transparently, and maintain "
    "investor trust."
)

def call_gemini_with_retry(client, model, contents, config, max_retries=3):
    """
    Wraps the Gemini API generate_content call with an exponential backoff retry mechanism.
    Catches 503 Unavailable / Overloaded spikes and applies random jitter.
    """
    base_delay = 1.0
    for attempt in range(max_retries):
        try:
            return client.models.generate_content(model=model, contents=contents, config=config)
        except Exception as e:
            err_str = str(e).upper()
            is_temporary = any(x in err_str for x in ["503", "UNAVAILABLE", "OVERLOADED", "RESOURCE_EXHAUSTED", "LIMIT"])
            if is_temporary and attempt < max_retries - 1:
                sleep_time = (base_delay * (2 ** attempt)) + random.uniform(0, 0.5)
                time.sleep(sleep_time)
                continue
            raise e

def build_system_instruction(agent_persona: str, context: StartupContext) -> str:
    """
    Prepends core startup metadata dynamically to the agent's system instruction.
    """
    state_context = (
        f"--- STARTUP GLOBAL STATE CONTEXT ---\n"
        f"Company Name: {context.company_name}\n"
        f"Industry: {context.industry}\n"
        f"Target ICP: {context.target_icp}\n"
        f"Cash On Hand: ${context.cash_on_hand:,.2f}\n"
        f"Current Monthly Burn: ${context.current_monthly_burn:,.2f}\n"
        f"-------------------------------------\n\n"
    )
    return state_context + agent_persona

def generate_investor_update_service(
    achievements: Optional[str], context: StartupContext, db: Session
) -> ApprovalGate:
    """
    Aggregates database metrics (runway, company stats, candidates screened) and drafts a formatted
    investor update email, writing it to the ApprovalGate table in PENDING status.
    """
    # Aggregate data from database
    candidate_count = db.query(Candidate).count()
    runway_months = context.cash_on_hand / context.current_monthly_burn if context.current_monthly_burn > 0 else 999.0

    import os
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    client = genai.Client(api_key=api_key)
    system_instruction = build_system_instruction(INVESTMENT_PERSONA, context)

    prompt = (
        f"Draft a structured, professional monthly progress update email for our investors. "
        f"Integrate the following compiled metrics and highlights:\n"
        f"- Current Runway: {runway_months:.1f} months\n"
        f"- Screened Candidates in Pipeline: {candidate_count}\n"
        f"- Cash On Hand: ${context.cash_on_hand:,.2f} USD\n"
        f"- Monthly Burn Rate: ${context.current_monthly_burn:,.2f} USD\n"
        f"- User-reported key achievements this month:\n{achievements or 'Continuing standard product development and early customer research.'}\n\n"
        f"Structure the email with standard sections: Summary, Key Milestones/Metrics, Hiring & Operations Update, "
        f"Financial Health, and Next Steps. Keep it encouraging but realistic."
    )

    response = call_gemini_with_retry(
        client=client,
        model="gemini-2.5-flash",
        contents=prompt,
        config=types.GenerateContentConfig(
            system_instruction=system_instruction,
            temperature=0.7
        )
    )

    email_content = response.text

    # Write to ApprovalGate as PENDING
    approval = ApprovalGate(
        action_type="INVESTOR_UPDATE",
        payload={
            "runway_months": runway_months,
            "candidate_count": candidate_count,
            "email_subject": f"Monthly Update: {context.company_name} Progress & Key Metrics",
            "email_body": email_content
        },
        status="PENDING"
    )
    db.add(approval)
    db.commit()
    db.refresh(approval)

    return approval
