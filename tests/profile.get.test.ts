import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createTestDb } from '../src/db';
import type Database from 'better-sqlite3';
import { randomUUID } from 'crypto';

const ENDPOINT = '/api/profile';
const JWT_SECRET = 'test-secret-for-unit-tests';

let db: Database.Database;

function makeApp(testDb: Database.Database) {
  jest.resetModules();
  jest.mock('../src/db', () => ({
    ...jest.requireActual('../src/db'),
    getDb: () => testDb,
  }));
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { app } = require('../src/app') as { app: import('express').Application };
  return app;
}

function seedUser(testDb: Database.Database, personaMode = 'default') {
  const userId = randomUUID();
  const profileId = randomUUID();
  testDb
    .prepare(
      'INSERT INTO users (id, email, full_name, password_hash) VALUES (?, ?, ?, ?)',
    )
    .run(userId, `user-${userId}@example.com`, 'Test User', 'hash');
  testDb
    .prepare(
      'INSERT INTO profiles (id, user_id, persona_mode) VALUES (?, ?, ?)',
    )
    .run(profileId, userId, personaMode);
  return userId;
}

beforeEach(() => {
  db = createTestDb();
});

afterEach(() => {
  db.close();
});

describe('GET /api/profile', () => {
  describe('authentication guard', () => {
    it('returns HTTP 401 when no Authorization header is provided', async () => {
      const app = makeApp(db);
      const res = await request(app).get(ENDPOINT);
      expect(res.status).toBe(401);
    });

    it('returns HTTP 401 when the Authorization header value is "Bearer invalid.token.here"', async () => {
      const app = makeApp(db);
      const res = await request(app)
        .get(ENDPOINT)
        .set('Authorization', 'Bearer invalid.token.here');
      expect(res.status).toBe(401);
    });

    it('returns HTTP 401 when the Authorization header is present but missing the Bearer prefix', async () => {
      const app = makeApp(db);
      const userId = seedUser(db);
      const token = jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: '1h' });
      const res = await request(app)
        .get(ENDPOINT)
        .set('Authorization', token);
      expect(res.status).toBe(401);
    });
  });

  describe('happy path: valid JWT with existing profile', () => {
    it('returns HTTP 200 for a user whose profile has persona_mode="default"', async () => {
      const app = makeApp(db);
      const userId = seedUser(db, 'default');
      const token = jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: '1h' });
      const res = await request(app)
        .get(ENDPOINT)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });

    it('returns { dashboardMode: "default" } for a user whose profile has persona_mode="default"', async () => {
      const app = makeApp(db);
      const userId = seedUser(db, 'default');
      const token = jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: '1h' });
      const res = await request(app)
        .get(ENDPOINT)
        .set('Authorization', `Bearer ${token}`);
      expect(res.body.dashboardMode).toBe('default');
    });

    it('returns { dashboardMode: "fitness" } for a user whose profile has persona_mode="fitness"', async () => {
      const app = makeApp(db);
      const userId = seedUser(db, 'fitness');
      const token = jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: '1h' });
      const res = await request(app)
        .get(ENDPOINT)
        .set('Authorization', `Bearer ${token}`);
      expect(res.body.dashboardMode).toBe('fitness');
    });

    it('returns { dashboardMode: "wellness" } for a user whose profile has persona_mode="wellness"', async () => {
      const app = makeApp(db);
      const userId = seedUser(db, 'wellness');
      const token = jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: '1h' });
      const res = await request(app)
        .get(ENDPOINT)
        .set('Authorization', `Bearer ${token}`);
      expect(res.body.dashboardMode).toBe('wellness');
    });
  });
});
