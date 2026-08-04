import request from 'supertest';
import { createTestDb } from '../src/db';
import type Database from 'better-sqlite3';

const ENDPOINT = '/api/v1/auth/session';

let db: Database.Database;

beforeEach(() => {
  db = createTestDb();
  jest.resetModules();
});

afterEach(() => {
  db.close();
});

function makeApp(testDb: Database.Database) {
  jest.mock('../src/db', () => ({
    ...jest.requireActual('../src/db'),
    getDb: () => testDb,
  }));
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { app } = require('../src/app') as { app: import('express').Application };
  return app;
}

const VALID = {
  mode: 'register',
  email: 'acceptance@example.com',
  password: 'SecurePass1',
  fullName: 'Acceptance User',
};

describe('Registration flow — backend acceptance criteria', () => {
  // AC2: Submitting valid data calls POST /api/v1/auth/session mode=register; on 201 advances user to onboarding
  describe('AC2 — POST mode=register with valid data returns HTTP 201 with token and userId', () => {
    it('returns HTTP 201 for valid registration with email "acceptance@example.com"', async () => {
      const app = makeApp(db);
      const res = await request(app).post(ENDPOINT).send(VALID);
      expect(res.status).toBe(201);
    });

    it('response body contains a non-empty token string and a non-empty userId string', async () => {
      const app = makeApp(db);
      const res = await request(app).post(ENDPOINT).send(VALID);
      expect(typeof res.body.token).toBe('string');
      expect(res.body.token.length).toBeGreaterThan(0);
      expect(typeof res.body.userId).toBe('string');
      expect(res.body.userId.length).toBeGreaterThan(0);
    });

    it('the returned JWT payload contains "userId" and "email" fields required by the frontend parseToken()', async () => {
      // AuthContext.parseToken reads payload.userId and payload.email to build AuthUser.
      // If either is absent, login() silently no-ops and the user is not authenticated after registration.
      const app = makeApp(db);
      const res = await request(app).post(ENDPOINT).send(VALID);
      const parts = (res.body.token as string).split('.');
      expect(parts).toHaveLength(3);
      const raw = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(Buffer.from(raw, 'base64').toString('utf8')) as Record<string, unknown>;
      expect(typeof payload.userId).toBe('string');
      expect(typeof payload.email).toBe('string');
    });
  });

  // AC3: Duplicate email shows a clear error without revealing other account details
  describe('AC3 — duplicate email "acceptance@example.com" returns 409 with generic message', () => {
    it('returns HTTP 409 on the second registration attempt with the same email', async () => {
      const app = makeApp(db);
      await request(app).post(ENDPOINT).send(VALID);
      const res = await request(app).post(ENDPOINT).send(VALID);
      expect(res.status).toBe(409);
    });

    it('response message is "Registration could not be completed." and does not mention the email address', async () => {
      const app = makeApp(db);
      await request(app).post(ENDPOINT).send(VALID);
      const res = await request(app).post(ENDPOINT).send(VALID);
      expect(res.body.message).toBe('Registration could not be completed.');
      expect(JSON.stringify(res.body)).not.toContain('acceptance@example.com');
    });

    it('response body does not mention that an account already exists or that the email is taken', async () => {
      const app = makeApp(db);
      await request(app).post(ENDPOINT).send(VALID);
      const res = await request(app).post(ENDPOINT).send(VALID);
      expect(JSON.stringify(res.body)).not.toMatch(/already|exists|taken|registered/i);
    });
  });

  // AC4: Password < 8 chars shows field-level validation error before submission
  describe('AC4 — password "1234567" (7 chars) rejected with a password field error', () => {
    it('returns HTTP 400 for password "1234567" which is 7 characters', async () => {
      const app = makeApp(db);
      const res = await request(app).post(ENDPOINT).send({ ...VALID, password: '1234567' });
      expect(res.status).toBe(400);
    });

    it('errors.password is "Password must be at least 8 characters." for password "1234567"', async () => {
      const app = makeApp(db);
      const res = await request(app).post(ENDPOINT).send({ ...VALID, password: '1234567' });
      expect(res.body.errors?.password).toBe('Password must be at least 8 characters.');
    });
  });

  // AC5: Required empty fields rejected with field-specific messages
  describe('AC5 — each absent required field produces its own field-specific error', () => {
    it('returns HTTP 400 with a non-empty errors.fullName message when fullName is ""', async () => {
      const app = makeApp(db);
      const res = await request(app).post(ENDPOINT).send({ ...VALID, fullName: '' });
      expect(res.status).toBe(400);
      expect(typeof res.body.errors?.fullName).toBe('string');
      expect(res.body.errors.fullName.length).toBeGreaterThan(0);
    });

    it('returns HTTP 400 with a non-empty errors.email message when email is missing', async () => {
      const app = makeApp(db);
      const { email: _omit, ...payload } = VALID;
      void _omit;
      const res = await request(app).post(ENDPOINT).send(payload);
      expect(res.status).toBe(400);
      expect(typeof res.body.errors?.email).toBe('string');
      expect(res.body.errors.email.length).toBeGreaterThan(0);
    });

    it('returns HTTP 400 with a non-empty errors.password message when password is missing', async () => {
      const app = makeApp(db);
      const { password: _omit, ...payload } = VALID;
      void _omit;
      const res = await request(app).post(ENDPOINT).send(payload);
      expect(res.status).toBe(400);
      expect(typeof res.body.errors?.password).toBe('string');
      expect(res.body.errors.password.length).toBeGreaterThan(0);
    });

    it('returns HTTP 400 with all three separate field errors when fullName, email, and password are all absent', async () => {
      const app = makeApp(db);
      const res = await request(app).post(ENDPOINT).send({ mode: 'register' });
      expect(res.status).toBe(400);
      expect(typeof res.body.errors?.fullName).toBe('string');
      expect(typeof res.body.errors?.email).toBe('string');
      expect(typeof res.body.errors?.password).toBe('string');
    });
  });

  // AC6: Successful registration creates a users row and a profiles row with persona_mode='default'
  describe('AC6 — successful registration creates a users row and a profiles row with persona_mode="default"', () => {
    it('creates a users row with email "acceptance@example.com" and full_name "Acceptance User"', async () => {
      const app = makeApp(db);
      const res = await request(app).post(ENDPOINT).send(VALID);
      const user = db
        .prepare('SELECT email, full_name FROM users WHERE id = ?')
        .get(res.body.userId) as { email: string; full_name: string } | undefined;
      expect(user).toBeDefined();
      expect(user!.email).toBe('acceptance@example.com');
      expect(user!.full_name).toBe('Acceptance User');
    });

    it('creates a profiles row with persona_mode="default" linked to the new userId', async () => {
      const app = makeApp(db);
      const res = await request(app).post(ENDPOINT).send(VALID);
      const profile = db
        .prepare('SELECT persona_mode FROM profiles WHERE user_id = ?')
        .get(res.body.userId) as { persona_mode: string } | undefined;
      expect(profile).toBeDefined();
      expect(profile!.persona_mode).toBe('default');
    });
  });

  // AC7: Registration is measurable — engagement event recorded on successful account creation
  describe('AC7 — successful registration records an engagement event with event_type="account_created"', () => {
    it('creates an engagement_events row with event_type="account_created" for the new userId', async () => {
      const app = makeApp(db);
      const res = await request(app).post(ENDPOINT).send(VALID);
      const event = db
        .prepare('SELECT event_type FROM engagement_events WHERE user_id = ?')
        .get(res.body.userId) as { event_type: string } | undefined;
      expect(event).toBeDefined();
      expect(event!.event_type).toBe('account_created');
    });
  });
});
