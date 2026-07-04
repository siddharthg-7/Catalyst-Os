export interface MemoryEntry {
  id: string;
  initiativeId: string;
  category: 'financial_policy' | 'hiring_criteria' | 'scaling_limit' | 'compliance_standard';
  key: string;
  value: string;
  timestamp: string;
}

export class MemorySystem {
  private memories: MemoryEntry[] = [];

  public logMemory(initiativeId: string, category: MemoryEntry['category'], key: string, value: string): void {
    this.memories.push({
      id: `mem_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      initiativeId,
      category,
      key,
      value,
      timestamp: new Date().toISOString()
    });
    console.log(`[MemorySystem] Persisted context: [${category}] ${key} = ${value}`);
  }

  public queryMemoryByCategory(category: MemoryEntry['category']): MemoryEntry[] {
    return this.memories.filter(m => m.category === category);
  }

  public retrieveContextForAgents(): string {
    if (this.memories.length === 0) {
      return 'No active dynamic startup policies stored in short-term memory.';
    }

    return this.memories
      .map(m => `[Policy logged ${m.timestamp}] ${m.key}: ${m.value}`)
      .join('\n');
  }

  public clear(): void {
    this.memories = [];
  }
}

export const memorySystem = new MemorySystem();
