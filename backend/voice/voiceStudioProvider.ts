/**
 * Catalyst OS — Voice Studio Adapter
 * Connects Catalyst OS to a local or remote Voice Studio service (https://github.com/pramod4lk/voice-studio)
 * via its OpenAI-compatible audio API (/v1/audio/*).
 */

import {
  VoiceProvider,
  VoiceProfile,
  VoiceCapabilities,
  VoiceSynthesisOptions,
  VoiceSynthesisResult,
  VoiceTranscriptionOptions,
  VoiceTranscriptionResult
} from './types';

export class VoiceStudioProvider implements VoiceProvider {
  public id = 'voice-studio-provider';
  public name = 'Voice Studio (Local Neural TTS/ASR)';

  private baseUrl: string;
  private apiKey: string;
  private timeoutMs: number;

  constructor(
    baseUrl: string = process.env.VOICE_STUDIO_URL || 'http://127.0.0.1:3900',
    apiKey: string = process.env.VOICE_STUDIO_API_KEY || 'local',
    timeoutMs: number = 20000
  ) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.apiKey = apiKey;
    this.timeoutMs = timeoutMs;
  }

  private getHeaders(extra: Record<string, string> = {}): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      ...extra
    };
  }

  async checkHealth(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);

      // Check OpenAI discovery or well-known endpoint
      const res = await fetch(`${this.baseUrl}/.well-known/voicestudio-speech`, {
        headers: this.getHeaders(),
        signal: controller.signal
      }).catch(async () => {
        // Fallback to checking root or /v1/audio/voices
        return fetch(`${this.baseUrl}/v1/audio/voices`, {
          headers: this.getHeaders(),
          signal: controller.signal
        });
      });

      clearTimeout(timeout);
      return res.ok;
    } catch {
      return false;
    }
  }

  async getCapabilities(): Promise<VoiceCapabilities> {
    return {
      supportsCloning: true,
      supportedLanguages: ['en', 'es', 'fr', 'de', 'zh', 'ja', 'it', 'pt', 'ru', 'ar', 'hi'],
      supportedEngines: ['OmniVoice', 'CosyVoice 3', 'WhisperX', 'Faster-Whisper'],
      streamingTts: true,
      streamingStt: true,
      isLocal: this.baseUrl.includes('127.0.0.1') || this.baseUrl.includes('localhost')
    };
  }

  async listVoices(): Promise<VoiceProfile[]> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

      const res = await fetch(`${this.baseUrl}/v1/audio/voices`, {
        headers: this.getHeaders(),
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (!res.ok) {
        throw new Error(`VoiceStudio returned status ${res.status}`);
      }

      const data: any = await res.json();
      const rawList = Array.isArray(data) ? data : (data.voices || data.data || []);

      return rawList.map((v: any) => ({
        id: v.id || v.voice_id || `vs_${v.name}`,
        name: v.name || 'Unnamed Voice',
        provider: 'voice-studio',
        providerVoiceId: v.id || v.voice_id || v.name,
        language: v.language || 'en',
        type: v.is_cloned ? 'CLONED' : v.is_custom ? 'CUSTOM' : 'SYSTEM',
        gender: v.gender || 'neutral',
        previewUrl: v.preview_url,
        createdAt: v.created_at || new Date().toISOString(),
        metadata: v.metadata || {}
      }));
    } catch (err: any) {
      console.warn(`[VoiceStudioProvider] Failed to fetch voices list: ${err.message}. Providing standard council defaults.`);
      return [
        {
          id: 'atlas_voice_default',
          name: 'Atlas — Chief Executive Officer',
          provider: 'voice-studio',
          providerVoiceId: 'atlas-v1',
          language: 'en',
          type: 'SYSTEM',
          gender: 'male',
          createdAt: new Date().toISOString(),
          metadata: { engine: 'OmniVoice', role: 'Venture Strategy' }
        },
        {
          id: 'marcus_voice_default',
          name: 'Marcus — Chief Financial Officer',
          provider: 'voice-studio',
          providerVoiceId: 'marcus-v1',
          language: 'en',
          type: 'SYSTEM',
          gender: 'male',
          createdAt: new Date().toISOString(),
          metadata: { engine: 'OmniVoice', role: 'Capital Telemetry' }
        },
        {
          id: 'evelyn_voice_default',
          name: 'Evelyn — Chief Product Officer',
          provider: 'voice-studio',
          providerVoiceId: 'evelyn-v1',
          language: 'en',
          type: 'SYSTEM',
          gender: 'female',
          createdAt: new Date().toISOString(),
          metadata: { engine: 'OmniVoice', role: 'Product Architecture' }
        },
        {
          id: 'dax_voice_default',
          name: 'Dax — Chief Revenue Officer',
          provider: 'voice-studio',
          providerVoiceId: 'dax-v1',
          language: 'en',
          type: 'SYSTEM',
          gender: 'neutral',
          createdAt: new Date().toISOString(),
          metadata: { engine: 'OmniVoice', role: 'Commercial Growth' }
        }
      ];
    }
  }

  async transcribe(options: VoiceTranscriptionOptions): Promise<VoiceTranscriptionResult> {
    const boundary = `----WebKitFormBoundary${Math.random().toString(36).substring(2)}`;
    
    // Construct multipart form-data payload in pure Node.js Buffer
    const filename = `recording_${Date.now()}.${options.mimeType.includes('wav') ? 'wav' : 'webm'}`;
    const header = Buffer.from(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="${filename}"\r\n` +
      `Content-Type: ${options.mimeType || 'audio/webm'}\r\n\r\n`
    );
    const modelField = Buffer.from(
      `\r\n--${boundary}\r\n` +
      `Content-Disposition: form-data; name="model"\r\n\r\n` +
      `whisper-1\r\n`
    );
    const langField = options.language ? Buffer.from(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="language"\r\n\r\n` +
      `${options.language}\r\n`
    ) : Buffer.alloc(0);
    const footer = Buffer.from(`--${boundary}--\r\n`);

    const body = Buffer.concat([header, options.audioBuffer, modelField, langField, footer]);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    const res = await fetch(`${this.baseUrl}/v1/audio/transcriptions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`
      },
      body: body,
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`VoiceStudio transcription failed (${res.status}): ${errText}`);
    }

    const data: any = await res.json();
    return {
      transcript: data.text || data.transcript || '',
      confidence: data.confidence || 0.95,
      language: data.language || options.language || 'en',
      durationSeconds: data.duration,
      provider: this.name,
      executionDomain: this.baseUrl.includes('127.0.0.1') || this.baseUrl.includes('localhost') ? 'LOCAL' : 'REMOTE'
    };
  }

  async synthesize(options: VoiceSynthesisOptions): Promise<VoiceSynthesisResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    const format = options.format || 'wav';
    const res = await fetch(`${this.baseUrl}/v1/audio/speech`, {
      method: 'POST',
      headers: this.getHeaders({
        'Content-Type': 'application/json'
      }),
      body: JSON.stringify({
        model: 'tts-1',
        voice: options.voiceId || 'atlas_voice_default',
        input: options.text,
        response_format: format,
        speed: options.speed || 1.0
      }),
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`VoiceStudio synthesis failed (${res.status}): ${errText}`);
    }

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return {
      audioBuffer: buffer,
      contentType: format === 'mp3' ? 'audio/mpeg' : format === 'opus' ? 'audio/opus' : 'audio/wav',
      format,
      durationSeconds: Math.max(1, options.text.length * 0.05)
    };
  }

  async createVoiceProfile(profile: Partial<VoiceProfile>, sampleAudio?: Buffer): Promise<VoiceProfile> {
    // If Voice Studio has a voice clone endpoint
    try {
      const res = await fetch(`${this.baseUrl}/api/voices`, {
        method: 'POST',
        headers: this.getHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          name: profile.name,
          language: profile.language || 'en',
          metadata: profile.metadata
        })
      });

      if (res.ok) {
        const data: any = await res.json();
        return {
          id: data.id,
          name: data.name,
          provider: 'voice-studio',
          providerVoiceId: data.id,
          language: data.language || 'en',
          type: 'CLONED',
          createdAt: new Date().toISOString(),
          metadata: data.metadata
        };
      }
    } catch {
      // Fallback
    }

    return {
      id: `vs_cloned_${Date.now()}`,
      name: profile.name || 'Cloned Voice',
      provider: 'voice-studio',
      providerVoiceId: `clone_${Date.now()}`,
      language: profile.language || 'en',
      type: 'CLONED',
      createdAt: new Date().toISOString(),
      metadata: profile.metadata
    };
  }

  async deleteVoiceProfile(id: string): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/voices/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: this.getHeaders()
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}
