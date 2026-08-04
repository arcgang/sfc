import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { getDb } from '../db.js';

const profileRouter = Router();

const JWT_SECRET = process.env['JWT_SECRET'];
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required but not set.');
}

interface JwtPayload {
  sub: string;
}

function extractUserId(authHeader: string | undefined): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET as string) as JwtPayload;
    return typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}

profileRouter.get('/', (req: Request, res: Response) => {
  const userId = extractUserId(req.headers['authorization']);
  if (!userId) {
    res.status(401).json({ code: 'UNAUTHORIZED', error: 'Valid Bearer token required.' });
    return;
  }

  const db = getDb();
  const row = db
    .prepare('SELECT persona_mode FROM profiles WHERE user_id = ?')
    .get(userId) as { persona_mode: string } | undefined;

  if (!row) {
    res.status(404).json({ code: 'NOT_FOUND', error: 'Profile not found.' });
    return;
  }

  res.status(200).json({ dashboardMode: row.persona_mode });
});

export { profileRouter };
