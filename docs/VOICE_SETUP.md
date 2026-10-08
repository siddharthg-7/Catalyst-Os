# Catalyst OS — Voice Studio Setup Guide

## 1. Quick Start (Mock / Browser Mode)

Catalyst OS works out-of-the-box with **zero external installation required**.
When no local Voice Studio engine is running, Catalyst OS seamlessly uses:
1. **MockVoiceProvider** for development, automated tests, and headless environments.
2. **Browser Web Speech API** (`webkitSpeechRecognition` & `window.speechSynthesis`) for client-side voice transcription and speech generation.

---

## 2. Local Voice Studio Setup (Optional High-Fidelity Engine)

To enable high-fidelity local neural TTS (OmniVoice, CosyVoice) and GPU-accelerated STT (WhisperX):

### Option A: Running Voice Studio from Source
1. Clone the Voice Studio repository:
   ```bash
   git clone https://github.com/pramod4lk/voice-studio.git
   cd voice-studio
   ```
2. Install dependencies:
   ```bash
   bun install
   uv sync
   ```
3. Start the backend on port 3900:
   ```bash
   uv run python backend/main.py --host 127.0.0.1 --port 3900
   ```

### Option B: Running Voice Studio via Docker
```bash
docker run -d \
  --name voicestudio \
  --gpus all \
  -p 3900:3900 \
  -v voicestudio_data:/app/omnivoice_data \
  ghcr.io/debpalash/voicestudio:latest
```

---

## 3. Catalyst OS Environment Variables

In your Catalyst `.env` file:

```env
# Enable Catalyst Voice capabilities
VOICE_ENABLED=true

# Enable Voice Studio integration
VOICE_STUDIO_ENABLED=true

# URL of local or remote Voice Studio service
VOICE_STUDIO_URL=http://127.0.0.1:3900

# Optional API key for remote Voice Studio instances
VOICE_STUDIO_API_KEY=local
```

---

## 4. Verification & Health Check

Visit `http://localhost:3000/api/voice/status` in your browser.
Expected output:
```json
{
  "voiceEnabled": true,
  "provider": "voice-studio",
  "connected": true,
  "engine": "VoiceStudio (OmniVoice + WhisperX)",
  "local": true
}
```
If Voice Studio is not running, it automatically returns:
```json
{
  "voiceEnabled": true,
  "provider": "mock-fallback",
  "connected": false,
  "engine": "Browser Web Speech Fallback",
  "local": true
}
```
