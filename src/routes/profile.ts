import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { getDb } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const profileRouter = Router();

const VALID_PERSONA_MODES = ['default', 'fitness', 'elder_friendly', 'chronic_care_aware'] as const;
type PersonaMode = (typeof VALID_PERSONA_MODES)[number];

interface WellnessPreferences {
  focusAreas?: unknown;
  targetSteps?: unknown;
}

interface PrivacyBody {
  policyAccepted?: unknown;
  dataExportRequested?: unknown;
  dataDeletionRequested?: unknown;
}

interface ProfileBody {
  fullName?: unknown;
  dateOfBirth?: unknown;
  personaMode?: unknown;
  wellnessPreferences?: unknown;
  privacy?: unknown;
}

interface ValidationDetail {
  code: string;
  message: string;
  field: string;
}

function validateProfile(body: ProfileBody): ValidationDetail[] {
  const details: ValidationDetail[] = [];

  if (typeof body.fullName !== 'string' || body.fullName.trim().length < 2) {
    details.push({
      code: 'REQUIRED_FIELD',
      message: 'fullName must be at least 2 characters.',
      field: 'fullName',
    });
  }

  if (body.personaMode === undefined || body.personaMode === null) {
    details.push({
      code: 'REQUIRED_FIELD',
      message: 'personaMode is required.',
      field: 'personaMode',
    });
  } else if (!VALID_PERSONA_MODES.includes(body.personaMode as PersonaMode)) {
    details.push({
      code: 'INVALID_ENUM',
      message: `personaMode must be one of ${VALID_PERSONA_MODES.join(', ')}`,
      field: 'personaMode',
    });
  }

  if (body.privacy === undefined || body.privacy === null || typeof body.privacy !== 'object') {
    details.push({
      code: 'REQUIRED_FIELD',
      message: 'privacy is required.',
      field: 'privacy',
    });
  }

  const prefs = body.wellnessPreferences as WellnessPreferences | undefined;
  if (prefs !== undefined && prefs !== null) {
    const steps = prefs.targetSteps;
    if (steps !== undefined && steps !== null) {
      if (typeof steps !== 'number' || steps < 1000 || steps > 50000) {
        details.push({
          code: 'OUT_OF_RANGE',
          message: 'targetSteps must be between 1000 and 50000.',
          field: 'wellnessPreferences.targetSteps',
        });
      }
    }
  }

  return details;
}

profileRouter.put('/', requireAuth, async (req: Request, res: Response) => {
  const userId = (req as Request & { userId: string }).userId;
  const body = req.body as ProfileBody;

  const details = validateProfile(body);
  if (details.length > 0) {
    res.status(422).json({
      meta: { correlationId: randomUUID(), timestamp: new Date().toISOString() },
      error: { type: 'REQUEST_VALIDATION_FAILED', details },
    });
    return;
  }

  const fullName = (body.fullName as string).trim();
  const personaMode = body.personaMode as PersonaMode;
  const dateOfBirth = typeof body.dateOfBirth === 'string' ? body.dateOfBirth : null;
  const prefs = body.wellnessPreferences as WellnessPreferences | undefined;
  const focusAreas: string[] =
    prefs && Array.isArray(prefs.focusAreas) ? (prefs.focusAreas as string[]) : [];
  const targetSteps: number | null =
    prefs && typeof prefs.targetSteps === 'number' ? prefs.targetSteps : null;
  const privacy = body.privacy as PrivacyBody;
  const policyAccepted = privacy.policyAccepted === true ? 1 : 0;
  const dataExportRequested = privacy.dataExportRequested === true ? 1 : 0;
  const dataDeletionRequested = privacy.dataDeletionRequested === true ? 1 : 0;

  const db = getDb();

  db.prepare('UPDATE users SET full_name = ? WHERE id = ?').run(fullName, userId);

  db.prepare(
    `UPDATE profiles SET
      persona_mode = ?,
      date_of_birth = ?,
      focus_areas_json = ?,
      target_steps = ?,
      privacy_policy_accepted = ?,
      data_export_requested = ?,
      data_deletion_requested = ?,
      updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
    WHERE user_id = ?`,
  ).run(
    personaMode,
    dateOfBirth,
    JSON.stringify(focusAreas),
    targetSteps,
    policyAccepted,
    dataExportRequested,
    dataDeletionRequested,
    userId,
  );

  const correlationId = randomUUID();
  res.status(200).json({
    meta: { correlationId, timestamp: new Date().toISOString() },
    data: {
      profile: {
        userId,
        fullName,
        personaMode,
        wellnessPreferences: {
          focusAreas,
          ...(targetSteps !== null ? { targetSteps } : {}),
        },
        privacy: {
          policyAccepted: policyAccepted === 1,
          dataExportRequested: dataExportRequested === 1,
          dataDeletionRequested: dataDeletionRequested === 1,
        },
      },
    },
  });
});

export { profileRouter };
