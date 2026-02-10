import 'server-only';

import Database from 'better-sqlite3';
import { resolve } from 'path';

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;

  const dbPath = resolve(process.cwd(), 'src/lib/mock-data/mock.db');
  db = new Database(dbPath);

  // Enable WAL mode for better read performance
  db.pragma('journal_mode = WAL');

  // Create tables if they don't exist (safety net)
  db.exec(`
    CREATE TABLE IF NOT EXISTS entity (
      id TEXT PRIMARY KEY,
      label_normalized TEXT NOT NULL,
      type TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS relationship (
      relationship_id TEXT PRIMARY KEY,
      predicate TEXT NOT NULL,
      source_entity_id TEXT NOT NULL,
      related_entity_id TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_entity_type ON entity(type);
    CREATE INDEX IF NOT EXISTS idx_entity_label ON entity(label_normalized COLLATE NOCASE);
    CREATE INDEX IF NOT EXISTS idx_rel_source ON relationship(source_entity_id);
    CREATE INDEX IF NOT EXISTS idx_rel_related ON relationship(related_entity_id);
    CREATE INDEX IF NOT EXISTS idx_rel_predicate ON relationship(predicate);

    CREATE TABLE IF NOT EXISTS workspace_entity (
      sid TEXT NOT NULL,
      workspace_id TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      label_normalized TEXT NOT NULL,
      type TEXT NOT NULL,
      PRIMARY KEY (sid, workspace_id, entity_id)
    );
    CREATE TABLE IF NOT EXISTS workspace_relationship (
      sid TEXT NOT NULL,
      workspace_id TEXT NOT NULL,
      relationship_id TEXT NOT NULL,
      predicate TEXT NOT NULL,
      source_entity_id TEXT NOT NULL,
      related_entity_id TEXT NOT NULL,
      PRIMARY KEY (sid, workspace_id, relationship_id)
    );
    CREATE INDEX IF NOT EXISTS idx_ws_entity_lookup ON workspace_entity(sid, workspace_id);
    CREATE INDEX IF NOT EXISTS idx_ws_rel_lookup ON workspace_relationship(sid, workspace_id);
  `);

  return db;
}
