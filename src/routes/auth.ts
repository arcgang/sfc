import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { getDb } from '../db.js';

const authRouter = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const GENERIC_CONFIRMATION =
  'If an account with that email exists, a reset link has been sent.';

const JWT_SECRET = process.env['JWT_SECRET'] ?? 'dev-secret-change-in-production';
const BCRYPT_ROUNDS = 12;

interface SessionBody {
  mode?: unknown;
  email?: unknown;
  password?: unknown;
  fullName?: unknown;
}

export interface RegisterRequest {
  mode: 'register';
  email: string;
  password: string;
  fullName: string;
}

export interface AuthSuccessResponse {
  token: string;
  userId: string;
}

interface FieldErrors {
  email?: string;
  password?: string;
  fullName?: string;
}

function validateRegister(body: SessionBody): FieldErrors | null {
  const errors: FieldErrors = {};

  if (typeof body.fullName !== 'string' || body.fullName.trim().length === 0) {
    errors.fullName = 'Full name is required.';
  }
  if (typeof body.email !== 'string' || !EMAIL_RE.test(body.email)) {
    errors.email = 'A valid email address is required.';
  }
  if (typeof body.password !== 'string' || body.password.length < 8) {
    errors.password = 'Password must be at least 8 characters.';
  }

  return Object.keys(errors).length > 0 ? errors : null;
}

authRouter.post('/session', async (req: Request, res: Response) => {
  const body = req.body as SessionBody;

  if (body.mode === 'password_reset_request') {
    const email = body.email;

    if (typeof email !== 'string' || !EMAIL_RE.test(email)) {
      res.status(400).json({ code: 'INVALID_EMAIL', error: 'A valid email address is required.' });
      return;
    }

    console.log(JSON.stringify({ event: 'auth.password_reset_requested' }));

    res.status(200).json({ message: GENERIC_CONFIRMATION });
    return;
  }

  if (body.mode === 'register') {
    const errors = validateRegister(body);
    if (errors) {
      res.status(400).json({ code: 'VALIDATION_ERROR', errors });
      return;
    }

    const email = body.email as string;
    const password = body.password as string;
    const fullName = (body.fullName as string).trim();

    try {
      const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
      const userId = randomUUID();
      const profileId = randomUUID();
      const eventId = randomUUID();

      const db = getDb();

      const insertUser = db.prepare(
        'INSERT INTO users (id, email, full_name, password_hash) VALUES (?, ?, ?, ?)',
      );
      const insertProfile = db.prepare(
        "INSERT INTO profiles (id, user_id, persona_mode) VALUES (?, ?, 'default')",
      );
      const insertEvent = db.prepare(
        "INSERT INTO engagement_events (id, user_id, event_type) VALUES (?, ?, 'account_created')",
      );

      const tx = db.transaction(() => {
        insertUser.run(userId, email, fullName, passwordHash);
        insertProfile.run(profileId, userId);
      });

      tx();

      insertEvent.run(eventId, userId);

      const token = jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: '7d' });

      console.log(JSON.stringify({ event: 'auth.account_created', userId }));

      res.status(201).json({ token, userId } satisfies AuthSuccessResponse);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('UNIQUE constraint failed: users.email')) {
        res
          .status(409)
          .json({ code: 'REGISTRATION_FAILED', message: 'Registration could not be completed.' });
        return;
      }
      console.error(JSON.stringify({ event: 'auth.register_error', error: msg }));
      res.status(500).json({ code: 'INTERNAL_ERROR', error: 'An unexpected error occurred.' });
    }
    return;
  }

  res.status(400).json({ code: 'INVALID_MODE', error: 'Unknown session mode.' });
});

export { authRouter };
