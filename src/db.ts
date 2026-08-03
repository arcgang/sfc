import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const DB_PATH = process.env['DB_PATH'] ?? path.join(process.cwd(), 'data', 'sfc.db');

function openDatabase(dbPath: string): Database.Database {
  if (dbPath !== ':memory:') {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  }
  const db = new Database(dbPath);
  db.pragma('foreign_keys = ON');
  return db;
}

function runMigrations(db: Database.Database): void {
  const migrationsDir = path.join(process.cwd(), 'migrations');
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    db.exec(sql);
  }
}

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    _db = openDatabase(DB_PATH);
    runMigrations(_db);
  }
  return _db;
}

export function createTestDb(): Database.Database {
  const db = openDatabase(':memory:');
  runMigrations(db);
  return db;
}

export { openDatabase, runMigrations };
