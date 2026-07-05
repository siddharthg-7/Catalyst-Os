import time
import random
from google import genai
from google.genai import types
from sqlalchemy.orm import Session
from app.models.schemas import StartupContext, ApprovalGate

LEGAL_PERSONA = (
    "You are a Startup General Counsel specializing in corporate law, commercial compliance, "
    "and early-stage standard agreements. You draft highly professional, detailed, and legally robust "
    "contracts and NDAs using Markdown syntax."
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

def generate_employee_contract_service(
    candidate_name: str, role: str, salary: float, start_date: str, context: StartupContext
) -> str:
    """
    Generates a comprehensive employment agreement in Markdown format.
    """
    import os
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    client = genai.Client(api_key=api_key)
    system_instruction = build_system_instruction(LEGAL_PERSONA, context)

    prompt = (
        f"Draft a formal, comprehensive startup employment contract in Markdown for the following details:\n"
        f"Employer: {context.company_name}\n"
        f"Employee Name: {candidate_name}\n"
        f"Role/Title: {role}\n"
        f"Annual Salary: ${salary:,.2f} USD\n"
        f"Start Date: {start_date}\n\n"
        f"Include typical clauses: Duties, Compensation, Benefits, Term & Termination, Proprietary Information "
        f"and Inventions Agreement (IP assignment), Governing Law, and Signatures."
    )

    response = call_gemini_with_retry(
        client=client,
        model="gemini-2.5-flash",
        contents=prompt,
        config=types.GenerateContentConfig(
            system_instruction=system_instruction,
            temperature=0.3
        )
    )
    return response.text

def generate_nda_service(
    party_name: str, purpose: str, context: StartupContext, db: Session
) -> ApprovalGate:
    """
    Drafts a mutual Non-Disclosure Agreement and writes it directly to the ApprovalGate table
    as a PENDING transaction.
    """
    import os
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    client = genai.Client(api_key=api_key)
    system_instruction = build_system_instruction(LEGAL_PERSONA, context)

    prompt = (
        f"Draft a standard mutual Non-Disclosure Agreement (NDA) in Markdown between:\n"
        f"Party 1 (Company): {context.company_name}\n"
        f"Party 2 (Counterparty): {party_name}\n"
        f"Purpose of Disclosure: {purpose}\n\n"
        f"Include standard terms: Definition of Confidential Information, Obligations of Receiving Party, "
        f"Exclusions from Confidentiality, Term (e.g., 3 years), Return of Materials, Governing Law, and Signatures."
    )

    response = call_gemini_with_retry(
        client=client,
        model="gemini-2.5-flash",
        contents=prompt,
        config=types.GenerateContentConfig(
            system_instruction=system_instruction,
            temperature=0.3
        )
    )

    nda_text = response.text

    # Write to ApprovalGate as PENDING
    approval = ApprovalGate(
        action_type="LEGAL_CONTRACT",
        payload={
            "party_name": party_name,
            "purpose": purpose,
            "contract_type": "NDA",
            "document_content": nda_text
        },
        status="PENDING"
    )
    db.add(approval)
    db.commit()
    db.refresh(approval)

    return approval
