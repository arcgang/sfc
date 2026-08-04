-- Extend users: add columns missing from the initial migration
ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN account_status TEXT NOT NULL DEFAULT 'active' CHECK (account_status IN ('active', 'locked', 'pending_verification'));
ALTER TABLE users ADD COLUMN updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'));
ALTER TABLE users ADD COLUMN last_login_at TEXT;

-- Extend profiles: add columns missing from the initial migration
ALTER TABLE profiles ADD COLUMN date_of_birth TEXT;
ALTER TABLE profiles ADD COLUMN focus_areas_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE profiles ADD COLUMN target_steps INTEGER;
ALTER TABLE profiles ADD COLUMN privacy_policy_accepted INTEGER NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN data_export_requested INTEGER NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN data_deletion_requested INTEGER NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'));

-- Extend engagement_events: add columns missing from the initial migration
ALTER TABLE engagement_events ADD COLUMN event_date TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d', 'now'));
ALTER TABLE engagement_events ADD COLUMN event_timestamp TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'));
ALTER TABLE engagement_events ADD COLUMN event_context_json TEXT NOT NULL DEFAULT '{}';

-- device_connections
CREATE TABLE IF NOT EXISTS device_connections (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    device_type TEXT NOT NULL CHECK (device_type IN ('smartwatch', 'smart_scale')),
    provider_name TEXT NOT NULL,
    provider_account_ref TEXT,
    connection_status TEXT NOT NULL CHECK (connection_status IN ('connected', 'disconnected', 'error')),
    last_sync_at TEXT,
    last_successful_sync_at TEXT,
    stale_after_hours INTEGER NOT NULL DEFAULT 18,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (user_id, device_type),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- sync_runs
CREATE TABLE IF NOT EXISTS sync_runs (
    id TEXT PRIMARY KEY,
    device_connection_id TEXT NOT NULL,
    sync_started_at TEXT NOT NULL,
    sync_completed_at TEXT,
    sync_status TEXT NOT NULL CHECK (sync_status IN ('started', 'succeeded', 'failed', 'partial_discard')),
    records_processed INTEGER NOT NULL DEFAULT 0,
    partial_session_discarded INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    FOREIGN KEY (device_connection_id) REFERENCES device_connections(id)
);

-- health_records
CREATE TABLE IF NOT EXISTS health_records (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    device_connection_id TEXT,
    metric_domain TEXT NOT NULL CHECK (metric_domain IN ('vitals', 'activity', 'sleep', 'body_composition')),
    metric_type TEXT NOT NULL,
    metric_value REAL NOT NULL,
    metric_unit TEXT NOT NULL,
    measurement_at TEXT NOT NULL,
    measurement_session_id TEXT,
    source_type TEXT NOT NULL CHECK (source_type IN ('smartwatch', 'smart_scale', 'user_input')),
    source_payload_hash TEXT,
    trace_source_ref TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (device_connection_id) REFERENCES device_connections(id)
);

-- goals
CREATE TABLE IF NOT EXISTS goals (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    goal_type TEXT NOT NULL CHECK (goal_type IN ('steps_daily', 'sleep_minutes_daily', 'weight_target', 'active_minutes_weekly')),
    target_value REAL NOT NULL,
    target_unit TEXT NOT NULL,
    cadence TEXT NOT NULL CHECK (cadence IN ('daily', 'weekly')),
    start_date TEXT NOT NULL,
    end_date TEXT,
    status TEXT NOT NULL CHECK (status IN ('active', 'on_track', 'behind', 'completed', 'archived')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- alerts
CREATE TABLE IF NOT EXISTS alerts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    goal_id TEXT,
    source_health_record_id TEXT,
    category TEXT NOT NULL CHECK (category IN ('stale_data', 'abnormal_reading', 'goal_risk', 'sync_failure')),
    priority TEXT NOT NULL CHECK (priority IN ('high', 'medium', 'low')),
    message TEXT NOT NULL,
    recommended_action TEXT NOT NULL,
    acknowledged INTEGER NOT NULL DEFAULT 0,
    acknowledged_at TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (goal_id) REFERENCES goals(id),
    FOREIGN KEY (source_health_record_id) REFERENCES health_records(id)
);

-- insights
CREATE TABLE IF NOT EXISTS insights (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    goal_id TEXT,
    insight_type TEXT NOT NULL CHECK (insight_type IN ('trend_summary', 'recommendation', 'nudge')),
    generated_from_window_start TEXT NOT NULL,
    generated_from_window_end TEXT NOT NULL,
    message TEXT NOT NULL,
    generator_name TEXT NOT NULL CHECK (generator_name IN ('Recommendation Engine', 'AI Wellness Coach Deferred Reference')),
    user_data_only INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (goal_id) REFERENCES goals(id)
);

-- partner_services
CREATE TABLE IF NOT EXISTS partner_services (
    id TEXT PRIMARY KEY,
    partner_name TEXT NOT NULL,
    service_name TEXT NOT NULL,
    service_category TEXT NOT NULL,
    marketplace_status TEXT NOT NULL CHECK (marketplace_status IN ('deferred', 'future_ready')),
    premium_required INTEGER NOT NULL DEFAULT 0,
    revenue_model_ref TEXT,
    created_at TEXT NOT NULL
);

-- privacy_requests
CREATE TABLE IF NOT EXISTS privacy_requests (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    request_type TEXT NOT NULL CHECK (request_type IN ('export', 'delete')),
    request_status TEXT NOT NULL CHECK (request_status IN ('requested', 'processing', 'completed', 'rejected')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- LLD indexes
CREATE INDEX IF NOT EXISTS idx_health_records_user_domain_time ON health_records(user_id, metric_domain, measurement_at DESC);
CREATE INDEX IF NOT EXISTS idx_device_connections_user_type ON device_connections(user_id, device_type);
CREATE INDEX IF NOT EXISTS idx_alerts_user_priority_ack ON alerts(user_id, priority, acknowledged, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_goals_user_status ON goals(user_id, status);
CREATE INDEX IF NOT EXISTS idx_insights_user_created ON insights(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_engagement_events_user_date ON engagement_events(user_id, event_date DESC);
CREATE INDEX IF NOT EXISTS idx_sync_runs_connection_started ON sync_runs(device_connection_id, sync_started_at DESC)
