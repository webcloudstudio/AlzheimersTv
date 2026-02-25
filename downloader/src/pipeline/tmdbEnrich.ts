/**
 * Phase A2 — TMDB Metadata Enrichment
 *
 * Pass 1 (priority): Every featured show with no metadata is fetched first.
 *   No limit — all curated titles MUST have data before anything else.
 *
 * Pass 2 (refresh): Featured shows whose metadata is older than STALE_DAYS are
 *   refreshed in oldest-first order, up to STALE_BATCH per run.
 *
 * TMDB has no monthly cap; only rate-limiting matters (~40 req/sec).
 * TV shows cost 2 API calls each (main + external_ids).
 */
import { getConfig } from '../db/connection.js';
import {
  getAllFeaturedShowsNeedingEnrichment,
  getStaleFeaturedShows,
  updateShowMetadata,
  logApiCall,
} from '../db/queries.js';
import type { Show, TmdbMovieResponse, TmdbTvResponse } from '../types.js';

const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMG_BASE = 'https://image.tmdb.org/t/p/w500';
const MS_PER_REQUEST = 25; // ~40 req/sec sustained
const STALE_DAYS = 30;     // refresh metadata older than this
const STALE_BATCH = 50;    // max stale shows to refresh per run

function sleep(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms));
}

async function fetchTmdb<T>(path: string, apiKey: string): Promise<T | null> {
  const url = `${TMDB_BASE}${path}?api_key=${apiKey}`;
  try {
    const resp = await fetch(url);
    if (!resp.ok) {
      if (resp.status === 404) return null;
      if (resp.status === 429) {
        console.warn('  TMDB rate limit hit — waiting 5s...');
        await sleep(5000);
        return null;
      }
      throw new Error(`TMDB ${path} returned ${resp.status}`);
    }
    return resp.json() as Promise<T>;
  } catch (err) {
    console.error(`  TMDB fetch error for ${path}:`, err);
    return null;
  }
}

async function enrichMovie(show: Show, apiKey: string): Promise<boolean> {
  const data = await fetchTmdb<TmdbMovieResponse>(`/movie/${show.tmdb_id}`, apiKey);
  logApiCall('tmdb', `/movie/${show.tmdb_id}`, show.id, data ? 1 : 0);
  if (!data) return false;

  updateShowMetadata({
    tmdb_id: show.tmdb_id,
    imdb_id: data.imdb_id || null,
    title: data.title || show.title,
    original_title: data.original_title || null,
    release_year: data.release_date ? parseInt(data.release_date.slice(0, 4), 10) : null,
    runtime_minutes: data.runtime || null,
    season_count: null, // movies don't have seasons; COALESCE preserves existing value
    overview: data.overview || null,
    rating: data.vote_average || null,
    genres: data.genres ? JSON.stringify(data.genres.map(g => g.name)) : null,
    image_url: data.poster_path ? `${TMDB_IMG_BASE}${data.poster_path}` : null,
    tmdb_fetched_at: new Date().toISOString(),
  });
  return true;
}

async function enrichTv(show: Show, apiKey: string): Promise<boolean> {
  const [data, extIds] = await Promise.all([
    fetchTmdb<TmdbTvResponse>(`/tv/${show.tmdb_id}`, apiKey),
    fetchTmdb<{ imdb_id?: string }>(`/tv/${show.tmdb_id}/external_ids`, apiKey),
  ]);

  logApiCall('tmdb', `/tv/${show.tmdb_id}`, show.id, data ? 1 : 0);
  if (!data) return false;

  const runtime = data.episode_run_time?.length ? data.episode_run_time[0] : null;

  updateShowMetadata({
    tmdb_id: show.tmdb_id,
    imdb_id: extIds?.imdb_id || null,
    title: data.name || show.title,
    original_title: data.original_name || null,
    release_year: data.first_air_date ? parseInt(data.first_air_date.slice(0, 4), 10) : null,
    runtime_minutes: runtime,
    season_count: data.number_of_seasons || null,
    overview: data.overview || null,
    rating: data.vote_average || null,
    genres: data.genres ? JSON.stringify(data.genres.map(g => g.name)) : null,
    image_url: data.poster_path ? `${TMDB_IMG_BASE}${data.poster_path}` : null,
    tmdb_fetched_at: new Date().toISOString(),
  });
  return true;
}

async function enrichBatch(shows: Show[], apiKey: string, label: string): Promise<number> {
  let success = 0;
  for (let i = 0; i < shows.length; i++) {
    const show = shows[i];
    const ok = show.show_type === 'movie'
      ? await enrichMovie(show, apiKey)
      : await enrichTv(show, apiKey);

    if (ok) success++;

    const pct = `${i + 1}/${shows.length}`;
    const status = ok ? '✓' : '✗';
    console.log(`  [${label}] ${pct} ${status} ${show.title} (${show.show_type}, tmdb:${show.tmdb_id})`);

    // TV uses 2 parallel calls but still throttle between shows
    await sleep(show.show_type === 'series' ? MS_PER_REQUEST * 2 : MS_PER_REQUEST);
  }
  return success;
}

export async function runTmdbEnrich(): Promise<void> {
  const cfg = getConfig();
  if (!cfg.tmdbApiKey) {
    console.warn('⚠ tmdbApiKey not set in config.json — skipping TMDB enrichment.');
    return;
  }

  console.log('=== Phase A2: TMDB Metadata Enrichment ===');

  // ── Pass 1: Fill all featured shows with no metadata (highest priority) ──
  const unfetched = getAllFeaturedShowsNeedingEnrichment();
  if (unfetched.length > 0) {
    console.log(`  Pass 1 — filling ${unfetched.length} featured shows with no metadata:`);
    const done = await enrichBatch(unfetched, cfg.tmdbApiKey, 'fill');
    console.log(`  Pass 1 complete: ${done}/${unfetched.length} succeeded.`);
  } else {
    console.log('  Pass 1 — all featured shows have metadata. ✓');
  }

  // ── Pass 2: Refresh featured shows with stale metadata ──────────────────
  const stale = getStaleFeaturedShows(STALE_DAYS, STALE_BATCH);
  if (stale.length > 0) {
    console.log(`  Pass 2 — refreshing ${stale.length} featured shows with metadata > ${STALE_DAYS} days old:`);
    const done = await enrichBatch(stale, cfg.tmdbApiKey, 'refresh');
    console.log(`  Pass 2 complete: ${done}/${stale.length} refreshed.`);
  } else {
    console.log(`  Pass 2 — no stale metadata (> ${STALE_DAYS} days). ✓`);
  }

  console.log('TMDB enrichment complete.');
}
