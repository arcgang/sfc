import request from 'supertest';
import { createTestDb } from '../src/db';
import type Database from 'better-sqlite3';

const ENDPOINT = '/api/v1/auth/session';

let db: Database.Database;

// Each test gets its own isolated in-memory DB wired into the app via env override.
// We create the db before requiring the app so the module-level getDb() picks it up.
beforeEach(() => {
  db = createTestDb();
  // Replace the singleton so the app under test uses this clean DB.
  jest.resetModules();
});

afterEach(() => {
  db.close();
});

function makeApp(testDb: Database.Database) {
  // Inject the test db by overriding the db module before loading app.
  jest.mock('../src/db', () => ({
    ...jest.requireActual('../src/db'),
    getDb: () => testDb,
  }));
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { app } = require('../src/app') as { app: import('express').Application };
  return app;
}

const VALID_PAYLOAD = {
  mode: 'register',
  email: 'alice@example.com',
  password: 'Secure1234',
  fullName: 'Alice Smith',
};

describe('POST /api/v1/auth/session — mode=register', () => {
  describe('happy path: valid registration with email "alice@example.com"', () => {
    it('returns HTTP 201', async () => {
      const app = makeApp(db);
      const res = await request(app).post(ENDPOINT).send(VALID_PAYLOAD);
      expect(res.status).toBe(201);
    });

    it('returns a token and userId in the response body', async () => {
      const app = makeApp(db);
      const res = await request(app).post(ENDPOINT).send(VALID_PAYLOAD);
      expect(typeof res.body.token).toBe('string');
      expect(res.body.token.length).toBeGreaterThan(0);
      expect(typeof res.body.userId).toBe('string');
      expect(res.body.userId.length).toBeGreaterThan(0);
    });

    it('creates a users row with the email "alice@example.com"', async () => {
      const app = makeApp(db);
      const res = await request(app).post(ENDPOINT).send(VALID_PAYLOAD);
      const row = db.prepare('SELECT * FROM users WHERE id = ?').get(res.body.userId) as
        | { id: string; email: string; full_name: string; password_hash: string }
        | undefined;
      expect(row).toBeDefined();
      expect(row!.email).toBe('alice@example.com');
      expect(row!.full_name).toBe('Alice Smith');
    });

    it('does not store the plaintext password', async () => {
      const app = makeApp(db);
      const res = await request(app).post(ENDPOINT).send(VALID_PAYLOAD);
      const row = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(res.body.userId) as
        | { password_hash: string }
        | undefined;
      expect(row!.password_hash).not.toBe('Secure1234');
      expect(row!.password_hash.length).toBeGreaterThan(20);
    });

    it('creates a profiles row with persona_mode="default" for the new userId', async () => {
      const app = makeApp(db);
      const res = await request(app).post(ENDPOINT).send(VALID_PAYLOAD);
      const profile = db
        .prepare('SELECT * FROM profiles WHERE user_id = ?')
        .get(res.body.userId) as { user_id: string; persona_mode: string } | undefined;
      expect(profile).toBeDefined();
      expect(profile!.persona_mode).toBe('default');
    });

    it('creates an engagement_events row with event_type="account_created" for the new userId', async () => {
      const app = makeApp(db);
      const res = await request(app).post(ENDPOINT).send(VALID_PAYLOAD);
      const event = db
        .prepare('SELECT * FROM engagement_events WHERE user_id = ?')
        .get(res.body.userId) as { user_id: string; event_type: string } | undefined;
      expect(event).toBeDefined();
      expect(event!.event_type).toBe('account_created');
    });
  });

  describe('duplicate email: registering "alice@example.com" twice', () => {
    it('returns HTTP 409 on the second registration attempt', async () => {
      const app = makeApp(db);
      await request(app).post(ENDPOINT).send(VALID_PAYLOAD);
      const res = await request(app).post(ENDPOINT).send(VALID_PAYLOAD);
      expect(res.status).toBe(409);
    });

    it('returns the generic message "Registration could not be completed." without revealing the email', async () => {
      const app = makeApp(db);
      await request(app).post(ENDPOINT).send(VALID_PAYLOAD);
      const res = await request(app).post(ENDPOINT).send(VALID_PAYLOAD);
      expect(res.body.message).toBe('Registration could not be completed.');
    });
  });

  describe('validation: invalid email format "not-an-email"', () => {
    it('returns HTTP 400', async () => {
      const app = makeApp(db);
      const res = await request(app)
        .post(ENDPOINT)
        .send({ ...VALID_PAYLOAD, email: 'not-an-email' });
      expect(res.status).toBe(400);
    });

    it('returns an errors object with an "email" key', async () => {
      const app = makeApp(db);
      const res = await request(app)
        .post(ENDPOINT)
        .send({ ...VALID_PAYLOAD, email: 'not-an-email' });
      expect(res.body.errors).toBeDefined();
      expect(typeof res.body.errors.email).toBe('string');
    });
  });

  describe('validation: password "short" has fewer than 8 characters', () => {
    it('returns HTTP 400', async () => {
      const app = makeApp(db);
      const res = await request(app)
        .post(ENDPOINT)
        .send({ ...VALID_PAYLOAD, password: 'short' });
      expect(res.status).toBe(400);
    });

    it('returns an errors object with a "password" key', async () => {
      const app = makeApp(db);
      const res = await request(app)
        .post(ENDPOINT)
        .send({ ...VALID_PAYLOAD, password: 'short' });
      expect(res.body.errors).toBeDefined();
      expect(typeof res.body.errors.password).toBe('string');
    });
  });

  describe('validation: missing fullName field', () => {
    it('returns HTTP 400', async () => {
      const app = makeApp(db);
      const { fullName: _omit, ...payload } = VALID_PAYLOAD;
      void _omit;
      const res = await request(app).post(ENDPOINT).send(payload);
      expect(res.status).toBe(400);
    });

    it('returns an errors object with a "fullName" key', async () => {
      const app = makeApp(db);
      const { fullName: _omit, ...payload } = VALID_PAYLOAD;
      void _omit;
      const res = await request(app).post(ENDPOINT).send(payload);
      expect(res.body.errors).toBeDefined();
      expect(typeof res.body.errors.fullName).toBe('string');
    });
  });

  describe('validation: missing email field', () => {
    it('returns HTTP 400', async () => {
      const app = makeApp(db);
      const { email: _omit, ...payload } = VALID_PAYLOAD;
      void _omit;
      const res = await request(app).post(ENDPOINT).send(payload);
      expect(res.status).toBe(400);
    });

    it('returns an errors object with an "email" key', async () => {
      const app = makeApp(db);
      const { email: _omit, ...payload } = VALID_PAYLOAD;
      void _omit;
      const res = await request(app).post(ENDPOINT).send(payload);
      expect(res.body.errors).toBeDefined();
      expect(typeof res.body.errors.email).toBe('string');
    });
  });

  describe('validation: missing password field', () => {
    it('returns HTTP 400', async () => {
      const app = makeApp(db);
      const { password: _omit, ...payload } = VALID_PAYLOAD;
      void _omit;
      const res = await request(app).post(ENDPOINT).send(payload);
      expect(res.status).toBe(400);
    });

    it('returns an errors object with a "password" key', async () => {
      const app = makeApp(db);
      const { password: _omit, ...payload } = VALID_PAYLOAD;
      void _omit;
      const res = await request(app).post(ENDPOINT).send(payload);
      expect(res.body.errors).toBeDefined();
      expect(typeof res.body.errors.password).toBe('string');
    });
  });
});
