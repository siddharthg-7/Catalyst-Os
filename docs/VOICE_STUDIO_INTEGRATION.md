# Catalyst OS — Voice Studio Integration Plan

## Executive Overview
Catalyst OS transforms into a conversational AI operating system for startup founders by integrating an open-source Voice Studio service layer. Rather than coupling Catalyst directly to heavy GPU binaries, Catalyst communicates with Voice Studio via an isolated, provider-abstracted service boundary.

---

## Architecture Flow

```
+-------------------------------------------------------------+
|                      USER MICROPHONE                        |
+-------------------------------------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|               CATALYST SPEECH-TO-TEXT (STT)                 |
|       POST /api/voice/transcribe (WhisperX / Faster-Whisper)|
+-------------------------------------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|                  CATALYST INPUT PIPELINE                    |
|       { inputType: "voice", transcript: "...", source: "mic" }|
+-------------------------------------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|           CATALYST MULTI-AGENT ORCHESTRATOR                 |
|     (Sophia Vance CEO, Marcus CFO, Evelyn CPO, Dax CRO)     |
+-------------------------------------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|               DETERMINISTIC AGENT RESPONSE                  |
+-------------------------------------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|                TEXT-TO-SPEECH ADAPTER (TTS)                 |
|       POST /api/voice/synthesize (OmniVoice / CosyVoice)    |
+-------------------------------------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|                       AUDIO PLAYBACK                        |
|       (Browser AudioContext / Interruption / Barge-in)      |
+-------------------------------------------------------------+
```

---

## Core Guiding Principles

1. **Non-Invasive Architecture**: Voice is an interaction modality. It does **not** bypass Catalyst's multi-agent deliberation, financial calculations, RAG vector grounding, or human-in-the-loop approval gates.
2. **Provider Abstraction**: A standardized `VoiceProvider` interface decouples Catalyst from any single engine.
3. **Graceful Degradation**: If Voice Studio is offline or unavailable, Catalyst operates seamlessly in text mode and falls back to browser-native Web Speech synthesis/recognition.
4. **Data Privacy First**: Audio streams are tagged with processing domain indicators (`LOCAL`, `REMOTE`, `PROCESSING`). Raw audio is never persisted without user consent.
5. **License Isolation**: Voice Studio's AGPL-3.0 codebase remains completely outside Catalyst OS repositories, communicating strictly over standard network protocols (`localhost:3900`).
