import fs from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'backend', 'data', 'catalyst_state.json');

export interface PersistedState {
  startupProfile: any;
  initiatives: any[];
  approvals: any[];
  decisionLog: any[];
  knowledgeFiles: any[];
  teamMembers?: any[];
}

export function loadPersistedState(): PersistedState | null {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    }
  } catch (err: any) {
    console.warn('[StorageService] Note reading state file:', err.message);
  }
  return null;
}

export function savePersistedState(state: PersistedState): void {
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const tempFile = `${DATA_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(state, null, 2), 'utf-8');
    fs.renameSync(tempFile, DATA_FILE);
  } catch (err: any) {
    console.warn('[StorageService] Note saving state file:', err.message);
  }
}
