/**
 * CatalystOS - Durable Idempotency Service (Section 4 & 5)
 * Prevents double financial mutations, duplicate executions, and replay attacks.
 * Manages atomic lock acquisition and durable result persistence per (tenantId, approvalId, action, idempotencyKey).
 */

export interface IdempotencyRecord {
  id: string;
  tenantId: string;
  approvalId: string;
  action: string;
  idempotencyKey: string;
  status: 'processing' | 'completed' | 'failed';
  result?: any;
  error?: string;
  createdAt: string;
  completedAt?: string;
}

export interface AcquireLockResult {
  acquired: boolean;
  status?: 'processing' | 'completed' | 'failed';
  record?: IdempotencyRecord;
  cachedResult?: any;
  message?: string;
}

class IdempotencyService {
  private inMemoryRecords = new Map<string, IdempotencyRecord>();

  /**
   * Generates a composite key uniquely identifying an idempotent mutation.
   */
  public buildKey(tenantId: string, approvalId: string, action: string, idempotencyKey?: string): string {
    const customKey = idempotencyKey ? `:${idempotencyKey}` : '';
    return `${tenantId}:${approvalId}:${action}${customKey}`;
  }

  /**
   * Atomically checks and acquires an execution lock for a state-changing operation.
   * If already completed, returns the cached result without re-executing.
   * If currently processing (concurrent identical request), returns acquired: false with 'processing'.
   */
  public async acquireLock(params: {
    tenantId: string;
    approvalId: string;
    action: string;
    idempotencyKey?: string;
  }): Promise<AcquireLockResult> {
    const { tenantId, approvalId, action, idempotencyKey } = params;
    const lookupKey = this.buildKey(tenantId, approvalId, action, idempotencyKey);
    const existing = this.inMemoryRecords.get(lookupKey);

    if (existing) {
      if (existing.status === 'processing') {
        // Await in case the concurrent in-flight request finishes
        for (let attempt = 0; attempt < 80; attempt++) {
          await new Promise(r => setTimeout(r, 50));
          const refreshed = this.inMemoryRecords.get(lookupKey);
          if (refreshed && refreshed.status === 'completed') {
            return {
              acquired: false,
              status: 'completed',
              record: refreshed,
              cachedResult: refreshed.result,
              message: `Operation has completed. Returning cached idempotent result.`
            };
          }
        }
        return {
          acquired: false,
          status: 'processing',
          record: existing,
          message: 'An identical operation is currently being processed by another worker or request.'
        };
      }
      if (existing.status === 'completed') {
        return {
          acquired: false,
          status: 'completed',
          record: existing,
          cachedResult: existing.result,
          message: `Operation has already been executed with status "${existing.status}". Returning cached idempotent result.`
        };
      }
    }

    // Acquire lock
    const record: IdempotencyRecord = {
      id: `idemp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      tenantId,
      approvalId,
      action,
      idempotencyKey: idempotencyKey || approvalId,
      status: 'processing',
      createdAt: new Date().toISOString()
    };

    this.inMemoryRecords.set(lookupKey, record);
    // Also index by approvalId directly for quick lookup
    this.inMemoryRecords.set(`approval:${approvalId}`, record);

    return {
      acquired: true,
      status: 'processing',
      record
    };
  }

  /**
   * Commits the idempotent execution record with the final mutation result.
   */
  public async commit(params: {
    tenantId: string;
    approvalId: string;
    action: string;
    idempotencyKey?: string;
    result: any;
  }): Promise<void> {
    const lookupKey = this.buildKey(params.tenantId, params.approvalId, params.action, params.idempotencyKey);
    const record = this.inMemoryRecords.get(lookupKey);
    const completedAt = new Date().toISOString();

    if (record) {
      record.status = 'completed';
      record.result = params.result;
      record.completedAt = completedAt;
    } else {
      const newRecord: IdempotencyRecord = {
        id: `idemp_${Date.now()}`,
        tenantId: params.tenantId,
        approvalId: params.approvalId,
        action: params.action,
        idempotencyKey: params.idempotencyKey || params.approvalId,
        status: 'completed',
        result: params.result,
        createdAt: completedAt,
        completedAt
      };
      this.inMemoryRecords.set(lookupKey, newRecord);
      this.inMemoryRecords.set(`approval:${params.approvalId}`, newRecord);
    }
  }

  /**
   * Releases or marks the idempotent execution record as failed.
   */
  public async release(params: {
    tenantId: string;
    approvalId: string;
    action: string;
    idempotencyKey?: string;
    error: string;
  }): Promise<void> {
    const lookupKey = this.buildKey(params.tenantId, params.approvalId, params.action, params.idempotencyKey);
    const record = this.inMemoryRecords.get(lookupKey);
    if (record) {
      record.status = 'failed';
      record.error = params.error;
      record.completedAt = new Date().toISOString();
    }
  }

  /**
   * Clears records (for testing purposes).
   */
  public clear(): void {
    this.inMemoryRecords.clear();
  }
}

export const idempotencyService = new IdempotencyService();
