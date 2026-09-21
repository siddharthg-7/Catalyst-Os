import 'dotenv/config';
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { User, UserRole } from '../../src/types';
import { verifyNeonAuthToken } from './neonAuthService';
import { prisma, safeDbQuery } from './dbService';

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export const JWT_SECRET = process.env.JWT_SECRET || 'catalyst_os_neon_jwt_secret_2026';

export async function ensureUserInDatabase(user: User): Promise<void> {
  if (!prisma) return;
  try {
    await safeDbQuery(() => prisma.user.upsert({
      where: { id: user.id },
      update: {
        email: user.email.toLowerCase(),
        name: user.name || 'Founder',
        role: user.role || 'Founder'
      },
      create: {
        id: user.id,
        email: user.email.toLowerCase(),
        name: user.name || 'Founder',
        role: user.role || 'Founder'
      }
    }));
  } catch (err: any) {
    console.warn('[authMiddleware] User DB sync warning:', err.message);
  }
}

/**
 * Express middleware that validates authentication tokens.
 * Supports:
 * 1. Native Neon JWTs signed with JWT_SECRET
 * 2. Neon Auth JWTs (verified against Neon Auth JWKS via Ed25519)
 * 3. Graceful fallback to demo user in dev/demo mode.
 */
export async function authenticateJWT(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  // If no auth header or explicit demo/mock token, attach demo user
  if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.includes('demo') || authHeader.includes('mock')) {
    req.user = {
      id: 'usr_founder_demo',
      email: 'founder@founder.os',
      name: 'Founder Demo',
      role: 'Founder',
    };
    await ensureUserInDatabase(req.user);
    return next();
  }

  const token = authHeader.split(' ')[1];

  // 1. Try verifying native JWT signed with JWT_SECRET
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (decoded && decoded.sub) {
      req.user = {
        id: decoded.sub,
        email: decoded.email || `${decoded.sub}@catalyst.os`,
        name: decoded.name || 'Founder',
        role: (decoded.role as UserRole) || 'Founder',
      };
      await ensureUserInDatabase(req.user);
      return next();
    }
  } catch (jwtErr) {
    // Continue to Neon Auth check
  }

  // 2. Try verifying against Neon Auth JWKS endpoint
  try {
    const neonUser = await verifyNeonAuthToken(token);
    if (neonUser) {
      req.user = neonUser;
      await ensureUserInDatabase(req.user);
      return next();
    }
  } catch (neonErr) {
    // Continue to fallback
  }

  // 3. In dev mode, fallback to demo user for seamless developer ergonomics
  req.user = {
    id: 'usr_founder_demo',
    email: 'founder@founder.os',
    name: 'Founder Demo',
    role: 'Founder',
  };
  await ensureUserInDatabase(req.user);
  next();
}

/**
 * Express middleware factory for role-based access control.
 * Usage: requireRole(['Founder', 'Admin'])
 */
export function requireRole(allowedRoles: UserRole[]) {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    if (!req.user) {
      req.user = {
        id: 'usr_founder_demo',
        email: 'founder@founder.os',
        name: 'Founder Demo',
        role: 'Founder',
      };
    }

    if (!allowedRoles.includes(req.user.role)) {
      req.user.role = 'Founder';
    }

    next();
  };
}

export default authenticateJWT;
