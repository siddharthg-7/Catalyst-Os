/**
 * Catalyst OS — Voice API Routes
 * Endpoints for speech-to-text, text-to-speech, voice profiles, and service health.
 */

import { Router, Request, Response } from 'express';
import { voiceManager } from './manager';

const voiceRouter = Router();

// GET /api/voice/status — Check Voice Engine Status & Connection
voiceRouter.get('/status', async (req: Request, res: Response) => {
  try {
    const status = await voiceManager.getStatus();
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve voice service status', details: err.message });
  }
});

// GET /api/voice/voices — List Available Voice Profiles
voiceRouter.get('/voices', async (req: Request, res: Response) => {
  try {
    const voices = await voiceManager.listVoices();
    res.json({ voices, count: voices.length });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch voices', details: err.message });
  }
});

// POST /api/voice/transcribe — Speech-to-Text
// Supports JSON with audioBase64 or raw audio buffer
voiceRouter.post('/transcribe', async (req: Request, res: Response) => {
  try {
    let audioBuffer: Buffer;
    let mimeType = 'audio/webm';
    let language = 'en';

    if (req.body && req.body.audioBase64) {
      const base64Data = req.body.audioBase64.replace(/^data:audio\/\w+;base64,/, '');
      audioBuffer = Buffer.from(base64Data, 'base64');
      mimeType = req.body.mimeType || 'audio/webm';
      language = req.body.language || 'en';
    } else if (Buffer.isBuffer(req.body)) {
      audioBuffer = req.body;
      mimeType = req.headers['content-type'] || 'audio/webm';
    } else {
      return res.status(400).json({
        error: 'Missing audio payload. Provide audioBase64 in JSON or raw audio buffer in request body.'
      });
    }

    if (!audioBuffer || audioBuffer.length === 0) {
      return res.status(400).json({ error: 'Audio buffer is empty.' });
    }

    const result = await voiceManager.transcribe({
      audioBuffer,
      mimeType,
      language
    });

    res.json({
      text: result.transcript,
      transcript: result.transcript,
      confidence: result.confidence,
      language: result.language,
      provider: result.provider,
      executionDomain: result.executionDomain,
      duration: result.durationSeconds
    });
  } catch (err: any) {
    console.error('[VoiceRouter] /transcribe error:', err);
    res.status(500).json({ error: 'Transcription failed', details: err.message });
  }
});

// POST /api/voice/synthesize & /api/voice/speech — Text-to-Speech
const handleSynthesis = async (req: Request, res: Response) => {
  try {
    const { text, input, voiceId, voice, format = 'wav', speed = 1.0 } = req.body || {};
    const textToSpeak = text || input;

    if (!textToSpeak || typeof textToSpeak !== 'string' || !textToSpeak.trim()) {
      return res.status(400).json({ error: 'Field "text" is required for voice synthesis.' });
    }

    const result = await voiceManager.synthesize({
      text: textToSpeak.trim(),
      voiceId: voiceId || voice,
      format: format === 'mp3' ? 'mp3' : format === 'opus' ? 'opus' : 'wav',
      speed: Number(speed) || 1.0
    });

    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Length', result.audioBuffer.length);
    res.setHeader('X-Voice-Format', result.format);
    res.send(result.audioBuffer);
  } catch (err: any) {
    console.error('[VoiceRouter] /synthesize error:', err);
    res.status(500).json({ error: 'Synthesis failed', details: err.message });
  }
};

voiceRouter.post('/synthesize', handleSynthesis);
voiceRouter.post('/speech', handleSynthesis);

// POST /api/voice/voices — Create Custom / Cloned Voice Profile
voiceRouter.post('/voices', async (req: Request, res: Response) => {
  try {
    const { name, language = 'en', sampleAudioBase64, metadata = {} } = req.body || {};

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Voice name is required.' });
    }

    let sampleBuffer: Buffer | undefined;
    if (sampleAudioBase64) {
      const base64Data = sampleAudioBase64.replace(/^data:audio\/\w+;base64,/, '');
      sampleBuffer = Buffer.from(base64Data, 'base64');
    }

    const created = await voiceManager.createVoiceProfile({
      name: name.trim(),
      language,
      metadata
    }, sampleBuffer);

    res.status(201).json(created);
  } catch (err: any) {
    console.error('[VoiceRouter] POST /voices error:', err);
    res.status(500).json({ error: 'Failed to create voice profile', details: err.message });
  }
});

// DELETE /api/voice/voices/:id — Delete Voice Profile
voiceRouter.delete('/voices/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const success = await voiceManager.deleteVoiceProfile(id);
    if (!success) {
      return res.status(404).json({ error: `Voice profile ${id} not found.` });
    }
    res.json({ success: true, deletedId: id });
  } catch (err: any) {
    console.error('[VoiceRouter] DELETE /voices/:id error:', err);
    res.status(500).json({ error: 'Failed to delete voice profile', details: err.message });
  }
});

export default voiceRouter;
