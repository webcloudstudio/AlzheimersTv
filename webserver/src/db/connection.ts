import Database from 'better-sqlite3';
import { resolve } from 'path';

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;

  // __dirname = webserver/dist/db/ at runtime
  // resolve up 3 levels to AlzheimersTv/, then into downloader/
  const dbPath = resolve(__dirname, '../../../downloader/alzheimerstv.db');

  try {
    _db = new Database(dbPath, { readonly: true });
    _db.pragma('journal_mode = WAL'); // safe on readonly; enables WAL reader
    return _db;
  } catch (err) {
    throw new Error(
      `Cannot open database at ${dbPath}.\n` +
      `Run "npm run pipeline" in the downloader/ directory first.\n` +
      `Original error: ${err}`
    );
  }
}

export function closeDb(): void {
  _db?.close();
  _db = null;
}
