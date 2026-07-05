import json
import time
import random
from typing import List, Dict, Any, Optional
from google import genai
from google.genai import types
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.models.schemas import StartupContext

FINANCE_PERSONA = (
    "You are a Seasoned Venture Capital Fractional CFO. You assess structural operational "
    "burn rates objectively and enforce calculations deterministically. You never hallucinate "
    "financial math and always rely on external tools for calculations."
)

class ExpenseItem(BaseModel):
    category: str = Field(description="Category of the expense, e.g., SaaS, Rent, Payroll, Marketing")
    description: str = Field(description="Description of the expense item")
    amount: float = Field(description="The monetary value of the expense item in USD")

class ExpenseAnalysisSchema(BaseModel):
    expenses: List[ExpenseItem] = Field(description="List of all parsed individual expense items")
    total_burn: float = Field(description="The sum total of all parsed expenses")

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

def calculate_runway_impact(role_salary: float, cash_on_hand: float, current_burn: float) -> dict:
    """
    Calculates the impact of a proposed role's salary on the monthly burn rate and runway.

    Args:
        role_salary: The annual salary of the proposed role in USD.
        cash_on_hand: The current cash balance of the startup in USD.
        current_burn: The current monthly burn rate of the startup in USD.
    """
    current_runway = cash_on_hand / current_burn if current_burn > 0 else 999.0
    new_monthly_burn = current_burn + (role_salary / 12.0)
    projected_runway = cash_on_hand / new_monthly_burn if new_monthly_burn > 0 else 999.0
    return {
        "role_salary": role_salary,
        "current_monthly_burn": current_burn,
        "new_monthly_burn": new_monthly_burn,
        "current_runway_months": round(current_runway, 2),
        "projected_runway_months": round(projected_runway, 2),
        "runway_decrease_months": round(max(0.0, current_runway - projected_runway), 2)
    }

def analyze_expenses_service(expenses_data: str, context: StartupContext, db: Session) -> dict:
    """
    Parses unstructured raw expense data into structured items, computes the total monthly burn,
    updates StartupContext, and returns the analysis.
    """
    import os
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    client = genai.Client(api_key=api_key)
    system_instruction = build_system_instruction(FINANCE_PERSONA, context)

    prompt = (
        f"Parse the following unstructured expenses text or CSV block into the structured JSON format.\n"
        f"Calculate the total burn sum of all items.\n\n"
        f"Expenses Data:\n{expenses_data}"
    )

    response = call_gemini_with_retry(
        client=client,
        model="gemini-2.5-flash",
        contents=prompt,
        config=types.GenerateContentConfig(
            system_instruction=system_instruction,
            response_mime_type="application/json",
            response_schema=ExpenseAnalysisSchema,
            temperature=0.1
        )
    )

    try:
        if hasattr(response, 'parsed') and response.parsed:
            analysis = response.parsed
        else:
            data = json.loads(response.text)
            analysis = ExpenseAnalysisSchema(**data)
    except Exception as e:
        raise ValueError(f"Failed to parse expenses: {str(e)}. Raw: {response.text}")

    # Update database StartupContext monthly burn
    context.current_monthly_burn = analysis.total_burn
    db.commit()
    db.refresh(context)

    return {
        "expenses": [item.model_dump() for item in analysis.expenses],
        "total_monthly_burn": analysis.total_burn,
        "updated_startup_burn": context.current_monthly_burn
    }

def runway_calculator_service(new_hire_role: Optional[str], context: StartupContext) -> dict:
    """
    Determines runway. If new_hire_role is specified, uses Gemini tool calling to estimate
    compensation and calculate projected runway impact deterministically.
    """
    # If no role is proposed, just calculate current runway
    if not new_hire_role:
        current_runway = context.cash_on_hand / context.current_monthly_burn if context.current_monthly_burn > 0 else 999.0
        return {
            "current_monthly_burn": context.current_monthly_burn,
            "cash_on_hand": context.cash_on_hand,
            "current_runway_months": round(current_runway, 2),
            "new_hire_proposed": False
        }

    import os
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    client = genai.Client(api_key=api_key)
    system_instruction = build_system_instruction(FINANCE_PERSONA, context)

    prompt = (
        f"Identify the typical market annual compensation (salary) for a '{new_hire_role}' "
        f"in the context of our startup's industry. Once identified, invoke the function "
        f"`calculate_runway_impact` using that salary, and the cash_on_hand and current_burn "
        f"from our global context metadata."
    )

    response = call_gemini_with_retry(
        client=client,
        model="gemini-2.5-flash",
        contents=prompt,
        config=types.GenerateContentConfig(
            system_instruction=system_instruction,
            tools=[calculate_runway_impact],
            temperature=0.0
        )
    )

    # Check for function calling triggers
    if response.function_calls:
        for function_call in response.function_calls:
            if function_call.name == "calculate_runway_impact":
                args = function_call.args
                role_salary = float(args.get("role_salary", 0.0))
                coh = float(args.get("cash_on_hand") or context.cash_on_hand)
                cb = float(args.get("current_burn") or context.current_monthly_burn)
                
                # Execute computation engine deterministically
                calculation = calculate_runway_impact(role_salary, coh, cb)
                calculation["new_hire_proposed"] = True
                calculation["role_title"] = new_hire_role
                return calculation

    # Fallback if function calling didn't trigger, let's ask Gemini to estimate salary as text
    # and compute it directly.
    fallback_prompt = (
        f"What is the average market annual salary for a '{new_hire_role}' in the {context.industry} industry? "
        f"Reply ONLY with the number (float or integer), nothing else."
    )
    fallback_response = call_gemini_with_retry(
        client=client,
        model="gemini-2.5-flash",
        contents=fallback_prompt,
        config=types.GenerateContentConfig(temperature=0.2)
    )
    try:
        cleaned_text = fallback_response.text.replace("$", "").replace(",", "").strip()
        role_salary = float(cleaned_text)
    except Exception:
        role_salary = 120000.0  # Safe default fallback

    calculation = calculate_runway_impact(role_salary, context.cash_on_hand, context.current_monthly_burn)
    calculation["new_hire_proposed"] = True
    calculation["role_title"] = new_hire_role
    calculation["fallback_estimated"] = True
    return calculation
