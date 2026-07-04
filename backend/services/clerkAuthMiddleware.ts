import { createClerkClient, verifyToken } from '@clerk/backend';
import { Request, Response, NextFunction } from 'express';
import { User, UserRole } from '../../src/types';

export interface AuthenticatedRequest extends Request {
  user?: User;
}

const clerk = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

/**
 * Express middleware that validates a Clerk session token sent as a
 * Bearer token in the Authorization header.
 *
 * On success it populates req.user with { id, email, name, role }
 * extracted from the Clerk session claims and publicMetadata.
 */
export async function authenticateJWT(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authorization token required.' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    // Verify the Clerk session token and extract claims
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
    });

    // Resolve a full Clerk user to get email and metadata
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
      name: `${clerkUser.firstName ?? ''} ${clerkUser.lastName ?? ''}`.trim(),
      role,
    };

    next();
  } catch (err: any) {
    console.error('[Clerk Middleware] Token verification failed:', err.message);
    res.status(401).json({ error: 'Invalid or expired session token.' });
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
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res
        .status(403)
        .json({
          error: `Forbidden. Requires one of the roles: ${allowedRoles.join(', ')}`,
        });
      return;
    }

    next();
  };
}
