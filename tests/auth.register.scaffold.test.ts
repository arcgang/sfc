import request from 'supertest';
import { createTestDb } from '../src/db';
import type { RegisterRequest, AuthSuccessResponse } from '../src/routes/auth';
import type Database from 'better-sqlite3';
import type { Application } from 'express';

const ENDPOINT = '/api/v1/auth/session';

// Compile-time surface check: both types must be exported from auth.ts.
// Any removal or rename causes a compile failure here.
const registerPayload: RegisterRequest = {
  mode: 'register',
  email: 'newuser@example.com',
  password: 'StrongPass!23',
  fullName: 'New User',
};
const _successShape: AuthSuccessResponse = { token: 'test-jwt', userId: 'test-uuid' };
void _successShape;

let db: Database.Database;
let app: Application;

beforeEach(() => {
  db = createTestDb();
  jest.resetModules();
  jest.mock('../src/db', () => ({
    ...jest.requireActual('../src/db'),
    getDb: () => db,
  }));
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  app = (require('../src/app') as { app: Application }).app;
});

afterEach(() => {
  db.close();
});

describe('POST /api/v1/auth/session — register scaffold', () => {
  describe('smoke test — route existence', () => {
    it('responds to POST /api/v1/auth/session with a non-404 status confirming the route is registered', async () => {
      const res = await request(app).post(ENDPOINT).send({ mode: 'register' });
      expect(res.status).not.toBe(404);
    });
  });

  describe('given mode="register" with email "newuser@example.com", password "StrongPass!23", fullName "New User"', () => {
    it('returns HTTP 201 on successful registration', async () => {
      const res = await request(app).post(ENDPOINT).send(registerPayload);
      expect(res.status).toBe(201);
    });
  });
});
