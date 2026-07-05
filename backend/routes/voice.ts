import { Router, Request, Response } from 'express';
import { STTService } from '../services/sttService';
import { TTSService } from '../services/ttsService';

const router = Router();
const sttService = new STTService();
const ttsService = new TTSService();

// POST /api/voice/transcribe
// Input: JSON { fileData: "base64...", mimeType: "audio/webm" } OR raw binary buffer
router.post('/transcribe', async (req: Request, res: Response) => {
  try {
    let audioBuffer: Buffer;
    let mimeType = 'audio/webm';

    if (Buffer.isBuffer(req.body)) {
      // Direct binary body upload
      audioBuffer = req.body;
      mimeType = req.headers['content-type'] || 'audio/webm';
    } else if (req.body && req.body.fileData) {
      // Base64 JSON payload
      audioBuffer = Buffer.from(req.body.fileData, 'base64');
      mimeType = req.body.mimeType || 'audio/webm';
    } else {
      res.status(400).json({ error: 'Request body must be a raw binary audio stream or a JSON object containing base64 fileData.' });
      return;
    }

    if (audioBuffer.length === 0) {
      res.status(400).json({ error: 'Uploaded audio data is empty.' });
      return;
    }

    const transcribedText = await sttService.transcribe(audioBuffer, mimeType);
    res.json({ text: transcribedText });
  } catch (error: any) {
    console.error('[Voice API] Transcription route error:', error);
    res.status(500).json({ error: error.message || 'Failed to transcribe audio' });
  }
});

// POST /api/voice/speak
// Input: JSON { text: "hello founder" }
router.post('/speak', async (req: Request, res: Response) => {
  try {
    const { text } = req.body;
    if (!text || text.trim().length === 0) {
      res.status(400).json({ error: 'Missing required text parameter.' });
      return;
    }

    const audioUrl = await ttsService.speak(text);
    res.json({ audioUrl });
  } catch (error: any) {
    console.error('[Voice API] Speech synthesis route error:', error);
    res.status(500).json({ error: error.message || 'Failed to synthesize speech' });
  }
});

export default router;
