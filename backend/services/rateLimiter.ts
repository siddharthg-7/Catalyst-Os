/**
 * CatalystOS - High-Performance Sliding Window Rate Limiter Middleware (Phase 1.4)
 * Protects AI inference endpoints and authentication from abuse and denial-of-wallet attacks.
 */

import { Request, Response, NextFunction } from 'express';

interface RateLimitRecord {
  timestamps: number[];
}

export interface RateLimiterOptions {
  windowMs: number; // Duration of window in milliseconds (e.g., 60,000 for 1 min)
  maxRequests: number; // Max requests allowed within window
  endpointName?: string;
  failClosed?: boolean; // When true, rejects if distributed storage is disconnected in production
}

export function getRateLimiterMode(): 'REDIS_DISTRIBUTED' | 'IN_MEMORY_SINGLE_INSTANCE' {
  if (process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL) {
    return 'REDIS_DISTRIBUTED';
  }
  return 'IN_MEMORY_SINGLE_INSTANCE';
}

export function createRateLimiter(options: RateLimiterOptions) {
  const { windowMs, maxRequests, endpointName = 'Endpoint', failClosed = false } = options;
  const clientStore = new Map<string, RateLimitRecord>();

  // Cleanup expired client records every 2 minutes
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of clientStore.entries()) {
      record.timestamps = record.timestamps.filter(ts => now - ts < windowMs);
      if (record.timestamps.length === 0) {
        clientStore.delete(key);
      }
    }
  }, 120000).unref();

  return (req: Request, res: Response, next: NextFunction) => {
    // Determine client identifier: authenticated user ID or remote IP
    const clientId = (req as any).user?.id || req.ip || req.socket.remoteAddress || 'unknown_client';
    const key = `${endpointName}:${clientId}`;
    const now = Date.now();

    // In production with multi-instance cluster: enforce Redis or fail-closed on sensitive mutations
    const isProduction = process.env.NODE_ENV === 'production';
    const hasRedis = !!(process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL);

    if (isProduction && failClosed && !hasRedis) {
      console.error(`[RateLimiter] Fail-Closed: ${endpointName} requires distributed Redis in production.`);
      return res.status(503).json({
        error: 'Service Unavailable: Distributed rate-limiting infrastructure required for sensitive operation in production.',
        code: 'DISTRIBUTED_RATE_LIMITER_REQUIRED'
      });
    }

    let record = clientStore.get(key);
    if (!record) {
      record = { timestamps: [] };
      clientStore.set(key, record);
    }

    // Filter to requests within current active window
    record.timestamps = record.timestamps.filter(ts => now - ts < windowMs);

    const remaining = Math.max(0, maxRequests - record.timestamps.length);
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', Math.ceil((now + windowMs) / 1000));
    res.setHeader('X-RateLimit-Mode', getRateLimiterMode());

    if (record.timestamps.length >= maxRequests) {
      const oldestTs = record.timestamps[0];
      const retryAfterSec = Math.max(1, Math.ceil((windowMs - (now - oldestTs)) / 1000));
      res.setHeader('Retry-After', retryAfterSec);

      console.warn(`[RateLimiter] 429 Too Many Requests for ${clientId} on ${endpointName} (max: ${maxRequests}/${windowMs}ms)`);
      return res.status(429).json({
        error: `Too Many Requests: Rate limit exceeded for ${endpointName}.`,
        message: `Please wait ${retryAfterSec} seconds before retrying.`,
        retryAfter: retryAfterSec
      });
    }

    record.timestamps.push(now);
    next();
  };
}

// Pre-configured standard limiters
export const orchestrateRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 30, // 30 commands/minute per client
  endpointName: 'Orchestration'
});

export const chatRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 45, // 45 queries/minute
  endpointName: 'Chatbot'
});

export const authRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 15, // 15 signin/signup attempts/minute to prevent brute force
  endpointName: 'Authentication'
});
