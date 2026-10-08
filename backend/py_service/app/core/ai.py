import os
import logging
from typing import Optional
from google import genai

logger = logging.getLogger("ai")

_client_instance: Optional[genai.Client] = None
_logged_configuration: bool = False

def resolve_gemini_api_key() -> tuple[Optional[str], Optional[str]]:
    """
    Resolves the canonical Gemini API key with backward-compatible fallback.
    Returns (api_key, source_name).
    """
    gemini_key = os.getenv("GEMINI_API_KEY")
    google_key = os.getenv("GOOGLE_API_KEY")

    if gemini_key:
        return gemini_key, "GEMINI_API_KEY"
    elif google_key:
        return google_key, "GOOGLE_API_KEY"
    return None, None

def get_genai_client() -> Optional[genai.Client]:
    """
    Returns a singleton Google GenAI Client configured with the canonical API key.
    Harmonizes environment variables so the Google GenAI SDK does not emit redundant stderr warnings.
    """
    global _client_instance, _logged_configuration

    if _client_instance is not None:
        return _client_instance

    api_key, source = resolve_gemini_api_key()

    if not api_key:
        if not _logged_configuration:
            logger.warning(
                "Neither GEMINI_API_KEY nor GOOGLE_API_KEY is configured. "
                "AI agents will run with high-fidelity local heuristics."
            )
            _logged_configuration = True
        return None

    # Harmonize environment variables:
    # If both GOOGLE_API_KEY and GEMINI_API_KEY exist in os.environ, google.genai._api_client
    # logs 'Both GOOGLE_API_KEY and GEMINI_API_KEY are set. Using GOOGLE_API_KEY.'
    # We synchronize os.environ to use the canonical key cleanly.
    if source == "GEMINI_API_KEY" and "GOOGLE_API_KEY" in os.environ:
        os.environ.pop("GOOGLE_API_KEY", None)

    if not _logged_configuration:
        logger.info(f"Using Gemini API configuration from {source}.")
        _logged_configuration = True

    try:
        _client_instance = genai.Client(api_key=api_key)
        return _client_instance
    except Exception as e:
        logger.error(f"Failed to initialize Google GenAI Client: {str(e)}")
        return None
