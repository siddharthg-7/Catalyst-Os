import io
import json
import time
import random
from google import genai
from google.genai import types
from pypdf import PdfReader
from app.models.schemas import StartupContext, Candidate, ResumeScreeningSchema
from sqlalchemy.orm import Session

HIRING_PERSONA = (
    "You are an Elite tech startup Head of Talent. You excel at translating brief, high-level "
    "requirements into clear, industry-specific Job Descriptions, and you meticulously audit "
    "technical resume components to find the best match for startup needs."
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

def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """
    Extracts plain text from a resume PDF using pypdf.
    """
    try:
        reader = PdfReader(io.BytesIO(pdf_bytes))
        text = ""
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
        return text.strip()
    except Exception as e:
        raise ValueError(f"Failed to parse PDF resume: {str(e)}")

def generate_job_description_service(role_title: str, key_responsibilities: str, context: StartupContext) -> str:
    """
    Generates a tailored Job Description utilizing the global startup context.
    """
    import os
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    client = genai.Client(api_key=api_key)
    system_instruction = build_system_instruction(HIRING_PERSONA, context)
    
    prompt = (
        f"Generate a professional, compelling, and industry-specific Job Description for the following role:\n"
        f"Role Title: {role_title}\n"
        f"Key Responsibilities:\n{key_responsibilities}\n\n"
        f"Make sure to align the tone, required skills, and startup stage characteristics with our company profile."
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

def screen_resume_service(pdf_bytes: bytes, job_description: str, context: StartupContext, db: Session) -> Candidate:
    """
    Screens an uploaded PDF resume, parses structural attributes via Gemini Structured Outputs,
    saves the Candidate record to the database, and returns it.
    """
    resume_text = extract_text_from_pdf(pdf_bytes)
    if not resume_text:
        raise ValueError("The uploaded PDF resume contains no readable text.")

    import os
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    client = genai.Client(api_key=api_key)
    system_instruction = build_system_instruction(HIRING_PERSONA, context)

    prompt = (
        f"Analyze the following resume against the job description. Extract the candidate's name and email, "
        f"compute a match score from 0 to 100, and write a thorough analysis report.\n\n"
        f"Job Description:\n{job_description}\n\n"
        f"Candidate Resume Text:\n{resume_text}"
    )

    response = call_gemini_with_retry(
        client=client,
        model="gemini-2.5-flash",
        contents=prompt,
        config=types.GenerateContentConfig(
            system_instruction=system_instruction,
            response_mime_type="application/json",
            response_schema=ResumeScreeningSchema,
            temperature=0.2
        )
    )

    # Handle response parsing safely
    try:
        if hasattr(response, 'parsed') and response.parsed:
            screening_result = response.parsed
        else:
            data = json.loads(response.text)
            screening_result = ResumeScreeningSchema(**data)
    except Exception as e:
        raise ValueError(f"Failed to parse Gemini structured response: {str(e)}. Raw: {response.text}")

    # Create and save Candidate record
    candidate = Candidate(
        name=screening_result.name,
        email=screening_result.email,
        resume_text=resume_text,
        match_score=screening_result.match_score,
        analysis_report=screening_result.analysis_summary
    )
    db.add(candidate)
    db.commit()
    db.refresh(candidate)
    return candidate
