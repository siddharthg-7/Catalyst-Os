from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Request, Response
import logging
import httpx
import re
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

@router.post("/speak")
@limiter.limit("20/minute")
async def speak_text(request: Request):
    try:
        from backend.config import settings
        body = await request.json()
        text = body.get("text", "")
        if not text or not text.strip():
            raise HTTPException(status_code=400, detail="Missing required text parameter")
            
        deepgram_api_key = settings.DEEPGRAM_API_KEY
        if not deepgram_api_key:
            raise HTTPException(status_code=500, detail="DEEPGRAM_API_KEY is missing from environment")

        # Clean markdown formatting for natural TTS audio synthesis
        clean_text = re.sub(r'#+|\*+|`{1,3}|\[([^\]]+)\]\([^)]+\)', r'\1', text)
        clean_text = re.sub(r'\s+', ' ', clean_text).strip()

        headers = {
            "Authorization": f"Token {deepgram_api_key}",
            "Content-Type": "application/json",
        }
        
        params = {
            "model": "aura-asteria-en"
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                "https://api.deepgram.com/v1/speak",
                headers=headers,
                params=params,
                json={"text": clean_text}
            )
            
            if response.status_code != 200:
                logger.error(f"Deepgram TTS API Error ({response.status_code}): {response.text}")
                raise HTTPException(status_code=500, detail=f"TTS generation failed: {response.text}")
                
            logger.info(f"Deepgram TTS successfully generated audio stream ({len(response.content)} bytes)")
            return Response(content=response.content, media_type="audio/mpeg")
    except Exception as e:
        logger.error(f"Error during TTS generation: {e}")
        raise HTTPException(status_code=500, detail=str(e))

