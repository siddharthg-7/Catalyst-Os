/**
 * Catalyst OS — Voice Manager (Singleton Adapter)
 * Coordinates Voice Providers, performs health discovery, handles graceful fallbacks,
 * persists custom voice profiles, and enforces privacy standards.
 */

import {
  VoiceProvider,
  VoiceProfile,
  VoiceCapabilities,
  VoiceSynthesisOptions,
  VoiceSynthesisResult,
  VoiceTranscriptionOptions,
  VoiceTranscriptionResult,
  VoiceStatus
} from './types';
import { MockVoiceProvider } from './mockVoiceProvider';
import { VoiceStudioProvider } from './voiceStudioProvider';

export class VoiceManager {
  private static instance: VoiceManager;
  private voiceStudioProvider: VoiceStudioProvider;
  private mockProvider: MockVoiceProvider;
  private activeProvider: VoiceProvider;
  private customProfiles: VoiceProfile[] = [];
  private lastHealthCheck: number = 0;
  private isVoiceStudioHealthy: boolean = false;

  private constructor() {
    this.voiceStudioProvider = new VoiceStudioProvider();
    this.mockProvider = new MockVoiceProvider();
    this.activeProvider = this.mockProvider;

    // Check health asynchronously on boot
    this.refreshHealth().catch(() => {});
  }

  public static getInstance(): VoiceManager {
    if (!VoiceManager.instance) {
      VoiceManager.instance = new VoiceManager();
    }
    return VoiceManager.instance;
  }

  public async refreshHealth(): Promise<boolean> {
    const isExplicitlyDisabled = process.env.VOICE_STUDIO_ENABLED === 'false';
    if (isExplicitlyDisabled) {
      this.activeProvider = this.mockProvider;
      this.isVoiceStudioHealthy = false;
      return false;
    }

    try {
      const isHealthy = await this.voiceStudioProvider.checkHealth();
      this.isVoiceStudioHealthy = isHealthy;
      this.lastHealthCheck = Date.now();

      if (isHealthy) {
        this.activeProvider = this.voiceStudioProvider;
      } else {
        this.activeProvider = this.mockProvider;
      }
      return isHealthy;
    } catch {
      this.isVoiceStudioHealthy = false;
      this.activeProvider = this.mockProvider;
      return false;
    }
  }

  public async getStatus(): Promise<VoiceStatus> {
    const now = Date.now();
    // Cache health check for 10 seconds to avoid flooding
    if (now - this.lastHealthCheck > 10000) {
      await this.refreshHealth();
    }

    const capabilities = await this.activeProvider.getCapabilities();
    const voices = await this.listVoices();

    return {
      voiceEnabled: process.env.VOICE_ENABLED !== 'false',
      provider: this.activeProvider.id,
      connected: this.isVoiceStudioHealthy,
      engine: this.isVoiceStudioHealthy
        ? 'Voice Studio (Local Neural OmniVoice/WhisperX)'
        : 'Catalyst Native Mock / Browser Fallback',
      local: capabilities.isLocal,
      capabilities,
      activeVoicesCount: voices.length
    };
  }

  public async listVoices(): Promise<VoiceProfile[]> {
    try {
      const providerVoices = await this.activeProvider.listVoices();
      // Combine with local custom profiles
      const combined = [...providerVoices];
      for (const custom of this.customProfiles) {
        if (!combined.some(v => v.id === custom.id)) {
          combined.push(custom);
        }
      }
      return combined;
    } catch (err: any) {
      console.warn(`[VoiceManager] listVoices error: ${err.message}. Returning fallback voices.`);
      return this.mockProvider.listVoices();
    }
  }

  public async transcribe(options: VoiceTranscriptionOptions): Promise<VoiceTranscriptionResult> {
    console.log(JSON.stringify({
      event: 'voice_request_started',
      action: 'transcription',
      timestamp: new Date().toISOString(),
      audioSize: options.audioBuffer?.length || 0,
      mimeType: options.mimeType
    }));

    try {
      const result = await this.activeProvider.transcribe(options);
      console.log(JSON.stringify({
        event: 'transcription_completed',
        timestamp: new Date().toISOString(),
        provider: result.provider,
        domain: result.executionDomain,
        duration: result.durationSeconds
      }));
      return result;
    } catch (primaryErr: any) {
      console.warn(`[VoiceManager] Primary provider failed: ${primaryErr.message}. Retrying via fallback.`);
      try {
        const fallbackResult = await this.mockProvider.transcribe(options);
        console.log(JSON.stringify({
          event: 'transcription_completed',
          timestamp: new Date().toISOString(),
          provider: 'mock-fallback',
          domain: 'MOCK'
        }));
        return fallbackResult;
      } catch (fallbackErr: any) {
        console.error(JSON.stringify({
          event: 'voice_request_failed',
          action: 'transcription',
          timestamp: new Date().toISOString(),
          error: fallbackErr.message
        }));
        throw fallbackErr;
      }
    }
  }

  public async synthesize(options: VoiceSynthesisOptions): Promise<VoiceSynthesisResult> {
    console.log(JSON.stringify({
      event: 'voice_request_started',
      action: 'synthesis',
      timestamp: new Date().toISOString(),
      textLength: options.text?.length || 0,
      voiceId: options.voiceId,
      format: options.format || 'wav'
    }));

    try {
      const result = await this.activeProvider.synthesize(options);
      console.log(JSON.stringify({
        event: 'tts_completed',
        timestamp: new Date().toISOString(),
        audioSize: result.audioBuffer.length,
        format: result.format
      }));
      return result;
    } catch (primaryErr: any) {
      console.warn(`[VoiceManager] Primary synthesis failed: ${primaryErr.message}. Retrying via fallback mock.`);
      try {
        const fallbackResult = await this.mockProvider.synthesize(options);
        console.log(JSON.stringify({
          event: 'tts_completed',
          timestamp: new Date().toISOString(),
          audioSize: fallbackResult.audioBuffer.length,
          provider: 'mock-fallback'
        }));
        return fallbackResult;
      } catch (fallbackErr: any) {
        console.error(JSON.stringify({
          event: 'voice_request_failed',
          action: 'synthesis',
          timestamp: new Date().toISOString(),
          error: fallbackErr.message
        }));
        throw fallbackErr;
      }
    }
  }

  public async createVoiceProfile(profile: Partial<VoiceProfile>, sampleAudio?: Buffer): Promise<VoiceProfile> {
    const created = await this.activeProvider.createVoiceProfile(profile, sampleAudio);
    this.customProfiles.push(created);
    return created;
  }

  public async deleteVoiceProfile(id: string): Promise<boolean> {
    const success = await this.activeProvider.deleteVoiceProfile(id);
    this.customProfiles = this.customProfiles.filter(p => p.id !== id);
    return success;
  }
}

export const voiceManager = VoiceManager.getInstance();
