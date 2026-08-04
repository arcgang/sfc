import { createTestDb, runMigrations } from '../src/db';
import type Database from 'better-sqlite3';

let db: Database.Database;

beforeEach(() => {
  db = createTestDb();
});

afterEach(() => {
  db.close();
});

function tableExists(db: Database.Database, name: string): boolean {
  return (
    db
      .prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?")
      .get(name) !== undefined
  );
}

function indexExists(db: Database.Database, name: string): boolean {
  return (
    db
      .prepare("SELECT 1 FROM sqlite_master WHERE type='index' AND name=?")
      .get(name) !== undefined
  );
}

function columnNames(db: Database.Database, table: string): string[] {
  return (db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>).map(
    (r) => r.name,
  );
}

// ── tables ────────────────────────────────────────────────────────────────────

describe('all LLD tables exist', () => {
  const TABLES = [
    'users',
    'profiles',
    'device_connections',
    'sync_runs',
    'health_records',
    'goals',
    'alerts',
    'insights',
    'engagement_events',
    'partner_services',
    'privacy_requests',
  ];

  for (const t of TABLES) {
    it(`table "${t}" exists`, () => {
      expect(tableExists(db, t)).toBe(true);
    });
  }
});

// ── indexes ───────────────────────────────────────────────────────────────────

describe('all LLD indexes exist', () => {
  const INDEXES = [
    'idx_health_records_user_domain_time',
    'idx_device_connections_user_type',
    'idx_alerts_user_priority_ack',
    'idx_goals_user_status',
    'idx_insights_user_created',
    'idx_engagement_events_user_date',
    'idx_sync_runs_connection_started',
  ];

  for (const idx of INDEXES) {
    it(`index "${idx}" exists`, () => {
      expect(indexExists(db, idx)).toBe(true);
    });
  }
});

// ── column presence ───────────────────────────────────────────────────────────

describe('users table has all LLD columns', () => {
  const COLS = [
    'id', 'email', 'password_hash', 'full_name',
    'email_verified', 'account_status', 'created_at', 'updated_at', 'last_login_at',
  ];
  for (const c of COLS) {
    it(`users.${c}`, () => expect(columnNames(db, 'users')).toContain(c));
  }
});

describe('profiles table has all LLD columns', () => {
  const COLS = [
    'id', 'user_id', 'date_of_birth', 'persona_mode',
    'focus_areas_json', 'target_steps',
    'privacy_policy_accepted', 'data_export_requested', 'data_deletion_requested',
    'created_at', 'updated_at',
  ];
  for (const c of COLS) {
    it(`profiles.${c}`, () => expect(columnNames(db, 'profiles')).toContain(c));
  }
});

describe('engagement_events table has all LLD columns', () => {
  const COLS = ['id', 'user_id', 'event_type', 'event_date', 'event_timestamp', 'event_context_json'];
  for (const c of COLS) {
    it(`engagement_events.${c}`, () => expect(columnNames(db, 'engagement_events')).toContain(c));
  }
});

// ── CHECK constraints on new tables ──────────────────────────────────────────

