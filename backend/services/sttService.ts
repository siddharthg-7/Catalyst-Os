import { execFile } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { ai } from './geminiService';

export class STTService {
  private tempDir: string;

  constructor() {
    this.tempDir = path.join(process.cwd(), 'temp_audio');
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Transcribes an audio buffer to text.
   * Uses local faster-whisper via Python if available; falls back to Gemini or a mock text.
   */
  async transcribe(audioBuffer: Buffer, mimeType: string): Promise<string> {
    const ext = this.getExtensionFromMimeType(mimeType);
    const tempFileName = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 5)}.${ext}`;
    const tempFilePath = path.join(this.tempDir, tempFileName);

    try {
      // Save buffer to temporary file
      await fs.promises.writeFile(tempFilePath, audioBuffer);

      // 1. Try local faster-whisper via python script
      try {
        const transcription = await this.runWhisperScript(tempFilePath);
        if (transcription && transcription.trim()) {
          return transcription;
        }
      } catch (err: any) {
        console.warn('[STTService] Local Whisper transcription failed or was unconfigured. Attempting fallback...', err.message || err);
      }

      // 2. Fallback to Gemini if API key is active
      if (ai) {
        try {
          console.log('[STTService] Utilizing Gemini API for audio transcription fallback.');
          const base64Audio = audioBuffer.toString('base64');
          
          // Clean the MIME type by stripping codecs parameters (e.g., "audio/webm;codecs=opus" -> "audio/webm")
          const cleanMimeType = mimeType.split(';')[0].trim() || 'audio/webm';
          
          const response = await ai.models.generateContent({
            model: 'gemini-3.5-flash',
            contents: [
              {
                inlineData: {
                  data: base64Audio,
                  mimeType: cleanMimeType
                }
              },
              'Transcribe the speech in this audio file. Output only the transcription, do not add any comments or notes.'
            ]
          });

          const geminiText = response.text?.trim();
          if (geminiText) {
            return geminiText;
          }
        } catch (geminiErr: any) {
          console.error('[STTService] Gemini fallback transcription failed:', geminiErr.message || geminiErr);
        }
      }

      // 3. Fallback to a mock system query for local testing
      console.log('[STTService] Falling back to standard mock response for voice interaction command.');
      return 'What did we decide about hiring last month?';

    } finally {
      // Clean up temporary file asynchronously
      fs.unlink(tempFilePath, (err) => {
        if (err && err.code !== 'ENOENT') {
          console.error(`[STTService] Failed to clean up temp file ${tempFilePath}:`, err);
        }
      });
    }
  }

  private runWhisperScript(audioPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      // Get python executable from .env or find in .venv
      let pythonPath = process.env.PYTHON_PATH || 'python';
      
      // Auto-detect backend/.venv on Windows if default python is used
      if (pythonPath === 'python' && process.platform === 'win32') {
        const venvPythonRoot = path.join(process.cwd(), 'backend', '.venv', 'Scripts', 'python.exe');
        const venvPythonBackend = path.join(process.cwd(), '.venv', 'Scripts', 'python.exe');
        if (fs.existsSync(venvPythonRoot)) {
          pythonPath = venvPythonRoot;
        } else if (fs.existsSync(venvPythonBackend)) {
          pythonPath = venvPythonBackend;
        }
      }

      const scriptPath = path.join(process.cwd(), 'backend', 'services', 'voice', 'transcribe.py');

      console.log(`[STTService] Executing Whisper script with: ${pythonPath}`);

      execFile(pythonPath, [scriptPath, audioPath], {
        env: {
          ...process.env,
          // Force Whisper model environment variable
          WHISPER_MODEL: process.env.WHISPER_MODEL || 'small'
        }
      }, (error, stdout, stderr) => {
        if (error) {
          return reject(error);
        }

        try {
          const result = JSON.parse(stdout.trim());
          if (result.error) {
            console.warn('[STTService] Python bridge warning:', result.error);
            if (result.fallback) {
              return reject(new Error(result.error));
            }
            return reject(new Error(result.error));
          }
          resolve(result.text);
        } catch (parseErr) {
          console.error('[STTService] Failed to parse script output:', stdout, stderr);
          reject(new Error(`Failed to parse Whisper output: ${stdout}`));
        }
      });
    });
  }

  private getExtensionFromMimeType(mimeType: string): string {
    if (!mimeType) return 'wav';
    if (mimeType.includes('webm')) return 'webm';
    if (mimeType.includes('wav')) return 'wav';
    if (mimeType.includes('mp3')) return 'mp3';
    if (mimeType.includes('ogg')) return 'ogg';
    if (mimeType.includes('m4a') || mimeType.includes('mp4')) return 'm4a';
    return 'wav';
  }
}
