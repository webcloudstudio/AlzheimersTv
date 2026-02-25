import Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import type { Config } from '../types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

let _db: Database.Database | null = null;

function getConfigPath(): string {
  return resolve(__dirname, '../../config.json');
}

export function getConfig(): Config {
  const raw = readFileSync(getConfigPath(), 'utf-8');
  return JSON.parse(raw) as Config;
}

export function getDb(): Database.Database {
  if (_db) return _db;
  const cfg = getConfig();
  const dbPath = resolve(__dirname, '../../', cfg.dbPath);
  _db = new Database(dbPath);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');
  return _db;
}

export function closeDb(): void {
  if (_db) {
    _db.close();
    _db = null;
  }
}
