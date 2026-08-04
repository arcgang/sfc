import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { getDb } from '../db.js';

const authRouter = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Exact string the existing password-reset tests assert against.
const GENERIC_CONFIRMATION =
  'If an account with that email exists, a reset link has been sent.';

const JWT_SECRET = process.env['JWT_SECRET'];
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required but not set.');
}
// 1-hour expiry — short-lived per LLD §7.1
const JWT_EXPIRY_SECONDS = 3600;
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

interface ErrorDetail {
  code: string;
  message: string;
  field: string | null;
}

export function buildMeta(): { correlationId: string; timestamp: string } {
  return { correlationId: randomUUID(), timestamp: new Date().toISOString() };
}

function validationErrorResponse(res: Response, details: ErrorDetail[]): void {
  res.status(422).json({
    meta: buildMeta(),
    error: { type: 'REQUEST_VALIDATION_FAILED', details },
  });
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

  // ── password_reset_request ─────────────────────────────────────────────────
  if (body.mode === 'password_reset_request') {
    const email = body.email;
    if (typeof email !== 'string' || !EMAIL_RE.test(email)) {
      res.status(400).json({ code: 'INVALID_EMAIL', error: 'A valid email address is required.' });
      return;
    }
    console.log(JSON.stringify({ event: 'auth.password_reset_requested' }));
    // Exact shape required by existing tests (strict toEqual).
    res.status(200).json({ message: GENERIC_CONFIRMATION });
    return;
  }

  // ── register ───────────────────────────────────────────────────────────────
  if (body.mode === 'register') {
    const errors = validateRegister(body);
    if (errors) {
      // Existing tests check res.body.code === 'VALIDATION_ERROR' and res.body.errors.*
      res.status(400).json({ code: 'VALIDATION_ERROR', errors });
      return;
    }

    const email = (body.email as string).toLowerCase();
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
        insertEvent.run(eventId, userId);
      });

      tx();

      const token = jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: JWT_EXPIRY_SECONDS });

      console.log(JSON.stringify({ event: 'auth.account_created', userId }));

      // Existing tests assert res.body.token and res.body.userId (flat shape).
      res.status(201).json({ token, userId } satisfies AuthSuccessResponse);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('UNIQUE constraint failed: users.email')) {
        res.status(409).json({ code: 'REGISTRATION_FAILED', message: 'Registration could not be completed.' });
        return;
      }
      console.error(JSON.stringify({ event: 'auth.register_error', error: msg }));
      res.status(500).json({ code: 'INTERNAL_ERROR', error: 'An unexpected error occurred.' });
    }
    return;
  }

  // ── login ──────────────────────────────────────────────────────────────────
  if (body.mode === 'login') {
    const rawEmail = body.email;
    const rawPassword = body.password;

    const loginErrors: ErrorDetail[] = [];
    if (typeof rawEmail !== 'string' || !EMAIL_RE.test(rawEmail)) {
      loginErrors.push({ code: 'INVALID_FORMAT', message: 'A valid email address is required.', field: 'email' });
    }
    if (typeof rawPassword !== 'string' || rawPassword.length < 8) {
      loginErrors.push({ code: 'INVALID_LENGTH', message: 'Password must be at least 8 characters.', field: 'password' });
    }
    if (loginErrors.length > 0) {
      validationErrorResponse(res, loginErrors);
      return;
    }

    const email = (rawEmail as string).toLowerCase();
    const password = rawPassword as string;

    console.log(JSON.stringify({ event: 'auth.login_attempt', email }));

    const db = getDb();
    const userRow = db
      .prepare('SELECT id, email, full_name, password_hash FROM users WHERE email = ?')
      .get(email) as { id: string; email: string; full_name: string; password_hash: string } | undefined;

    const credentialsValid =
      userRow !== undefined && (await bcrypt.compare(password, userRow.password_hash));

    if (!credentialsValid) {
      res.status(401).json({
        meta: buildMeta(),
        error: {
          type: 'AUTH_INVALID_CREDENTIALS',
          details: [{ code: 'AUTH_INVALID_CREDENTIALS', message: 'Invalid email or password.', field: null }],
        },
      });
      return;
    }

    const profileRow = db
      .prepare('SELECT persona_mode, requires_onboarding FROM profiles WHERE user_id = ?')
      .get(userRow.id) as { persona_mode: string; requires_onboarding: number } | undefined;

    const personaMode = profileRow?.persona_mode ?? 'default';
    const requiresOnboarding = profileRow?.requires_onboarding !== 0;

    const expiresAt = new Date(Date.now() + JWT_EXPIRY_SECONDS * 1000).toISOString();
    const accessToken = jwt.sign({ sub: userRow.id }, JWT_SECRET, { expiresIn: JWT_EXPIRY_SECONDS });

    res.status(200).json({
      meta: buildMeta(),
      data: {
        user: { id: userRow.id, email: userRow.email, fullName: userRow.full_name, personaMode },
        accessToken,
        expiresAt,
        requiresOnboarding,
      },
    });
    return;
  }

  res.status(400).json({ code: 'INVALID_MODE', error: 'Unknown session mode.' });
});

export { authRouter };
