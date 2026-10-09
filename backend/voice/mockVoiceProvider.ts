/**
 * Catalyst OS — Mock Voice Provider
 * Used for automated testing, development without GPU, and offline fallback.
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

// Helper to generate a minimal valid 1-second 8kHz mono WAV header + sine tone
function generateMockWavBuffer(text: string): Buffer {
  const sampleRate = 8000;
  const numChannels = 1;
  const bytesPerSample = 2;
  const durationSec = Math.max(0.5, Math.min(3, text.length * 0.05));
  const numSamples = Math.floor(sampleRate * durationSec);
  const dataSize = numSamples * numChannels * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF identifier
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // fmt subchunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  buffer.writeUInt16LE(1, 20);  // AudioFormat (1 for PCM)
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * numChannels * bytesPerSample, 28); // ByteRate
  buffer.writeUInt16LE(numChannels * bytesPerSample, 32); // BlockAlign
  buffer.writeUInt16LE(16, 34); // BitsPerSample

  // data subchunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  // Generate subtle pleasant 440Hz beep samples
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const sample = Math.sin(2 * Math.PI * 440 * t) * 8000;
    buffer.writeInt16LE(Math.floor(sample), 44 + i * 2);
  }

  return buffer;
}

export class MockVoiceProvider implements VoiceProvider {
  public id = 'mock-voice-provider';
  public name = 'Catalyst Mock Voice Engine (Dev/Fallback)';

  private profiles: VoiceProfile[] = [
    {
      id: 'voice_atlas_mock',
      name: 'Atlas (CEO Strategic Voice)',
      provider: 'mock',
      providerVoiceId: 'atlas-default',
      language: 'en',
      type: 'SYSTEM',
      gender: 'male',
      createdAt: new Date().toISOString(),
      metadata: { description: 'Authoritative, calm, venture strategy tone' }
    },
    {
      id: 'voice_marcus_mock',
      name: 'Marcus (CFO Financial Voice)',
      provider: 'mock',
      providerVoiceId: 'marcus-default',
      language: 'en',
      type: 'SYSTEM',
      gender: 'male',
      createdAt: new Date().toISOString(),
      metadata: { description: 'Precise, analytical, financial telemetry tone' }
    },
    {
      id: 'voice_evelyn_mock',
      name: 'Evelyn (CPO Engineering Voice)',
      provider: 'mock',
      providerVoiceId: 'evelyn-default',
      language: 'en',
      type: 'SYSTEM',
      gender: 'female',
      createdAt: new Date().toISOString(),
      metadata: { description: 'Crisp, articulate, technical product delivery tone' }
    },
    {
      id: 'voice_dax_mock',
      name: 'Dax (CRO Commercial Voice)',
      provider: 'mock',
      providerVoiceId: 'dax-default',
      language: 'en',
      type: 'SYSTEM',
      gender: 'neutral',
      createdAt: new Date().toISOString(),
      metadata: { description: 'Energetic, confident, growth marketing tone' }
    }
  ];

  async checkHealth(): Promise<boolean> {
    return true; // Always healthy
  }

  async getCapabilities(): Promise<VoiceCapabilities> {
    return {
      supportsCloning: true,
      supportedLanguages: ['en', 'es', 'fr', 'de', 'zh', 'ja'],
      supportedEngines: ['mock-tts', 'browser-web-speech'],
      streamingTts: false,
      streamingStt: false,
      isLocal: true
    };
  }

  async listVoices(): Promise<VoiceProfile[]> {
    return [...this.profiles];
  }

  async transcribe(options: VoiceTranscriptionOptions): Promise<VoiceTranscriptionResult> {
    // If empty audio provided
    if (!options.audioBuffer || options.audioBuffer.length === 0) {
      throw new Error('Microphone audio buffer is empty.');
    }

    return {
      transcript: 'What is our current startup runway and burn rate horizon?',
      confidence: 0.98,
      language: options.language || 'en',
      durationSeconds: 2.1,
      provider: this.name,
      executionDomain: 'MOCK'
    };
  }

  async synthesize(options: VoiceSynthesisOptions): Promise<VoiceSynthesisResult> {
    const text = options.text || 'Catalyst OS Voice Synthesis Active.';
    const buffer = generateMockWavBuffer(text);

    return {
      audioBuffer: buffer,
      contentType: 'audio/wav',
      format: 'wav',
      durationSeconds: Math.max(1, text.length * 0.05)
    };
  }

  async createVoiceProfile(profile: Partial<VoiceProfile>): Promise<VoiceProfile> {
    const newProfile: VoiceProfile = {
      id: `voice_custom_${Date.now()}`,
      name: profile.name || 'Custom Voice Clone',
      provider: 'mock',
      providerVoiceId: `custom_${Date.now()}`,
      language: profile.language || 'en',
      type: profile.type || 'CUSTOM',
      gender: profile.gender || 'neutral',
      createdAt: new Date().toISOString(),
      metadata: profile.metadata || {}
    };

    this.profiles.push(newProfile);
    return newProfile;
  }

  async deleteVoiceProfile(id: string): Promise<boolean> {
    const idx = this.profiles.findIndex(p => p.id === id);
    if (idx !== -1) {
      this.profiles.splice(idx, 1);
      return true;
    }
    return false;
  }
}
