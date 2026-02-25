import { getDb } from './connection';
import type { ApiShow, ApiService, ApiServiceBadge, RawShowRow } from '../types';

// ─── Shows ────────────────────────────────────────────────────────────────────

export function getAllFeaturedShows(): ApiShow[] {
  const rows = getDb().prepare(`
    SELECT
      s.id, s.tmdb_id, s.title, s.show_type, s.release_year,
      s.runtime_minutes, s.season_count, s.overview, s.rating,
      s.genres, s.image_url, s.youtube_url,
      json_group_array(
        json_object(
          'service_id',        sa.service_id,
          'display_name',      sv.display_name,
          'access_type',       sa.access_type,
          'stream_url',        sa.stream_url,
          'stream_url_status', sa.stream_url_status,
          'price',             sa.price,
          'color_hex',         sv.color_hex,
          'base_url',          sv.base_url,
          'is_free',           sv.is_free
        )
      ) FILTER (
        WHERE sa.service_id IS NOT NULL
          AND (sa.stream_url_status IS NULL OR sa.stream_url_status != 404)
      ) AS services_json
    FROM shows s
    JOIN featured_shows fs ON fs.show_id = s.id
    LEFT JOIN streaming_availability sa ON sa.show_id = s.id
    LEFT JOIN services sv ON sv.id = sa.service_id
    WHERE s.is_featured = 1
    GROUP BY s.id
    ORDER BY s.rating DESC NULLS LAST
  `).all() as RawShowRow[];

  return rows.map(row => {
    // Parse genres JSON → string[]
    let genres: string[] = [];
    try {
      const parsed = JSON.parse(row.genres ?? '[]');
      if (Array.isArray(parsed)) genres = parsed;
    } catch { /* leave empty */ }

    // Parse and deduplicate services
    let services: ApiServiceBadge[] = [];
    try {
      const parsed: ApiServiceBadge[] = JSON.parse(row.services_json ?? '[]');
      const seen = new Set<string>();
      for (const badge of parsed) {
        if (!badge?.service_id) continue;
        const key = `${badge.service_id}|${badge.access_type}`;
        if (seen.has(key)) continue;
        seen.add(key);
        services.push(badge);
      }
    } catch { /* leave empty */ }

    return {
      id: row.id,
      tmdb_id: row.tmdb_id,
      title: row.title,
      show_type: row.show_type as 'movie' | 'series',
      release_year: row.release_year,
      runtime_minutes: row.runtime_minutes,
      season_count: row.season_count,
      overview: row.overview,
      rating: row.rating,
      genres,
      image_url: row.image_url,
      youtube_url: row.youtube_url,
      services,
    };
  });
}

export function getShowCount(): number {
  const row = getDb().prepare(
    'SELECT COUNT(*) AS cnt FROM featured_shows'
  ).get() as { cnt: number };
  return row.cnt;
}

// ─── Services ─────────────────────────────────────────────────────────────────

export function getAllServices(): ApiService[] {
  return getDb().prepare(`
    SELECT id, display_name, is_free, color_hex, base_url
    FROM services
    ORDER BY is_free ASC, display_name ASC
  `).all() as ApiService[];
}
