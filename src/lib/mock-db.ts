import 'server-only';

import initSqlJs, { type Database as SqlJsDatabase, type BindParams } from 'sql.js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const DB_PATH = resolve(process.cwd(), 'src/lib/mock-data/mock.db');

const DDL = `
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

  CREATE TABLE IF NOT EXISTS workspace_state (
    sid TEXT NOT NULL,
    workspace_id TEXT NOT NULL,
    data TEXT NOT NULL DEFAULT '{"entityList":[],"relationshipList":[]}',
    PRIMARY KEY (sid, workspace_id)
  );
`;

/** Persist the in-memory database to disk */
function saveToDisk(db: SqlJsDatabase): void {
  writeFileSync(DB_PATH, Buffer.from(db.export()));
}

/** Wrapper around a sql.js prepared statement that mimics better-sqlite3 API */
class StatementWrapper {
  constructor(
    private sqlJsDb: SqlJsDatabase,
    private sql: string,
    private isInTransaction: () => boolean
  ) {}

  /** Return all matching rows as an array of objects */
  all(...params: unknown[]): unknown[] {
    const stmt = this.sqlJsDb.prepare(this.sql);
    try {
      if (params.length > 0) {
        stmt.bind(params as BindParams);
      }
      const rows: unknown[] = [];
      while (stmt.step()) {
        rows.push(stmt.getAsObject());
      }
      return rows;
    } finally {
      stmt.free();
    }
  }

  /** Return the first matching row as an object, or undefined */
  get(...params: unknown[]): unknown {
    const stmt = this.sqlJsDb.prepare(this.sql);
    try {
      if (params.length > 0) {
        stmt.bind(params as BindParams);
      }
      return stmt.step() ? stmt.getAsObject() : undefined;
    } finally {
      stmt.free();
    }
  }

  /** Execute a statement without returning rows */
  run(...params: unknown[]): void {
    this.sqlJsDb.run(this.sql, params as BindParams);
    if (!this.isInTransaction()) {
      saveToDisk(this.sqlJsDb);
    }
  }
}

/** Wrapper around sql.js Database that mimics better-sqlite3 API */
class DatabaseWrapper {
  private _inTransaction = false;

  constructor(private sqlJsDb: SqlJsDatabase) {}

  /** Return a StatementWrapper */
  prepare(sql: string): StatementWrapper {
    return new StatementWrapper(this.sqlJsDb, sql, () => this._inTransaction);
  }

  /** Execute raw SQL */
  exec(sql: string): void {
    this.sqlJsDb.run(sql);
  }

  /** Wrap a function in a transaction */
  transaction<T>(fn: () => T): () => T {
    return () => {
      this.sqlJsDb.run('BEGIN');
      this._inTransaction = true;
      try {
        const result = fn();
        this.sqlJsDb.run('COMMIT');
        this._inTransaction = false;
        saveToDisk(this.sqlJsDb);
        return result;
      } catch (err) {
        this._inTransaction = false;
        this.sqlJsDb.run('ROLLBACK');
        throw err;
      }
    };
  }
}

// Use globalThis to persist the wrapper across Turbopack module instances in dev mode
declare global {
  var mockDb: DatabaseWrapper | null;
}
global.mockDb = global.mockDb || null;

/** Initialize sql.js and load the database. Call once at server startup. */
export async function initMockDb(): Promise<void> {
  if (global.mockDb) return;

  const SQL = await initSqlJs();

  const sqlJsDb = existsSync(DB_PATH) ? new SQL.Database(readFileSync(DB_PATH)) : new SQL.Database();

  const dbWrapper = new DatabaseWrapper(sqlJsDb);
  dbWrapper.exec(DDL);
  global.mockDb = dbWrapper;
}

/** Get the database wrapper. Must call initMockDb() first. */
export function getDb(): DatabaseWrapper {
  if (!global.mockDb) {
    throw new Error('Mock database not initialized. Call initMockDb() first.');
  }
  return global.mockDb;
}
