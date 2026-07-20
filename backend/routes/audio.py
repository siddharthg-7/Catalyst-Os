import os
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Request
import logging
import httpx
from slowapi import Limiter
from slowapi.util import get_remote_address

logger = logging.getLogger("audio_router")
router = APIRouter(prefix="/api/audio", tags=["audio"])
limiter = Limiter(key_func=get_remote_address)

@router.post("/transcribe")
@limiter.limit("5/minute")
async def transcribe_audio(request: Request, file: UploadFile = File(...), language: str = Form("en")):
    try:
        from backend.config import settings
        
        deepgram_api_key = settings.DEEPGRAM_API_KEY
        if not deepgram_api_key:
            raise HTTPException(status_code=500, detail="DEEPGRAM_API_KEY is missing from environment")

        audio_data = await file.read()
        
        headers = {
            "Authorization": f"Token {deepgram_api_key}",
            "Content-Type": file.content_type or "audio/webm",
        }
        
        params = {
            "model": "nova-2",
            "language": language,
            "smart_format": "true"
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                "https://api.deepgram.com/v1/listen",
                headers=headers,
                params=params,
                content=audio_data
            )
            
            if response.status_code != 200:
                logger.error(f"Deepgram API Error: {response.text}")
                raise HTTPException(status_code=500, detail="Transcription failed with Deepgram API")
                
            data = response.json()
            logger.info(f"Deepgram raw response: {data}")
            
        # Parse transcript from Deepgram response
        transcript = data.get("results", {}).get("channels", [{}])[0].get("alternatives", [{}])[0].get("transcript", "")
        
        if not transcript:
            logger.warning("Deepgram returned an empty transcript. Was speech detected?")
            
        return {"text": transcript}
    except Exception as e:
        logger.error(f"Error during audio transcription: {e}")
        raise HTTPException(status_code=500, detail=str(e))
