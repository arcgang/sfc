import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const rawSecret = process.env['JWT_SECRET'];
if (!rawSecret) {
  throw new Error('JWT_SECRET environment variable is required but not set.');
}
const JWT_SECRET: string = rawSecret;

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ code: 'AUTH_TOKEN_INVALID', error: 'Authentication required.' });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { sub: string };
    (req as Request & { userId: string }).userId = payload.sub;
    next();
  } catch {
    res.status(401).json({ code: 'AUTH_TOKEN_INVALID', error: 'Invalid or expired token.' });
  }
}
