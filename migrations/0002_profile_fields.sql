ALTER TABLE profiles ADD COLUMN date_of_birth TEXT;
ALTER TABLE profiles ADD COLUMN focus_areas_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE profiles ADD COLUMN target_steps INTEGER;
ALTER TABLE profiles ADD COLUMN privacy_policy_accepted INTEGER NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN data_export_requested INTEGER NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN data_deletion_requested INTEGER NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'));