describe('CHECK constraints enforced', () => {
  // SQLite evaluates CHECK constraints before FK constraints, so no user row needed.

  it('device_connections.device_type rejects "phone"', () => {
    expect(() =>
      db
        .prepare(
          `INSERT INTO device_connections
           (id, user_id, device_type, provider_name, connection_status, stale_after_hours, created_at, updated_at)
           VALUES ('dc1','u1','phone','p','connected',18,'2026-01-01T00:00:00Z','2026-01-01T00:00:00Z')`,
        )
        .run(),
    ).toThrow();
  });

  it('device_connections.connection_status rejects "pending"', () => {
    expect(() =>
      db
        .prepare(
          `INSERT INTO device_connections
           (id, user_id, device_type, provider_name, connection_status, stale_after_hours, created_at, updated_at)
           VALUES ('dc1','u1','smartwatch','p','pending',18,'2026-01-01T00:00:00Z','2026-01-01T00:00:00Z')`,
        )
        .run(),
    ).toThrow();
  });

  it('goals.goal_type rejects "calories_daily"', () => {
    expect(() =>
      db
        .prepare(
          `INSERT INTO goals
           (id, user_id, goal_type, target_value, target_unit, cadence, start_date, status, created_at, updated_at)
           VALUES ('g1','u1','calories_daily',2000,'kcal','daily','2026-01-01','active','2026-01-01T00:00:00Z','2026-01-01T00:00:00Z')`,
        )
        .run(),
    ).toThrow();
  });

  it('goals.cadence rejects "monthly"', () => {
    expect(() =>
      db
        .prepare(
          `INSERT INTO goals
           (id, user_id, goal_type, target_value, target_unit, cadence, start_date, status, created_at, updated_at)
           VALUES ('g1','u1','steps_daily',10000,'steps','monthly','2026-01-01','active','2026-01-01T00:00:00Z','2026-01-01T00:00:00Z')`,
        )
        .run(),
    ).toThrow();
  });

  it('goals.status rejects "paused"', () => {
    expect(() =>
      db
        .prepare(
          `INSERT INTO goals
           (id, user_id, goal_type, target_value, target_unit, cadence, start_date, status, created_at, updated_at)
           VALUES ('g1','u1','steps_daily',10000,'steps','daily','2026-01-01','paused','2026-01-01T00:00:00Z','2026-01-01T00:00:00Z')`,
        )
        .run(),
    ).toThrow();
  });

  it('alerts.priority rejects "critical"', () => {
    expect(() =>
      db
        .prepare(
          `INSERT INTO alerts
           (id, user_id, category, priority, message, recommended_action, created_at)
           VALUES ('a1','u1','stale_data','critical','msg','action','2026-01-01T00:00:00Z')`,
        )
        .run(),
    ).toThrow();
  });

  it('alerts.category rejects "info"', () => {
    expect(() =>
      db
        .prepare(
          `INSERT INTO alerts
           (id, user_id, category, priority, message, recommended_action, created_at)
           VALUES ('a1','u1','info','medium','msg','action','2026-01-01T00:00:00Z')`,
        )
        .run(),
    ).toThrow();
  });

  it('insights.generator_name rejects "third_party"', () => {
    expect(() =>
      db
        .prepare(
          `INSERT INTO insights
           (id, user_id, insight_type, generated_from_window_start, generated_from_window_end, message, generator_name, created_at)
           VALUES ('i1','u1','trend_summary','2026-01-01T00:00:00Z','2026-01-07T00:00:00Z','msg','third_party','2026-01-01T00:00:00Z')`,
        )
        .run(),
    ).toThrow();
  });

  it('partner_services.marketplace_status rejects "active"', () => {
    expect(() =>
      db
        .prepare(
          `INSERT INTO partner_services
           (id, partner_name, service_name, service_category, marketplace_status, created_at)
           VALUES ('ps1','p','s','fitness','active','2026-01-01T00:00:00Z')`,
        )
        .run(),
    ).toThrow();
  });

  it('health_records.metric_domain rejects "nutrition"', () => {
    expect(() =>
      db
        .prepare(
          `INSERT INTO health_records
           (id, user_id, metric_domain, metric_type, metric_value, metric_unit, measurement_at, source_type, created_at)
           VALUES ('hr1','u1','nutrition','calories',2000,'kcal','2026-01-01T00:00:00Z','smartwatch','2026-01-01T00:00:00Z')`,
        )
        .run(),
    ).toThrow();
  });

  it('sync_runs.sync_status rejects "queued"', () => {
    expect(() =>
      db
        .prepare(
          `INSERT INTO sync_runs
           (id, device_connection_id, sync_started_at, sync_status)
           VALUES ('sr1','dc1','2026-01-01T00:00:00Z','queued')`,
        )
        .run(),
    ).toThrow();
  });

  it('privacy_requests.request_type rejects "update"', () => {
    expect(() =>
      db
        .prepare(
          `INSERT INTO privacy_requests
           (id, user_id, request_type, request_status, created_at, updated_at)
           VALUES ('pr1','u1','update','requested','2026-01-01T00:00:00Z','2026-01-01T00:00:00Z')`,
        )
        .run(),
    ).toThrow();
  });
});

// ── UNIQUE constraints ────────────────────────────────────────────────────────

describe('UNIQUE constraints enforced', () => {
  it('device_connections(user_id, device_type) is unique', () => {
    // Insert a real user first so the FK constraint does not interfere.
    db.prepare(
      `INSERT INTO users (id, email, full_name, password_hash) VALUES ('u1','a@b.com','A B','hash')`,
    ).run();
    const insert = db.prepare(
      `INSERT INTO device_connections
       (id, user_id, device_type, provider_name, connection_status, stale_after_hours, created_at, updated_at)
       VALUES (?, 'u1', 'smartwatch', 'p', 'connected', 18, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')`,
    );
    insert.run('dc1');
    expect(() => insert.run('dc2')).toThrow();
  });
});

// ── partner_services deferred insert ─────────────────────────────────────────

describe('partner_services deferred rows', () => {
  it('inserts and queries a row with marketplace_status="deferred"', () => {
    db.prepare(
      `INSERT INTO partner_services
       (id, partner_name, service_name, service_category, marketplace_status, created_at)
       VALUES ('ps1','FitPartner','Yoga Classes','wellness','deferred','2026-01-01T00:00:00Z')`,
    ).run();
    const row = db.prepare('SELECT * FROM partner_services WHERE id=?').get('ps1') as
      | { marketplace_status: string; partner_name: string }
      | undefined;
    expect(row).toBeDefined();
    expect(row!.marketplace_status).toBe('deferred');
    expect(row!.partner_name).toBe('FitPartner');
  });

  it('inserts a row with marketplace_status="future_ready"', () => {
    db.prepare(
      `INSERT INTO partner_services
       (id, partner_name, service_name, service_category, marketplace_status, created_at)
       VALUES ('ps2','HealthCo','Sleep Coaching','wellness','future_ready','2026-01-01T00:00:00Z')`,
    ).run();
    const row = db.prepare('SELECT marketplace_status FROM partner_services WHERE id=?').get('ps2') as
      | { marketplace_status: string }
      | undefined;
    expect(row!.marketplace_status).toBe('future_ready');
  });
});

// ── migration idempotency ─────────────────────────────────────────────────────

describe('migration idempotency', () => {
  it('calling runMigrations a second time on the same database does not throw', () => {
    expect(() => runMigrations(db)).not.toThrow();
  });

  it('running runMigrations twice leaves exactly one "users" table', () => {
    runMigrations(db);
    const cnt = (
      db
        .prepare(
          "SELECT COUNT(*) as cnt FROM sqlite_master WHERE type='table' AND name='users'",
        )
        .get() as { cnt: number }
    ).cnt;
    expect(cnt).toBe(1);
  });

  it('running runMigrations twice leaves existing rows intact', () => {
    db.prepare(
      `INSERT INTO users (id, email, full_name, password_hash) VALUES ('u1','a@b.com','A B','hash')`,
    ).run();
    runMigrations(db);
    const row = db.prepare('SELECT id FROM users WHERE id=?').get('u1');
    expect(row).toBeDefined();
  });
});
