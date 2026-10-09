# Catalyst OS — Voice Architecture & Data Flow

## 1. Sequence Diagram: Full Voice Interaction Cycle

```mermaid
sequenceDiagram
    autonumber
    actor Founder as Founder
    participant UI as Catalyst Voice UI (VoiceModeModal)
    participant API as Catalyst Voice API (/api/voice)
    participant VoiceMgr as VoiceManager Adapter
    participant VS as Voice Studio Engine (:3900)
    participant Orch as Catalyst Multi-Agent Orchestrator
    
    Founder->>UI: Speaks ("Model runway under 2 new engineering hires")
    UI->>UI: MediaRecorder captures audio chunk (audio/webm)
    UI->>API: POST /api/voice/transcribe (Audio Blob)
    API->>VoiceMgr: transcribe(audioBuffer, options)
    VoiceMgr->>VS: POST /v1/audio/transcriptions (multipart)
    VS-->>VoiceMgr: { text: "Model runway under 2 new engineering hires" }
    VoiceMgr-->>API: { transcript: "..." }
    API-->>UI: { transcript: "..." }
    
    UI->>Orch: sendMessage({ inputType: "voice", transcript: "...", source: "mic" })
    Orch->>Orch: Council Deliberation (CEO Atlas + CFO Marcus)
    Orch-->>UI: Streaming SSE Response Chunks
    
    UI->>API: POST /api/voice/synthesize ({ text: "At current burn, runway is 14.6 months...", voiceId })
    API->>VoiceMgr: synthesize({ text, voiceId, format: "wav" })
    VoiceMgr->>VS: POST /v1/audio/speech
    VS-->>VoiceMgr: Audio Buffer (audio/wav)
    VoiceMgr-->>API: Binary Audio Stream
    API-->>UI: Audio Response (Blob / Stream)
    UI->>Founder: Speaker Audio Playback
    
    opt Interruption / Barge-in
        Founder->>UI: Speaks while assistant is speaking
        UI->>UI: Stop current AudioContext playback immediately
        UI->>UI: Switch state to LISTENING
    end
```

---

## 2. Abstraction Interface Specification

```typescript
export interface VoiceProvider {
  id: string;
  name: string;
  
  transcribe(options: VoiceTranscriptionOptions): Promise<VoiceTranscriptionResult>;
  synthesize(options: VoiceSynthesisOptions): Promise<VoiceSynthesisResult>;
  listVoices(): Promise<VoiceProfile[]>;
  createVoiceProfile(profile: Partial<VoiceProfile>, sampleAudio?: Buffer): Promise<VoiceProfile>;
  deleteVoiceProfile(id: string): Promise<boolean>;
  getCapabilities(): Promise<VoiceCapabilities>;
  checkHealth(): Promise<boolean>;
}
```

---

## 3. Privacy & Processing Domains

Catalyst explicitly categorizes each voice transaction into one of three execution tiers:

1. **`LOCAL`**: Audio processed strictly on-device via local Voice Studio daemon or browser Web Speech. Audio never leaves the local network.
2. **`REMOTE`**: Explicitly opted-in cloud speech endpoints (e.g. cloud Whisper or external TTS API).
3. **`PROCESSING`**: Real-time transient memory state during active inference. Raw microphone buffers are purged immediately after transcription.
