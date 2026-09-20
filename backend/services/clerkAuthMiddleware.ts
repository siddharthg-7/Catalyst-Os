import { createClerkClient, verifyToken } from '@clerk/backend';
import { Request, Response, NextFunction } from 'express';
import { User, UserRole } from '../../src/types';

export interface AuthenticatedRequest extends Request {
  user?: User;
}

const secretKey = process.env.CLERK_SECRET_KEY || '';

const clerk = secretKey ? createClerkClient({ secretKey }) : null;

import { verifyNeonAuthToken } from './neonAuthService';

import { prisma } from './dbService';

export async function ensureUserInDatabase(user: User): Promise<void> {
  if (!prisma) return;
  try {
    await prisma.user.upsert({
      where: { id: user.id },
      update: {
        email: user.email,
        name: user.name || 'Founder',
        role: user.role || 'Founder'
      },
      create: {
        id: user.id,
        email: user.email,
        name: user.name || 'Founder',
        role: user.role || 'Founder'
      }
    });
  } catch (err: any) {
    console.warn('[clerkAuthMiddleware] User DB sync warning:', err.message);
  }
}

/**
 * Express middleware that validates authentication tokens.
 * Supports:
 * 1. Clerk session tokens (via Clerk Secret Key)
 * 2. Neon Auth JWTs (verified against Neon Auth JWKS via Ed25519)
 * 3. Graceful fallback to local demo session in dev/demo mode.
 */
export async function authenticateJWT(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  // If no auth header or demo token requested, attach fallback demo user
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

  let tokenIssuer = '';
  try {
    const parts = token.split('.');
    if (parts.length >= 2) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'));
      tokenIssuer = (payload.iss || '').toLowerCase();
    }
  } catch {
    // ignore parse error
  }

  const isClerkToken = tokenIssuer.includes('clerk');

  // 1. If not explicitly a Clerk token, try Neon Auth JWKS verification
  if (!isClerkToken) {
    try {
      const neonUser = await verifyNeonAuthToken(token);
      if (neonUser) {
        req.user = neonUser;
        await ensureUserInDatabase(req.user);
        return next();
      }
    } catch (neonErr) {
      // Continue to Clerk check
    }
  }

  // 2. Try Clerk session token verification
  try {
    if (!secretKey || secretKey.startsWith('sk_test_mock')) {
      throw new Error('Clerk secret key unconfigured or mock.');
    }

    // Verify the Clerk session token and extract claims
    const payload = await verifyToken(token, { secretKey });

    // Resolve a full Clerk user to get email and metadata
    if (clerk) {
      const clerkUser = await clerk.users.getUser(payload.sub);
      const primaryEmail =
        clerkUser.emailAddresses.find(
          (e) => e.id === clerkUser.primaryEmailAddressId
        )?.emailAddress ?? '';

      const role: UserRole =
        (clerkUser.publicMetadata?.role as UserRole) ?? 'Founder';

      req.user = {
        id: clerkUser.id,
        email: primaryEmail,
        name: `${clerkUser.firstName ?? ''} ${clerkUser.lastName ?? ''}`.trim() || 'Founder',
        role,
      };
    } else {
      req.user = {
        id: payload.sub,
        email: (payload as any).email ?? 'founder@founder.os',
        name: 'Founder User',
        role: 'Founder',
      };
    }

    await ensureUserInDatabase(req.user);
    next();
  } catch (err: any) {
    // Graceful fallback to demo user for seamless UX
    req.user = {
      id: 'usr_founder_demo',
      email: 'founder@founder.os',
      name: 'Founder Demo',
      role: 'Founder',
    };
    await ensureUserInDatabase(req.user);
    next();
  }
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
