import time
import random
from google import genai
from google.genai import types
from sqlalchemy.orm import Session
from app.models.schemas import StartupContext

GTM_PERSONA = (
    "You are a B2B SaaS Product Strategist and Growth Marketing Director. You specialize in segmenting "
    "Ideal Customer Profiles (ICPs) and designing structured multi-channel marketing campaigns tailored "
    "specifically for early-stage companies and their target markets."
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

def refine_icp_service(context: StartupContext, db: Session) -> dict:
    """
    Generates a detailed breakdown of B2B buyer personas / target ICP based on the stored industry context.
    Updates the target_icp column in the database and returns the refined profile.
    """
    import os
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    client = genai.Client(api_key=api_key)
    system_instruction = build_system_instruction(GTM_PERSONA, context)

    prompt = (
        f"Analyze our current industry ({context.industry}) and target ICP descriptor ({context.target_icp or 'None'}). "
        f"Generate a highly detailed, refined Ideal Customer Profile (ICP) segmentation breakdown. "
        f"Include: Firmographics (Company sizes, funding stages, typical verticals), Key Decision Makers "
        f"(Job titles, core pain points, KPIs), and Buying Behavior triggers."
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

    refined_icp_text = response.text

    # Update StartupContext with the refined ICP text
    context.target_icp = refined_icp_text
    db.commit()
    db.refresh(context)

    return {
        "original_target_icp": context.target_icp,
        "refined_icp_details": refined_icp_text
    }

def generate_marketing_campaign_service(focus: str, context: StartupContext) -> str:
    """
    Generates a structured, multi-channel marketing blueprint matching target ICP constraints.
    """
    import os
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    client = genai.Client(api_key=api_key)
    system_instruction = build_system_instruction(GTM_PERSONA, context)

    prompt = (
        f"Design a structured multi-channel marketing campaign blueprint focusing on: {focus}.\n\n"
        f"The campaign must explicitly align with our refined ICP constraints and target personas.\n"
        f"Detail the following channels: Outbound Email / LinkedIn, Content & SEO, Paid Ads (if budget allows), "
        f"and Product-Led Growth (PLG) loops. Provide sample copy templates for the outbound channel."
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
    return response.text
