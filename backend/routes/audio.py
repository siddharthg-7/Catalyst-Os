import os
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Request
import logging
from deepgram import DeepgramClient, PrerecordedOptions
from slowapi import Limiter
from slowapi.util import get_remote_address

logger = logging.getLogger("audio_router")
router = APIRouter(prefix="/api/audio", tags=["audio"])
limiter = Limiter(key_func=get_remote_address)

@router.post("/transcribe")
@limiter.limit("5/minute")
async def transcribe_audio(request: Request, file: UploadFile = File(...), language: str = Form("en")):
    """
    Receives audio from the frontend and transcribes it using Deepgram STT.
    Rate limited to 5 requests per minute to prevent abuse.
    """
    try:
        deepgram_api_key = os.environ.get("DEEPGRAM_API_KEY")
        if not deepgram_api_key:
            raise HTTPException(status_code=500, detail="DEEPGRAM_API_KEY not configured.")
        
        deepgram = DeepgramClient(api_key=deepgram_api_key)
        
        content_bytes = await file.read()
        
        payload = {
            "buffer": content_bytes,
        }
        
        options = PrerecordedOptions(
            model="nova-2",
            language=language,
            smart_format=True,
        )
        
        response = deepgram.listen.prerecorded.v("1").transcribe_file(payload, options)
        
        transcript = response["results"]["channels"][0]["alternatives"][0]["transcript"]
        
        return {"text": transcript}

    except Exception as e:
        logger.error(f"Error processing Deepgram transcription: {e}")
        raise HTTPException(status_code=500, detail=str(e))
