import request from 'supertest';
import { createTestDb } from '../src/db';
import type Database from 'better-sqlite3';
import type { Application } from 'express';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';

const ENDPOINT = '/api/v1/profile';

let db: Database.Database;
let app: Application;
let userId: string;
let validToken: string;

const JWT_SECRET = 'test-secret-for-unit-tests';

function seedUser(testDb: Database.Database): { userId: string; profileId: string } {
  const uid = randomUUID();
  const pid = randomUUID();
  testDb
    .prepare('INSERT INTO users (id, email, full_name, password_hash) VALUES (?, ?, ?, ?)')
    .run(uid, `user-${uid}@example.com`, 'Original Name', 'hash');
  testDb
    .prepare("INSERT INTO profiles (id, user_id, persona_mode) VALUES (?, ?, 'default')")
    .run(pid, uid);
  return { userId: uid, profileId: pid };
}

beforeEach(() => {
  db = createTestDb();
  jest.resetModules();
  jest.mock('../src/db', () => ({
    ...jest.requireActual('../src/db'),
    getDb: () => db,
  }));
  app = (require('../src/app') as { app: Application }).app;
  const seeded = seedUser(db);
  userId = seeded.userId;
  validToken = jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: '1h' });
});

afterEach(() => {
  db.close();
});

const VALID_BODY = {
  fullName: 'Sarah Chen',
  dateOfBirth: '1991-06-18',
  personaMode: 'fitness',
  wellnessPreferences: {
    focusAreas: ['steps', 'sleep'],
    targetSteps: 10000,
  },
  privacy: {
    policyAccepted: true,
    dataExportRequested: false,
    dataDeletionRequested: false,
  },
};

