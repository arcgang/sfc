import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';

const _jwtSecret = process.env['JWT_SECRET'];
if (!_jwtSecret) {
  throw new Error('JWT_SECRET environment variable is required but not set.');
}
const JWT_SECRET: string = _jwtSecret;

export interface AuthenticatedRequest extends Request {
  userId: string;
}

function buildMeta(): { correlationId: string; timestamp: string } {
  return { correlationId: randomUUID(), timestamp: new Date().toISOString() };
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      meta: buildMeta(),
      error: {
        type: 'AUTH_TOKEN_INVALID',
        details: [{ code: 'AUTH_TOKEN_INVALID', message: 'Missing or invalid authorization token.', field: null }],
      },
    });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { sub?: string };
    if (typeof payload.sub !== 'string') {
      throw new Error('Token payload missing sub');
    }
    (req as AuthenticatedRequest).userId = payload.sub;
    next();
  } catch {
    res.status(401).json({
      meta: buildMeta(),
      error: {
        type: 'AUTH_TOKEN_INVALID',
        details: [{ code: 'AUTH_TOKEN_INVALID', message: 'Missing or invalid authorization token.', field: null }],
      },
    });
  }
}
