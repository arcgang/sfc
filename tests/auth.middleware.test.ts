import request from 'supertest';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { createTestDb } from '../src/db';
import type Database from 'better-sqlite3';
import type { Application } from 'express';

const SECRET = process.env['JWT_SECRET'] as string;

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

describe('Auth middleware — protected endpoints return 401 AUTH_TOKEN_INVALID', () => {
  describe('GET /api/v1/profile without Authorization header', () => {
    it('returns HTTP 401', async () => {
      const res = await request(app).get('/api/v1/profile');
      expect(res.status).toBe(401);
    });

    it('returns error.type "AUTH_TOKEN_INVALID"', async () => {
      const res = await request(app).get('/api/v1/profile');
      expect(res.body.error.type).toBe('AUTH_TOKEN_INVALID');
    });

    it('response contains meta.correlationId and meta.timestamp', async () => {
      const res = await request(app).get('/api/v1/profile');
      expect(typeof res.body.meta.correlationId).toBe('string');
      expect(typeof res.body.meta.timestamp).toBe('string');
    });
  });

  describe('GET /api/v1/profile with malformed token "Bearer not.a.real.token"', () => {
    it('returns HTTP 401', async () => {
      const res = await request(app)
        .get('/api/v1/profile')
        .set('Authorization', 'Bearer not.a.real.token');
      expect(res.status).toBe(401);
    });

    it('returns error.type "AUTH_TOKEN_INVALID"', async () => {
      const res = await request(app)
        .get('/api/v1/profile')
        .set('Authorization', 'Bearer not.a.real.token');
      expect(res.body.error.type).toBe('AUTH_TOKEN_INVALID');
    });
  });

  describe('GET /api/v1/profile with an expired token', () => {
    it('returns HTTP 401', async () => {
      const expiredToken = jwt.sign({ sub: randomUUID() }, SECRET, { expiresIn: -1 });
      const res = await request(app)
        .get('/api/v1/profile')
        .set('Authorization', `Bearer ${expiredToken}`);
      expect(res.status).toBe(401);
    });

    it('returns error.type "AUTH_TOKEN_INVALID"', async () => {
      const expiredToken = jwt.sign({ sub: randomUUID() }, SECRET, { expiresIn: -1 });
      const res = await request(app)
        .get('/api/v1/profile')
        .set('Authorization', `Bearer ${expiredToken}`);
      expect(res.body.error.type).toBe('AUTH_TOKEN_INVALID');
    });
  });
});
