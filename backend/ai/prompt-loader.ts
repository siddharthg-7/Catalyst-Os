import fs from 'fs';
import path from 'path';

export function loadPromptAsset(agentDir: string, fileName: string): string {
  try {
    const filePath = path.join(process.cwd(), 'backend', 'agents', agentDir, fileName);
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf-8');
    }
  } catch (err) {
    console.warn(`Could not load prompt asset for ${agentDir}/${fileName}:`, err);
  }
  return '';
}

export function renderPromptTemplate(template: string, variables: Record<string, string | number | boolean>): string {
  let rendered = template;
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    rendered = rendered.replace(placeholder, String(value));
  }
  return rendered;
}
