import { getDb } from './connection.js';
import type { Service } from '../types.js';

// ─── DDL ─────────────────────────────────────────────────────────────────────

export const DDL = `
CREATE TABLE IF NOT EXISTS shows (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  tmdb_id         INTEGER UNIQUE NOT NULL,
  imdb_id         TEXT UNIQUE,
  title           TEXT NOT NULL,
  original_title  TEXT,
  show_type       TEXT NOT NULL CHECK(show_type IN ('movie','series')),
  release_year    INTEGER,
  runtime_minutes INTEGER,
  season_count    INTEGER,
  overview        TEXT,
  rating          REAL,
  genres          TEXT,
  image_url       TEXT,
  youtube_url     TEXT,
  is_featured     INTEGER NOT NULL DEFAULT 0,
  tmdb_fetched_at TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_shows_tmdb     ON shows(tmdb_id);
CREATE INDEX IF NOT EXISTS idx_shows_imdb     ON shows(imdb_id);
CREATE INDEX IF NOT EXISTS idx_shows_featured ON shows(is_featured);
CREATE INDEX IF NOT EXISTS idx_shows_type     ON shows(show_type);
CREATE INDEX IF NOT EXISTS idx_shows_year     ON shows(release_year);

CREATE TABLE IF NOT EXISTS services (
  id           TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  is_free      INTEGER DEFAULT 0,
  color_hex    TEXT,
  base_url     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS streaming_availability (
  id                     INTEGER PRIMARY KEY AUTOINCREMENT,
  show_id                INTEGER NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
  service_id             TEXT NOT NULL REFERENCES services(id),
  access_type            TEXT NOT NULL CHECK(access_type IN ('subscription','free','rent','buy')),
  stream_url             TEXT,
  stream_url_verified_at TEXT,
  stream_url_status      INTEGER,
  source                 TEXT NOT NULL
    CHECK(source IN ('tmdb_providers','watchmode','motn','manual')),
  fetched_at             TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(show_id, service_id, access_type)
);
CREATE INDEX IF NOT EXISTS idx_sa_show    ON streaming_availability(show_id);
CREATE INDEX IF NOT EXISTS idx_sa_service ON streaming_availability(service_id);
CREATE INDEX IF NOT EXISTS idx_sa_verify  ON streaming_availability(stream_url_verified_at);

CREATE TABLE IF NOT EXISTS featured_shows (
  show_id            INTEGER PRIMARY KEY REFERENCES shows(id) ON DELETE CASCADE,
  priority           INTEGER DEFAULT 5,
  curator_notes      TEXT,
  content_warnings   TEXT,
  seniority_score    REAL,
  url_enrich_status  TEXT DEFAULT 'pending'
    CHECK(url_enrich_status IN ('pending','partial','complete','failed')),
  watchmode_id       INTEGER,
  last_enrich_at     TEXT,
  curated_at         TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_fs_priority ON featured_shows(priority, url_enrich_status);

CREATE TABLE IF NOT EXISTS api_quota_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  source      TEXT NOT NULL,
  endpoint    TEXT,
  show_id     INTEGER REFERENCES shows(id),
  success     INTEGER NOT NULL DEFAULT 1,
  called_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_quota ON api_quota_log(source, called_at);
`;

// ─── Seed data ────────────────────────────────────────────────────────────────

const SERVICES: Service[] = [
  { id: 'netflix',   display_name: 'Netflix',          is_free: 0, color_hex: '#E50914', base_url: 'https://www.netflix.com' },
  { id: 'prime',     display_name: 'Prime Video',      is_free: 0, color_hex: '#00A8E1', base_url: 'https://www.amazon.com/primevideo' },
  { id: 'hulu',      display_name: 'Hulu',             is_free: 0, color_hex: '#1CE783', base_url: 'https://www.hulu.com' },
  { id: 'disney',    display_name: 'Disney+',          is_free: 0, color_hex: '#113CCF', base_url: 'https://www.disneyplus.com' },
  { id: 'max',       display_name: 'Max',              is_free: 0, color_hex: '#002BE7', base_url: 'https://www.max.com' },
  { id: 'appletv',   display_name: 'Apple TV+',        is_free: 0, color_hex: '#000000', base_url: 'https://tv.apple.com' },
  { id: 'paramount', display_name: 'Paramount+',       is_free: 0, color_hex: '#0064FF', base_url: 'https://www.paramountplus.com' },
  { id: 'peacock',   display_name: 'Peacock',          is_free: 0, color_hex: '#F47522', base_url: 'https://www.peacocktv.com' },
  { id: 'amc',       display_name: 'AMC+',             is_free: 0, color_hex: '#00AEEF', base_url: 'https://www.amcplus.com' },
  { id: 'britbox',   display_name: 'BritBox',          is_free: 0, color_hex: '#0F62AC', base_url: 'https://www.britbox.com' },
  { id: 'criterion', display_name: 'Criterion Channel',is_free: 0, color_hex: '#000000', base_url: 'https://www.criterionchannel.com' },
  { id: 'tubi',      display_name: 'Tubi',             is_free: 1, color_hex: '#FA5141', base_url: 'https://tubitv.com' },
  { id: 'pluto',     display_name: 'Pluto TV',         is_free: 1, color_hex: '#FFC619', base_url: 'https://pluto.tv' },
  { id: 'roku',      display_name: 'Roku Channel',     is_free: 1, color_hex: '#6C1D8E', base_url: 'https://therokuchannel.roku.com' },
  { id: 'freevee',   display_name: 'Amazon Freevee',   is_free: 1, color_hex: '#00A8E1', base_url: 'https://www.amazon.com/adlp/freevee' },
  { id: 'youtube',   display_name: 'YouTube',          is_free: 1, color_hex: '#FF0000', base_url: 'https://www.youtube.com' },
];

// ─── TMDB provider_id → our service_id ───────────────────────────────────────

export const TMDB_PROVIDER_MAP: Record<number, string> = {
  8:    'netflix',
  9:    'prime',
  15:   'hulu',
  337:  'disney',
  1899: 'max',
  350:  'appletv',
  531:  'paramount',
  386:  'peacock',
  526:  'amc',
  151:  'britbox',
  258:  'criterion',
  73:   'tubi',
  300:  'pluto',
  207:  'roku',
  613:  'freevee',
};

// ─── Public init ──────────────────────────────────────────────────────────────

export function initSchema(): void {
  const db = getDb();

  db.exec(DDL);

  // Migration: add price column if this is an existing DB without it
  try { db.exec('ALTER TABLE streaming_availability ADD COLUMN price REAL'); } catch { /* already exists */ }

  const insertService = db.prepare(`
    INSERT OR IGNORE INTO services (id, display_name, is_free, color_hex, base_url)
    VALUES (@id, @display_name, @is_free, @color_hex, @base_url)
  `);

  const seedServices = db.transaction(() => {
    for (const svc of SERVICES) {
      insertService.run(svc);
    }
  });

  seedServices();
  console.log('Schema initialized and services seeded.');
}
