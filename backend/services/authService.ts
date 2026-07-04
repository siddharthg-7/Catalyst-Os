import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { User, UserRole } from '../../src/types';
import { users } from '../state';

// Fallback secret for security
const JWT_ACCESS_SECRET = process.env.JWT_SECRET || 'founder_os_super_secret_access_key_99';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'founder_os_super_secret_refresh_key_88';

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export function generateAccessToken(user: User): string {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role },
    JWT_ACCESS_SECRET,
    { expiresIn: '15m' }
  );
}

export function generateRefreshToken(user: User): string {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
}

export function verifyAccessToken(token: string): any {
  try {
    return jwt.verify(token, JWT_ACCESS_SECRET);
  } catch (err) {
    return null;
  }
}

export function verifyRefreshToken(token: string): any {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET);
  } catch (err) {
    return null;
  }
}

// Express Middleware: Bearer JWT verification
export function authenticateJWT(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authorization token required.' });
    return;
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyAccessToken(token);

  if (!decoded) {
    res.status(401).json({ error: 'Invalid or expired access token.' });
    return;
  }

  req.user = {
    id: decoded.id,
    email: decoded.email,
    name: decoded.name,
    role: decoded.role as UserRole
  };

  next();
}

// Express Middleware: Role-based authorization gate
export function requireRole(allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: `Forbidden. Requires one of the roles: ${allowedRoles.join(', ')}` });
      return;
    }

    next();
  };
}
