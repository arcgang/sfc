import request from 'supertest';
import { app } from '../src/app';
import type { RegisterRequest, AuthSuccessResponse } from '../src/routes/auth';

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

describe('POST /api/v1/auth/session — register scaffold', () => {
  describe('smoke test — route existence', () => {
    it('responds to POST /api/v1/auth/session with a non-404 status confirming the route is registered', async () => {
      const res = await request(app).post(ENDPOINT).send({ mode: 'register' });
      expect(res.status).not.toBe(404);
    });
  });

  describe('given mode="register" with email "newuser@example.com", password "StrongPass!23", fullName "New User"', () => {
    it('returns HTTP 501 (stub — not yet implemented)', async () => {
      const res = await request(app).post(ENDPOINT).send(registerPayload);
      expect(res.status).toBe(501);
    });
  });
});
