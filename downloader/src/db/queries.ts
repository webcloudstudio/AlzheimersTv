import { getDb } from './connection.js';
import type { Show, StreamingAvailabilityRow, FeaturedShow } from '../types.js';

// ─── Shows ────────────────────────────────────────────────────────────────────

export function upsertShowMinimal(row: {
  tmdb_id: number;
  title: string;
  original_title?: string;
  show_type: 'movie' | 'series';
}): void {
  const db = getDb();
  db.prepare(`
    INSERT OR IGNORE INTO shows (tmdb_id, title, original_title, show_type)
    VALUES (@tmdb_id, @title, @original_title, @show_type)
  `).run(row);
}

export function batchInsertShows(rows: Array<{
  tmdb_id: number;
  title: string;
  original_title?: string;
  show_type: 'movie' | 'series';
}>): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO shows (tmdb_id, title, original_title, show_type)
    VALUES (@tmdb_id, @title, @original_title, @show_type)
  `);
  const insert = db.transaction((items: typeof rows) => {
    for (const item of items) stmt.run(item);
  });
  insert(rows);
}

export function getShowByTmdbId(tmdb_id: number): Show | undefined {
  return getDb().prepare('SELECT * FROM shows WHERE tmdb_id = ?').get(tmdb_id) as Show | undefined;
}

export function getShowByImdbId(imdb_id: string): Show | undefined {
  return getDb().prepare('SELECT * FROM shows WHERE imdb_id = ?').get(imdb_id) as Show | undefined;
}

export function getShowByTitleAndYear(title: string, year: number): Show | undefined {
  return getDb().prepare(
    'SELECT * FROM shows WHERE LOWER(title) = LOWER(?) AND release_year = ?'
  ).get(title, year) as Show | undefined;
}

export function updateShowMetadata(show: Partial<Show> & { tmdb_id: number }): void {
  const db = getDb();
  db.prepare(`
    UPDATE shows SET
      imdb_id         = COALESCE(@imdb_id, imdb_id),
      title           = COALESCE(@title, title),
      original_title  = COALESCE(@original_title, original_title),
      release_year    = COALESCE(@release_year, release_year),
      runtime_minutes = COALESCE(@runtime_minutes, runtime_minutes),
      season_count    = COALESCE(@season_count, season_count),
      overview        = COALESCE(@overview, overview),
      rating          = COALESCE(@rating, rating),
      genres          = COALESCE(@genres, genres),
      image_url       = COALESCE(@image_url, image_url),
      tmdb_fetched_at = @tmdb_fetched_at,
      updated_at      = datetime('now')
    WHERE tmdb_id = @tmdb_id
  `).run(show);
}

export function setFeatured(tmdb_id: number): void {
  getDb().prepare(`
    UPDATE shows SET is_featured = 1, updated_at = datetime('now') WHERE tmdb_id = ?
  `).run(tmdb_id);
}

export function insertShowIfMissing(show: Omit<Show, 'id' | 'created_at' | 'updated_at'>): number {
  const db = getDb();
  const result = db.prepare(`
    INSERT OR IGNORE INTO shows
      (tmdb_id, imdb_id, title, original_title, show_type, release_year, runtime_minutes,
       season_count, overview, rating, genres, image_url, youtube_url, is_featured, tmdb_fetched_at)
    VALUES
      (@tmdb_id, @imdb_id, @title, @original_title, @show_type, @release_year, @runtime_minutes,
       @season_count, @overview, @rating, @genres, @image_url, @youtube_url, @is_featured, @tmdb_fetched_at)
  `).run(show);
  if (result.changes > 0) return Number(result.lastInsertRowid);
  const existing = db.prepare('SELECT id FROM shows WHERE tmdb_id = ?').get(show.tmdb_id) as { id: number } | undefined;
  return existing?.id ?? 0;
}

// All featured shows missing metadata — no limit, must fill every one
export function getAllFeaturedShowsNeedingEnrichment(): Show[] {
  return getDb().prepare(`
    SELECT s.* FROM shows s
    JOIN featured_shows fs ON fs.show_id = s.id
    WHERE s.tmdb_fetched_at IS NULL
    ORDER BY fs.priority ASC
  `).all() as Show[];
}

// Featured shows whose metadata is older than staleAfterDays — refresh oldest first
export function getStaleFeaturedShows(staleAfterDays: number, limit: number): Show[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - staleAfterDays);
  return getDb().prepare(`
    SELECT s.* FROM shows s
    JOIN featured_shows fs ON fs.show_id = s.id
    WHERE s.tmdb_fetched_at IS NOT NULL AND s.tmdb_fetched_at < ?
    ORDER BY s.tmdb_fetched_at ASC
    LIMIT ?
  `).all(cutoff.toISOString(), limit) as Show[];
}

export function getFeaturedShowsForEnrichment(limit = 50): Show[] {
  return getDb().prepare(`
    SELECT s.* FROM shows s
    JOIN featured_shows fs ON fs.show_id = s.id
    WHERE s.tmdb_fetched_at IS NULL
    ORDER BY fs.priority ASC
    LIMIT ?
  `).all(limit) as Show[];
}

export function getCatalogShowsForEnrichment(limit = 500): Show[] {
  return getDb().prepare(`
    SELECT * FROM shows
    WHERE tmdb_fetched_at IS NULL AND is_featured = 0
    LIMIT ?
  `).all(limit) as Show[];
}

export function getFeaturedShowsForProviders(limit = 100): Show[] {
  return getDb().prepare(`
    SELECT s.* FROM shows s
    JOIN featured_shows fs ON fs.show_id = s.id
    WHERE s.tmdb_fetched_at IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM streaming_availability sa
        WHERE sa.show_id = s.id AND sa.source = 'tmdb_providers'
      )
    ORDER BY fs.priority ASC
    LIMIT ?
  `).all(limit) as Show[];
}

// ─── Featured shows ───────────────────────────────────────────────────────────

export function upsertFeaturedShow(fs: Partial<FeaturedShow> & { show_id: number }): void {
  getDb().prepare(`
    INSERT INTO featured_shows (show_id, priority, curator_notes, seniority_score, url_enrich_status)
    VALUES (@show_id, @priority, @curator_notes, @seniority_score, @url_enrich_status)
    ON CONFLICT(show_id) DO UPDATE SET
      priority         = excluded.priority,
      url_enrich_status = excluded.url_enrich_status,
      curator_notes    = COALESCE(excluded.curator_notes, featured_shows.curator_notes)
  `).run({
    show_id: fs.show_id,
    priority: fs.priority ?? 3,
    curator_notes: fs.curator_notes ?? null,
    seniority_score: fs.seniority_score ?? null,
    url_enrich_status: fs.url_enrich_status ?? 'pending',
  });
}

export function getFeaturedShowsForUrlEnrich(limit = 10): Array<Show & { watchmode_id: number | null; url_enrich_status: string }> {
  return getDb().prepare(`
    SELECT s.*, fs.watchmode_id, fs.url_enrich_status FROM shows s
    JOIN featured_shows fs ON fs.show_id = s.id
    WHERE fs.url_enrich_status IN ('pending','partial')
    ORDER BY fs.priority ASC
    LIMIT ?
  `).all(limit) as Array<Show & { watchmode_id: number | null; url_enrich_status: string }>;
}

export function updateFeaturedEnrichStatus(
  show_id: number,
  status: 'pending' | 'partial' | 'complete' | 'failed',
  watchmode_id?: number
): void {
  getDb().prepare(`
    UPDATE featured_shows SET
      url_enrich_status = ?,
      watchmode_id      = COALESCE(?, watchmode_id),
      last_enrich_at    = datetime('now')
    WHERE show_id = ?
  `).run(status, watchmode_id ?? null, show_id);
}

// ─── Streaming availability ───────────────────────────────────────────────────

export function upsertStreamingAvailability(row: Omit<StreamingAvailabilityRow, 'id' | 'fetched_at'>): void {
  getDb().prepare(`
    INSERT INTO streaming_availability
      (show_id, service_id, access_type, stream_url, price, source)
    VALUES
      (@show_id, @service_id, @access_type, @stream_url, @price, @source)
    ON CONFLICT(show_id, service_id, access_type) DO UPDATE SET
      stream_url = COALESCE(excluded.stream_url, streaming_availability.stream_url),
      price      = COALESCE(excluded.price, streaming_availability.price),
      source     = excluded.source,
      fetched_at = datetime('now')
  `).run({ ...row, price: row.price ?? null });
}

export function updateStreamUrl(show_id: number, service_id: string, access_type: string, url: string, source: string): void {
  getDb().prepare(`
    UPDATE streaming_availability SET
      stream_url = ?,
      source     = ?,
      fetched_at = datetime('now')
    WHERE show_id = ? AND service_id = ? AND access_type = ?
  `).run(url, source, show_id, service_id, access_type);
}

export function updateUrlVerification(id: number, status: number): void {
  getDb().prepare(`
    UPDATE streaming_availability SET
      stream_url_status      = ?,
      stream_url_verified_at = datetime('now')
    WHERE id = ?
  `).run(status, id);
}

export function getUrlsToVerify(limit = 200): Array<StreamingAvailabilityRow & { id: number }> {
  const db = getDb();
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  return db.prepare(`
    SELECT sa.* FROM streaming_availability sa
    JOIN services sv ON sv.id = sa.service_id
    WHERE sa.stream_url IS NOT NULL
      AND sa.stream_url_status != 404
      AND (
        sa.stream_url_verified_at IS NULL
        OR (sv.is_free = 0 AND sa.stream_url_verified_at < ?)
        OR (sv.is_free = 1 AND sa.stream_url_verified_at < ?)
      )
    LIMIT ?
  `).all(thirtyDaysAgo, sevenDaysAgo, limit) as Array<StreamingAvailabilityRow & { id: number }>;
}

export function getStreamingForShow(show_id: number): StreamingAvailabilityRow[] {
  return getDb().prepare(
    'SELECT * FROM streaming_availability WHERE show_id = ?'
  ).all(show_id) as StreamingAvailabilityRow[];
}

// ─── Quota tracking ───────────────────────────────────────────────────────────

export function logApiCall(source: string, endpoint?: string, show_id?: number, success = 1): void {
  getDb().prepare(`
    INSERT INTO api_quota_log (source, endpoint, show_id, success)
    VALUES (?, ?, ?, ?)
  `).run(source, endpoint ?? null, show_id ?? null, success);
}

export function countApiCalls(source: string, since: string): number {
  const row = getDb().prepare(`
    SELECT COUNT(*) AS cnt FROM api_quota_log
    WHERE source = ? AND called_at >= ? AND success = 1
  `).get(source, since) as { cnt: number };
  return row.cnt;
}

// ─── HTML query ───────────────────────────────────────────────────────────────

export function getFeaturedShowsForHtml(): unknown[] {
  return getDb().prepare(`
    SELECT s.*, fs.curator_notes, fs.seniority_score,
      json_group_array(
        json_object(
          'service', sa.service_id,
          'url', sa.stream_url,
          'status', sa.stream_url_status,
          'access', sa.access_type,
          'price', sa.price,
          'name', sv.display_name,
          'color', sv.color_hex,
          'base', sv.base_url
        )
      ) FILTER (WHERE sa.service_id IS NOT NULL AND (sa.stream_url_status IS NULL OR sa.stream_url_status != 404)) AS services
    FROM shows s
    JOIN featured_shows fs ON fs.show_id = s.id
    LEFT JOIN streaming_availability sa ON sa.show_id = s.id
    LEFT JOIN services sv ON sv.id = sa.service_id
    WHERE s.is_featured = 1
    GROUP BY s.id
    ORDER BY s.rating DESC
  `).all();
}
