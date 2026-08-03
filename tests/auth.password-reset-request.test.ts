import request from 'supertest';
import { app } from '../src/app';

const ENDPOINT = '/api/v1/auth/session';

describe('POST /api/v1/auth/session mode=password_reset_request', () => {
  describe('given email "user@example.com"', () => {
    it('returns HTTP 200', async () => {
      const res = await request(app)
        .post(ENDPOINT)
        .send({ mode: 'password_reset_request', email: 'user@example.com' });
      expect(res.status).toBe(200);
    });

    it('returns the generic confirmation message "If an account with that email exists, a reset link has been sent."', async () => {
      const res = await request(app)
        .post(ENDPOINT)
        .send({ mode: 'password_reset_request', email: 'user@example.com' });
      expect(res.body).toEqual({
        message: 'If an account with that email exists, a reset link has been sent.',
      });
    });

    it('emits console log event auth.password_reset_requested', async () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
      await request(app)
        .post(ENDPOINT)
        .send({ mode: 'password_reset_request', email: 'user@example.com' });
      expect(logSpy).toHaveBeenCalledWith(
        JSON.stringify({ event: 'auth.password_reset_requested' }),
      );
      logSpy.mockRestore();
    });
  });

  describe('given email "ghost@nowhere.invalid" (non-existent account)', () => {
    it('returns the same generic confirmation message "If an account with that email exists, a reset link has been sent."', async () => {
      const res = await request(app)
        .post(ENDPOINT)
        .send({ mode: 'password_reset_request', email: 'ghost@nowhere.invalid' });
      expect(res.body).toEqual({
        message: 'If an account with that email exists, a reset link has been sent.',
      });
    });

    it('returns HTTP 200 (does not reveal non-existence via status code)', async () => {
      const res = await request(app)
        .post(ENDPOINT)
        .send({ mode: 'password_reset_request', email: 'ghost@nowhere.invalid' });
      expect(res.status).toBe(200);
    });
  });

  describe('given an invalid email format ""', () => {
    it('returns HTTP 400', async () => {
      const res = await request(app)
        .post(ENDPOINT)
        .send({ mode: 'password_reset_request', email: '' });
      expect(res.status).toBe(400);
    });
  });

  describe('given an invalid email format "not-an-email"', () => {
    it('returns HTTP 400', async () => {
      const res = await request(app)
        .post(ENDPOINT)
        .send({ mode: 'password_reset_request', email: 'not-an-email' });
      expect(res.status).toBe(400);
    });
  });

  describe('given a missing email field', () => {
    it('returns HTTP 400', async () => {
      const res = await request(app)
        .post(ENDPOINT)
        .send({ mode: 'password_reset_request' });
      expect(res.status).toBe(400);
    });
  });

  describe('setup — application health check', () => {
    it('responds to an unrelated route with HTTP 404, confirming the HTTP server is running', async () => {
      const res = await request(app).get('/healthz');
      expect(res.status).toBe(404);
    });
  });
});
