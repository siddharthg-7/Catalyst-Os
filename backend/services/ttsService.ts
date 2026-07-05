import { execFile } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export class TTSService {
  private tempDir: string;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.tempDir = path.join(process.cwd(), 'temp_audio');
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }

    // Start periodic background cleanup of old files every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldFiles().catch(err => {
        console.error('[TTSService] Background cleanup error:', err);
      });
    }, 5 * 60 * 1000);
  }

  /**
   * Generates a TTS audio file from text.
   * Returns the public URL to retrieve the audio file.
   */
  async speak(text: string): Promise<string> {
    const filename = `speak_${Date.now()}_${Math.random().toString(36).substr(2, 5)}.wav`;
    const outputPath = path.join(this.tempDir, filename);

    try {
      // 1. Try local Piper execution via python speak script
      await this.runPiperScript(text, outputPath);
      console.log(`[TTSService] Generated voice audio successfully: ${filename}`);
      return `/temp_audio/${filename}`;
    } catch (err: any) {
      console.warn('[TTSService] Local Piper text-to-speech failed or was unconfigured. Generating fallback audio.', err.message || err);
      
      // 2. Generate minimal valid silent/default WAV file so browser player works cleanly
      const silentBuffer = this.generateSilentWav();
      await fs.promises.writeFile(outputPath, silentBuffer);
      return `/temp_audio/${filename}`;
    }
  }

  /**
   * Spawns the python bridge to call Piper.
   */
  private runPiperScript(text: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      let pythonPath = process.env.PYTHON_PATH || 'python';
      
      // Auto-detect backend/.venv on Windows if default python is used
      if (pythonPath === 'python' && process.platform === 'win32') {
        const venvPython = path.join(process.cwd(), 'backend', '.venv', 'Scripts', 'python.exe');
        if (fs.existsSync(venvPython)) {
          pythonPath = venvPython;
        }
      }

      const scriptPath = path.join(process.cwd(), 'backend', 'services', 'voice', 'speak.py');
      const modelPath = process.env.PIPER_MODEL || 'backend/tools/piper/en_US-amy-medium.onnx';

      console.log(`[TTSService] Executing Piper script with: ${pythonPath}`);

      execFile(pythonPath, [scriptPath, text, outputPath, modelPath], {
        env: {
          ...process.env,
          PIPER_PATH: process.env.PIPER_PATH || 'backend/tools/piper/piper.exe'
        }
      }, (error, stdout, stderr) => {
        if (error) {
          return reject(error);
        }

        try {
          const result = JSON.parse(stdout.trim());
          if (result.error) {
            console.warn('[TTSService] Python bridge warning:', result.error);
            if (result.fallback) {
              return reject(new Error(result.error));
            }
            return reject(new Error(result.error));
          }
          resolve();
        } catch (parseErr) {
          console.error('[TTSService] Failed to parse script output:', stdout, stderr);
          reject(new Error(`Failed to parse Piper output: ${stdout}`));
        }
      });
    });
  }

  /**
   * Cleans up files in the temp_audio directory that are older than 10 minutes.
   */
  async cleanupOldFiles(): Promise<void> {
    const files = await fs.promises.readdir(this.tempDir);
    const now = Date.now();
    const tenMinutes = 10 * 60 * 1000;

    for (const file of files) {
      // Protect any default assets if they are placed here
      if (file === '.gitkeep') continue;

      const filePath = path.join(this.tempDir, file);
      try {
        const stats = await fs.promises.stat(filePath);
        if (now - stats.mtimeMs > tenMinutes) {
          await fs.promises.unlink(filePath);
          console.log(`[TTSService] Cleaned up expired temp audio file: ${file}`);
        }
      } catch (err) {
        console.error(`[TTSService] Failed to inspect/delete file ${file}:`, err);
      }
    }
  }

  /**
   * Generates a minimal, valid PCM WAV file (1 second of silence).
   */
  private generateSilentWav(): Buffer {
    const sampleRate = 8000;
    const numChannels = 1;
    const bitsPerSample = 16;
    const duration = 1.0;
    const numSamples = sampleRate * duration;
    const blockAlign = numChannels * (bitsPerSample / 8);
    const byteRate = sampleRate * blockAlign;
    const dataSize = numSamples * blockAlign;
    const headerSize = 44;
    const totalSize = headerSize + dataSize;

    const buffer = Buffer.alloc(totalSize);

    // RIFF Header
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(totalSize - 8, 4);
    buffer.write('WAVE', 8);

    // Format Chunk
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16);
    buffer.writeUInt16LE(1, 20); // PCM format
    buffer.writeUInt16LE(numChannels, 22);
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(byteRate, 28);
    buffer.writeUInt16LE(blockAlign, 32);
    buffer.writeUInt16LE(bitsPerSample, 34);

    // Data Chunk
    buffer.write('data', 36);
    buffer.writeUInt32LE(dataSize, 40);

    // Rest of the buffer is automatically filled with zeros (silence)
    return buffer;
  }

  // Gracefully stop timer on app shutdown
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}