describe('PUT /api/v1/profile', () => {
  describe('authentication', () => {
    it('returns HTTP 401 when Authorization header is absent', async () => {
      const res = await request(app).put(ENDPOINT).send(VALID_BODY);
      expect(res.status).toBe(401);
    });

    it('returns HTTP 401 when bearer token is invalid/malformed', async () => {
      const res = await request(app)
        .put(ENDPOINT)
        .set('Authorization', 'Bearer not.a.valid.token')
        .send(VALID_BODY);
      expect(res.status).toBe(401);
    });
  });

  describe('happy path: valid update with personaMode "fitness"', () => {
    it('returns HTTP 200', async () => {
      const res = await request(app)
        .put(ENDPOINT)
        .set('Authorization', `Bearer ${validToken}`)
        .send(VALID_BODY);
      expect(res.status).toBe(200);
    });

    it('returns the updated profile with fullName "Sarah Chen"', async () => {
      const res = await request(app)
        .put(ENDPOINT)
        .set('Authorization', `Bearer ${validToken}`)
        .send(VALID_BODY);
      expect(res.body.data.profile.fullName).toBe('Sarah Chen');
    });

    it('returns the updated profile with personaMode "fitness"', async () => {
      const res = await request(app)
        .put(ENDPOINT)
        .set('Authorization', `Bearer ${validToken}`)
        .send(VALID_BODY);
      expect(res.body.data.profile.personaMode).toBe('fitness');
    });

    it('returns the userId in the profile response', async () => {
      const res = await request(app)
        .put(ENDPOINT)
        .set('Authorization', `Bearer ${validToken}`)
        .send(VALID_BODY);
      expect(res.body.data.profile.userId).toBe(userId);
    });

    it('persists the updated personaMode "fitness" in the database', async () => {
      await request(app)
        .put(ENDPOINT)
        .set('Authorization', `Bearer ${validToken}`)
        .send(VALID_BODY);
      const row = db
        .prepare('SELECT persona_mode FROM profiles WHERE user_id = ?')
        .get(userId) as { persona_mode: string } | undefined;
      expect(row!.persona_mode).toBe('fitness');
    });

    it('persists the updated fullName "Sarah Chen" in the users table', async () => {
      await request(app)
        .put(ENDPOINT)
        .set('Authorization', `Bearer ${validToken}`)
        .send(VALID_BODY);
      const row = db
        .prepare('SELECT full_name FROM users WHERE id = ?')
        .get(userId) as { full_name: string } | undefined;
      expect(row!.full_name).toBe('Sarah Chen');
    });

    it('persists focusAreas ["steps","sleep"] in the profiles table', async () => {
      await request(app)
        .put(ENDPOINT)
        .set('Authorization', `Bearer ${validToken}`)
        .send(VALID_BODY);
      const row = db
        .prepare('SELECT focus_areas_json FROM profiles WHERE user_id = ?')
        .get(userId) as { focus_areas_json: string } | undefined;
      expect(JSON.parse(row!.focus_areas_json)).toEqual(['steps', 'sleep']);
    });

    it('persists privacy policyAccepted=true in the profiles table', async () => {
      await request(app)
        .put(ENDPOINT)
        .set('Authorization', `Bearer ${validToken}`)
        .send(VALID_BODY);
      const row = db
        .prepare('SELECT privacy_policy_accepted FROM profiles WHERE user_id = ?')
        .get(userId) as { privacy_policy_accepted: number } | undefined;
      expect(row!.privacy_policy_accepted).toBe(1);
    });

    it('reflects wellnessPreferences in the response body', async () => {
      const res = await request(app)
        .put(ENDPOINT)
        .set('Authorization', `Bearer ${validToken}`)
        .send(VALID_BODY);
      expect(res.body.data.profile.wellnessPreferences.focusAreas).toEqual(['steps', 'sleep']);
      expect(res.body.data.profile.wellnessPreferences.targetSteps).toBe(10000);
    });

    it('reflects privacy flags in the response body', async () => {
      const res = await request(app)
        .put(ENDPOINT)
        .set('Authorization', `Bearer ${validToken}`)
        .send(VALID_BODY);
      expect(res.body.data.profile.privacy.policyAccepted).toBe(true);
      expect(res.body.data.profile.privacy.dataExportRequested).toBe(false);
      expect(res.body.data.profile.privacy.dataDeletionRequested).toBe(false);
    });

    it('includes meta.correlationId and meta.timestamp in the response', async () => {
      const res = await request(app)
        .put(ENDPOINT)
        .set('Authorization', `Bearer ${validToken}`)
        .send(VALID_BODY);
      expect(typeof res.body.meta.correlationId).toBe('string');
      expect(res.body.meta.correlationId.length).toBeGreaterThan(0);
      expect(typeof res.body.meta.timestamp).toBe('string');
    });
  });

  describe('persona mode: updating to "default" from "fitness"', () => {
    it('persists personaMode "default" after a subsequent update', async () => {
      await request(app)
        .put(ENDPOINT)
        .set('Authorization', `Bearer ${validToken}`)
        .send(VALID_BODY);
      await request(app)
        .put(ENDPOINT)
        .set('Authorization', `Bearer ${validToken}`)
        .send({ ...VALID_BODY, personaMode: 'default' });
      const row = db
        .prepare('SELECT persona_mode FROM profiles WHERE user_id = ?')
        .get(userId) as { persona_mode: string } | undefined;
      expect(row!.persona_mode).toBe('default');
    });
  });

  describe('persona mode: all four valid values accepted', () => {
    for (const mode of ['default', 'fitness', 'elder_friendly', 'chronic_care_aware']) {
      it(`returns HTTP 200 for personaMode "${mode}"`, async () => {
        const res = await request(app)
          .put(ENDPOINT)
          .set('Authorization', `Bearer ${validToken}`)
          .send({ ...VALID_BODY, personaMode: mode });
        expect(res.status).toBe(200);
      });
    }
  });

  describe('validation: invalid personaMode "active_mode"', () => {
    it('returns HTTP 422', async () => {
      const res = await request(app)
        .put(ENDPOINT)
        .set('Authorization', `Bearer ${validToken}`)
        .send({ ...VALID_BODY, personaMode: 'active_mode' });
      expect(res.status).toBe(422);
    });

    it('returns error type REQUEST_VALIDATION_FAILED', async () => {
      const res = await request(app)
        .put(ENDPOINT)
        .set('Authorization', `Bearer ${validToken}`)
        .send({ ...VALID_BODY, personaMode: 'active_mode' });
      expect(res.body.error.type).toBe('REQUEST_VALIDATION_FAILED');
    });

    it('returns an error detail with code INVALID_ENUM and field "personaMode"', async () => {
      const res = await request(app)
        .put(ENDPOINT)
        .set('Authorization', `Bearer ${validToken}`)
        .send({ ...VALID_BODY, personaMode: 'active_mode' });
      const detail = (res.body.error.details as Array<{ code: string; field: string }>).find(
        (d) => d.field === 'personaMode',
      );
      expect(detail).toBeDefined();
      expect(detail!.code).toBe('INVALID_ENUM');
    });
  });

  describe('validation: missing fullName field', () => {
    it('returns HTTP 422', async () => {
      const { fullName: _omit, ...body } = VALID_BODY;
      void _omit;
      const res = await request(app)
        .put(ENDPOINT)
        .set('Authorization', `Bearer ${validToken}`)
        .send(body);
      expect(res.status).toBe(422);
    });

    it('returns error detail with field "fullName"', async () => {
      const { fullName: _omit, ...body } = VALID_BODY;
      void _omit;
      const res = await request(app)
        .put(ENDPOINT)
        .set('Authorization', `Bearer ${validToken}`)
        .send(body);
      const detail = (res.body.error.details as Array<{ field: string }>).find(
        (d) => d.field === 'fullName',
      );
      expect(detail).toBeDefined();
    });
  });

  describe('validation: fullName shorter than 2 characters', () => {
    it('returns HTTP 422', async () => {
      const res = await request(app)
        .put(ENDPOINT)
        .set('Authorization', `Bearer ${validToken}`)
        .send({ ...VALID_BODY, fullName: 'X' });
      expect(res.status).toBe(422);
    });
  });

  describe('validation: missing privacy field', () => {
    it('returns HTTP 422', async () => {
      const { privacy: _omit, ...body } = VALID_BODY;
      void _omit;
      const res = await request(app)
        .put(ENDPOINT)
        .set('Authorization', `Bearer ${validToken}`)
        .send(body);
      expect(res.status).toBe(422);
    });
  });

  describe('validation: missing personaMode field', () => {
    it('returns HTTP 422', async () => {
      const { personaMode: _omit, ...body } = VALID_BODY;
      void _omit;
      const res = await request(app)
        .put(ENDPOINT)
        .set('Authorization', `Bearer ${validToken}`)
        .send(body);
      expect(res.status).toBe(422);
    });
  });

  describe('validation: targetSteps below minimum of 1000', () => {
    it('returns HTTP 422', async () => {
      const res = await request(app)
        .put(ENDPOINT)
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          ...VALID_BODY,
          wellnessPreferences: { ...VALID_BODY.wellnessPreferences, targetSteps: 500 },
        });
      expect(res.status).toBe(422);
    });
  });

  describe('validation: targetSteps above maximum of 50000', () => {
    it('returns HTTP 422', async () => {
      const res = await request(app)
        .put(ENDPOINT)
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          ...VALID_BODY,
          wellnessPreferences: { ...VALID_BODY.wellnessPreferences, targetSteps: 60000 },
        });
      expect(res.status).toBe(422);
    });
  });

  describe('optional fields: omitting dateOfBirth and wellnessPreferences', () => {
    it('returns HTTP 200 when dateOfBirth and wellnessPreferences are absent', async () => {
      const { dateOfBirth: _d, wellnessPreferences: _w, ...body } = VALID_BODY;
      void _d;
      void _w;
      const res = await request(app)
        .put(ENDPOINT)
        .set('Authorization', `Bearer ${validToken}`)
        .send(body);
      expect(res.status).toBe(200);
    });
  });
});
