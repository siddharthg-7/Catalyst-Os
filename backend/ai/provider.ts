import { GoogleGenAI } from '@google/genai';

let aiInstance: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI | null {
  if (!aiInstance && process.env.GEMINI_API_KEY) {
    try {
      aiInstance = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      console.log('Gemini AI Client successfully initialized inside central AI Provider.');
    } catch (err) {
      console.error('Failed to initialize central Gemini Client:', err);
    }
  }
  return aiInstance;
}
