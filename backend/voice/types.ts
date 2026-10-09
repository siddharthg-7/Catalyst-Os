/**
 * Catalyst OS — Voice Provider Abstraction Types
 * Decouples Catalyst from specific speech engines (Voice Studio, OpenAI, ElevenLabs, Mock)
 */

export type VoiceProfileType = 'SYSTEM' | 'CUSTOM' | 'CLONED';

export interface VoiceProfile {
  id: string;
  name: string;
  provider: string;
  providerVoiceId: string;
  language: string;
  type: VoiceProfileType;
  gender?: 'male' | 'female' | 'neutral';
  previewUrl?: string;
  createdAt: string;
  metadata?: Record<string, any>;
}

export interface VoiceSynthesisOptions {
  text: string;
  voiceId?: string;
  format?: 'wav' | 'mp3' | 'opus';
  speed?: number; // 0.5 to 2.0
  pitch?: number; // -10 to +10
  language?: string;
}

export interface VoiceSynthesisResult {
  audioBuffer: Buffer;
  contentType: string;
  format: string;
  durationSeconds?: number;
}

export interface VoiceTranscriptionOptions {
  audioBuffer: Buffer;
  mimeType: string;
  language?: string;
  prompt?: string;
}

export interface VoiceTranscriptionResult {
  transcript: string;
  confidence?: number;
  language?: string;
  durationSeconds?: number;
  provider: string;
  executionDomain: 'LOCAL' | 'REMOTE' | 'MOCK';
}

export interface VoiceCapabilities {
  supportsCloning: boolean;
  supportedLanguages: string[];
  supportedEngines: string[];
  streamingTts: boolean;
  streamingStt: boolean;
  isLocal: boolean;
}

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

export interface VoiceStatus {
  voiceEnabled: boolean;
  provider: string;
  connected: boolean;
  engine: string;
  local: boolean;
  capabilities: VoiceCapabilities;
  activeVoicesCount: number;
}
