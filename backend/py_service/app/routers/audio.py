import os
import re
import logging
import httpx
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Request, Response
from app.config import settings

logger = logging.getLogger("audio_router")
router = APIRouter(prefix="/api/audio", tags=["audio"])

@router.post("/transcribe")
async def transcribe_audio(request: Request, file: UploadFile = File(...), language: str = Form("en")):
    try:
        deepgram_api_key = getattr(settings, "deepgram_api_key", "") or os.getenv("DEEPGRAM_API_KEY", "")
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
            
        transcript = data.get("results", {}).get("channels", [{}])[0].get("alternatives", [{}])[0].get("transcript", "")
        if not transcript:
            logger.warning("Deepgram returned an empty transcript. Was speech detected?")
            
        return {"text": transcript}
    except Exception as e:
        logger.error(f"Error during audio transcription: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/speak")
async def speak_text(request: Request):
    try:
        body = await request.json()
        text = body.get("text", "")
        if not text or not text.strip():
            raise HTTPException(status_code=400, detail="Missing required text parameter")
            
        deepgram_api_key = getattr(settings, "deepgram_api_key", "") or os.getenv("DEEPGRAM_API_KEY", "")
        if not deepgram_api_key:
            raise HTTPException(status_code=500, detail="DEEPGRAM_API_KEY is missing from environment")

        clean_text = re.sub(r'\[\d+\]', '', text)
        clean_text = re.sub(r'#+|\*+|`{1,3}|\[([^\]]+)\]\([^)]+\)', r'\1', clean_text)
        clean_text = re.sub(r'\s+', ' ', clean_text).strip()

        if len(clean_text) > 400:
            truncated = clean_text[:400]
            last_period = max(truncated.rfind('.'), truncated.rfind('!'), truncated.rfind('?'))
            if last_period > 100:
                clean_text = truncated[:last_period + 1]
            else:
                clean_text = truncated + '...'

        logger.info(f"TTS Request received: {clean_text}")

        headers = {
            "Authorization": f"Token {deepgram_api_key}",
            "Content-Type": "application/json",
        }
        
        params = {
            "model": "aura-asteria-en",
            "encoding": "mp3"
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
                raise HTTPException(status_code=response.status_code, detail=f"Deepgram TTS failed: {response.text}")
                
            logger.info(f"Deepgram response headers: {response.headers}")
            logger.info(f"Deepgram content sample: {response.content[:20]}")
            logger.info(f"Returning {len(response.content)} bytes of audio")

            return Response(
                content=response.content,
                media_type="audio/mpeg",
                headers={
                    "Content-Disposition": "inline; filename=speech.mp3",
                    "Cache-Control": "no-cache",
                }
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("TTS Error")
        raise HTTPException(status_code=500, detail="Internal TTS error")
