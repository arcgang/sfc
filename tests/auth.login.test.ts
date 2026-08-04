import request from 'supertest';
import bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { createTestDb } from '../src/db';
import type Database from 'better-sqlite3';
import type { Application } from 'express';

const ENDPOINT = '/api/v1/auth/session';

let db: Database.Database;
let app: Application;

beforeEach(() => {
  db = createTestDb();
  jest.resetModules();
  jest.mock('../src/db', () => ({
    ...jest.requireActual('../src/db'),
    getDb: () => db,
  }));
  app = (require('../src/app') as { app: Application }).app;
});

afterEach(() => {
  db.close();
});

async function seedUser(
  email: string,
  password: string,
  fullName: string,
): Promise<string> {
  const userId = randomUUID();
  const profileId = randomUUID();
  const hash = await bcrypt.hash(password, 1);
  db.prepare(
    'INSERT INTO users (id, email, full_name, password_hash) VALUES (?, ?, ?, ?)',
  ).run(userId, email.toLowerCase(), fullName, hash);
  db.prepare(
    "INSERT INTO profiles (id, user_id, persona_mode) VALUES (?, ?, 'default')",
  ).run(profileId, userId);
  return userId;
}

describe('POST /api/v1/auth/session — mode=login', () => {
  const VALID_EMAIL = 'sarah@example.com';
  const VALID_PASSWORD = 'StrongPass!23';
  const FULL_NAME = 'Sarah Chen';

  describe('happy path: valid credentials for "sarah@example.com"', () => {
    it('returns HTTP 200', async () => {
      await seedUser(VALID_EMAIL, VALID_PASSWORD, FULL_NAME);
      const res = await request(app)
        .post(ENDPOINT)
        .send({ mode: 'login', email: VALID_EMAIL, password: VALID_PASSWORD });
      expect(res.status).toBe(200);
    });

    it('response contains meta.correlationId (non-empty string) and meta.timestamp (ISO string)', async () => {
      await seedUser(VALID_EMAIL, VALID_PASSWORD, FULL_NAME);
      const res = await request(app)
        .post(ENDPOINT)
        .send({ mode: 'login', email: VALID_EMAIL, password: VALID_PASSWORD });
      expect(typeof res.body.meta.correlationId).toBe('string');
      expect(res.body.meta.correlationId.length).toBeGreaterThan(0);
      expect(typeof res.body.meta.timestamp).toBe('string');
      expect(new Date(res.body.meta.timestamp as string).getTime()).not.toBeNaN();
    });

    it('response data contains accessToken string', async () => {
      await seedUser(VALID_EMAIL, VALID_PASSWORD, FULL_NAME);
      const res = await request(app)
        .post(ENDPOINT)
        .send({ mode: 'login', email: VALID_EMAIL, password: VALID_PASSWORD });
      expect(typeof res.body.data.accessToken).toBe('string');
      expect(res.body.data.accessToken.length).toBeGreaterThan(0);
    });

    it('response data contains expiresAt as a future ISO timestamp', async () => {
      await seedUser(VALID_EMAIL, VALID_PASSWORD, FULL_NAME);
      const res = await request(app)
        .post(ENDPOINT)
        .send({ mode: 'login', email: VALID_EMAIL, password: VALID_PASSWORD });
      expect(typeof res.body.data.expiresAt).toBe('string');
      const exp = new Date(res.body.data.expiresAt as string).getTime();
      expect(exp).toBeGreaterThan(Date.now());
    });

    it('JWT expiry is short-lived (expiresAt within 2 hours)', async () => {
      await seedUser(VALID_EMAIL, VALID_PASSWORD, FULL_NAME);
      const res = await request(app)
        .post(ENDPOINT)
        .send({ mode: 'login', email: VALID_EMAIL, password: VALID_PASSWORD });
      const exp = new Date(res.body.data.expiresAt as string).getTime();
      const twoHoursFromNow = Date.now() + 2 * 60 * 60 * 1000;
      expect(exp).toBeLessThanOrEqual(twoHoursFromNow);
    });

    it('response data.user contains id matching the seeded userId', async () => {
      const userId = await seedUser(VALID_EMAIL, VALID_PASSWORD, FULL_NAME);
      const res = await request(app)
        .post(ENDPOINT)
        .send({ mode: 'login', email: VALID_EMAIL, password: VALID_PASSWORD });
      expect(res.body.data.user.id).toBe(userId);
    });

    it('response data.user.email is "sarah@example.com"', async () => {
      await seedUser(VALID_EMAIL, VALID_PASSWORD, FULL_NAME);
      const res = await request(app)
        .post(ENDPOINT)
        .send({ mode: 'login', email: VALID_EMAIL, password: VALID_PASSWORD });
      expect(res.body.data.user.email).toBe('sarah@example.com');
    });

    it('response data.user.fullName is "Sarah Chen"', async () => {
      await seedUser(VALID_EMAIL, VALID_PASSWORD, FULL_NAME);
      const res = await request(app)
        .post(ENDPOINT)
        .send({ mode: 'login', email: VALID_EMAIL, password: VALID_PASSWORD });
      expect(res.body.data.user.fullName).toBe('Sarah Chen');
    });

    it('response data.user.personaMode is "default"', async () => {
      await seedUser(VALID_EMAIL, VALID_PASSWORD, FULL_NAME);
      const res = await request(app)
        .post(ENDPOINT)
        .send({ mode: 'login', email: VALID_EMAIL, password: VALID_PASSWORD });
      expect(res.body.data.user.personaMode).toBe('default');
    });

    it('response data.requiresOnboarding is true for a newly registered user', async () => {
      await seedUser(VALID_EMAIL, VALID_PASSWORD, FULL_NAME);
      const res = await request(app)
        .post(ENDPOINT)
        .send({ mode: 'login', email: VALID_EMAIL, password: VALID_PASSWORD });
      expect(res.body.data.requiresOnboarding).toBe(true);
    });

    it('emits auth.login_attempt console log on successful login', async () => {
      await seedUser(VALID_EMAIL, VALID_PASSWORD, FULL_NAME);
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
      await request(app)
        .post(ENDPOINT)
        .send({ mode: 'login', email: VALID_EMAIL, password: VALID_PASSWORD });
      const emitted = logSpy.mock.calls.some((args) => {
        try {
          return (JSON.parse(args[0] as string) as { event?: string }).event === 'auth.login_attempt';
        } catch {
          return false;
        }
      });
      expect(emitted).toBe(true);
      logSpy.mockRestore();
    });
  });

  describe('email normalisation: login with "SARAH@EXAMPLE.COM" (uppercase) succeeds', () => {
    it('returns HTTP 200 when email is uppercase', async () => {
      await seedUser(VALID_EMAIL, VALID_PASSWORD, FULL_NAME);
      const res = await request(app)
        .post(ENDPOINT)
        .send({ mode: 'login', email: 'SARAH@EXAMPLE.COM', password: VALID_PASSWORD });
      expect(res.status).toBe(200);
    });

    it('response data.user.email is lowercase "sarah@example.com"', async () => {
      await seedUser(VALID_EMAIL, VALID_PASSWORD, FULL_NAME);
      const res = await request(app)
        .post(ENDPOINT)
        .send({ mode: 'login', email: 'SARAH@EXAMPLE.COM', password: VALID_PASSWORD });
      expect(res.body.data.user.email).toBe('sarah@example.com');
    });
  });

  describe('email normalisation: register stores email as lowercase', () => {
    it('register with "ALICE@EXAMPLE.COM" stores email as "alice@example.com"', async () => {
      const res = await request(app).post(ENDPOINT).send({
        mode: 'register',
        email: 'ALICE@EXAMPLE.COM',
        password: 'Secure1234!',
        fullName: 'Alice Smith',
      });
      expect(res.status).toBe(201);
      const row = db
        .prepare('SELECT email FROM users WHERE id = ?')
        .get(res.body.userId as string) as { email: string } | undefined;
      expect(row?.email).toBe('alice@example.com');
    });
  });

  describe('invalid credentials: wrong password "WrongPass99!" for "sarah@example.com"', () => {
    it('returns HTTP 401', async () => {
      await seedUser(VALID_EMAIL, VALID_PASSWORD, FULL_NAME);
      const res = await request(app)
        .post(ENDPOINT)
        .send({ mode: 'login', email: VALID_EMAIL, password: 'WrongPass99!' });
      expect(res.status).toBe(401);
    });

    it('returns error.type "AUTH_INVALID_CREDENTIALS"', async () => {
      await seedUser(VALID_EMAIL, VALID_PASSWORD, FULL_NAME);
      const res = await request(app)
        .post(ENDPOINT)
        .send({ mode: 'login', email: VALID_EMAIL, password: 'WrongPass99!' });
      expect(res.body.error.type).toBe('AUTH_INVALID_CREDENTIALS');
    });

    it('response contains meta.correlationId and meta.timestamp on 401', async () => {
      await seedUser(VALID_EMAIL, VALID_PASSWORD, FULL_NAME);
      const res = await request(app)
        .post(ENDPOINT)
        .send({ mode: 'login', email: VALID_EMAIL, password: 'WrongPass99!' });
      expect(typeof res.body.meta.correlationId).toBe('string');
      expect(typeof res.body.meta.timestamp).toBe('string');
    });

    it('emits auth.login_attempt console log even when password is wrong', async () => {
      await seedUser(VALID_EMAIL, VALID_PASSWORD, FULL_NAME);
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
      await request(app)
        .post(ENDPOINT)
        .send({ mode: 'login', email: VALID_EMAIL, password: 'WrongPass99!' });
      const emitted = logSpy.mock.calls.some((args) => {
        try {
          return (JSON.parse(args[0] as string) as { event?: string }).event === 'auth.login_attempt';
        } catch {
          return false;
        }
      });
      expect(emitted).toBe(true);
      logSpy.mockRestore();
    });
  });

  describe('invalid credentials: non-existent email "ghost@example.com"', () => {
    it('returns HTTP 401', async () => {
      const res = await request(app)
        .post(ENDPOINT)
        .send({ mode: 'login', email: 'ghost@example.com', password: 'SomePassword!' });
      expect(res.status).toBe(401);
    });

    it('returns error.type "AUTH_INVALID_CREDENTIALS" (does not reveal account non-existence)', async () => {
      const res = await request(app)
        .post(ENDPOINT)
        .send({ mode: 'login', email: 'ghost@example.com', password: 'SomePassword!' });
      expect(res.body.error.type).toBe('AUTH_INVALID_CREDENTIALS');
    });
  });

  describe('validation: password "short" (5 characters) for login mode', () => {
    it('returns HTTP 422', async () => {
      const res = await request(app)
        .post(ENDPOINT)
        .send({ mode: 'login', email: VALID_EMAIL, password: 'short' });
      expect(res.status).toBe(422);
    });

    it('returns error.type "REQUEST_VALIDATION_FAILED"', async () => {
      const res = await request(app)
        .post(ENDPOINT)
        .send({ mode: 'login', email: VALID_EMAIL, password: 'short' });
      expect(res.body.error.type).toBe('REQUEST_VALIDATION_FAILED');
    });

    it('error details contain an entry with code "INVALID_LENGTH" and field "password"', async () => {
      const res = await request(app)
        .post(ENDPOINT)
        .send({ mode: 'login', email: VALID_EMAIL, password: 'short' });
      const details = res.body.error.details as Array<{ code: string; field: string }>;
      const match = details.find((d) => d.code === 'INVALID_LENGTH' && d.field === 'password');
      expect(match).toBeDefined();
    });

    it('response contains meta.correlationId and meta.timestamp on 422', async () => {
      const res = await request(app)
        .post(ENDPOINT)
        .send({ mode: 'login', email: VALID_EMAIL, password: 'short' });
      expect(typeof res.body.meta.correlationId).toBe('string');
      expect(res.body.meta.correlationId.length).toBeGreaterThan(0);
      expect(typeof res.body.meta.timestamp).toBe('string');
    });
  });
});
