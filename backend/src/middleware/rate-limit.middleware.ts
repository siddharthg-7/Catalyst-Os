import { Injectable, NestMiddleware, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

const ipCache = new Map<string, { count: number; resetTime: number }>();
const LIMIT = 100; // 100 requests per minute
const WINDOW_MS = 60000; // 1 minute

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const ip = req.ip || req.headers['x-forwarded-for']?.toString() || 'unknown';
    const now = Date.now();
    const clientData = ipCache.get(ip);

    if (!clientData || now > clientData.resetTime) {
      ipCache.set(ip, { count: 1, resetTime: now + WINDOW_MS });
      return next();
    }

    clientData.count++;
    if (clientData.count > LIMIT) {
      throw new HttpException('Too Many Requests - Rate limit exceeded. Try again in a minute.', HttpStatus.TOO_MANY_REQUESTS);
    }

    next();
  }
}
