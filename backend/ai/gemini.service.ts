import { getGeminiClient } from './provider';

export interface ModelCallConfig {
  systemInstruction?: string;
  responseSchema?: any;
  temperature?: number;
}

export async function callModelJson<T>(
  prompt: string,
  config: ModelCallConfig,
  fallbackGenerator: () => T
): Promise<T> {
  const client = getGeminiClient();
  if (!client) {
    console.warn('[Gemini Central Service] API key not present. Falling back to high-fidelity template.');
    return fallbackGenerator();
  }

  try {
    const apiConfig: any = {
      systemInstruction: config.systemInstruction,
      responseMimeType: 'application/json',
      temperature: config.temperature ?? 0.7,
    };

    if (config.responseSchema) {
      apiConfig.responseSchema = config.responseSchema;
    }

    const response = await client.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: apiConfig,
    });

    const text = response.text || '';
    const cleanJson = text.trim().replace(/^```json\s*/i, '').replace(/```$/, '');
    return JSON.parse(cleanJson) as T;
  } catch (err) {
    console.error('[Gemini Central Service] Error during model call, returning fallback:', err);
    return fallbackGenerator();
  }
}
