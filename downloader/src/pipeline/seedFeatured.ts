/**
 * Seed Featured Shows
 * Reads movies.csv + tvshows.csv and imports them as featured shows.
 *
 * TMDB ID resolution order per row:
 *   1. tmdbId column in CSV (if non-empty)
 *   2. TMDB /find/{imdbId} — exact lookup via IMDB ID
 *   3. TMDB /search/{type}?query={title}&year={year} — title+year search
 *   4. TMDB /search/{type}?query={title} — title-only search (last resort)
 *   5. Skip with warning
 *
 * All resolved shows are inserted with is_featured=1 and url_enrich_status='pending'.
 * Existing rows (matched by tmdb_id) are updated, not duplicated.
 */
import { createReadStream } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'csv-parse';
import { getConfig } from '../db/connection.js';
import {
  insertShowIfMissing,
  setFeatured,
  upsertFeaturedShow,
  logApiCall,
} from '../db/queries.js';
import type { CsvRow } from '../types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TMDB_BASE = 'https://api.themoviedb.org/3';
const RATE_DELAY_MS = 300; // gentle — well within TMDB's free limit

function parseCsv(filePath: string): Promise<CsvRow[]> {
  return new Promise((resolve_, reject) => {
    const rows: CsvRow[] = [];
    createReadStream(filePath)
      .pipe(parse({ columns: true, skip_empty_lines: true, trim: true, relax_column_count: true }))
      .on('data', (row: CsvRow) => rows.push(row))
      .on('end', () => resolve_(rows))
      .on('error', reject);
  });
}

// ─── TMDB lookup helpers ──────────────────────────────────────────────────────

interface FindResult {
  movie_results?: Array<{ id: number; title?: string; name?: string }>;
  tv_results?: Array<{ id: number; title?: string; name?: string }>;
}
interface SearchResult {
  results?: Array<{ id: number; title?: string; name?: string }>;
}

/** Compare two show titles: returns false if they share no significant words (likely a wrong match). */
function titlesMatch(a: string, b: string): boolean {
  const words = (s: string) => new Set(
    s.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length >= 3)
  );
  const wa = words(a);
  const wb = words(b);
  if (wa.size === 0 || wb.size === 0) return true; // can't determine — allow it
  const intersection = [...wa].filter(w => wb.has(w)).length;
  const union = new Set([...wa, ...wb]).size;
  return intersection / union >= 0.25;
}

async function tmdbGet<T>(url: string): Promise<T | null> {
  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;
    return resp.json() as Promise<T>;
  } catch {
    return null;
  }
}

/** Step 2: exact IMDB ID lookup via /find — with title sanity check to catch wrong matches. */
async function findByImdbId(
  imdbId: string,
  csvTitle: string,
  showType: 'movie' | 'series',
  apiKey: string
): Promise<number | null> {
  const data = await tmdbGet<FindResult>(
    `${TMDB_BASE}/find/${imdbId}?api_key=${apiKey}&external_source=imdb_id`
  );
  if (!data) return null;
  const results = showType === 'movie' ? data.movie_results : data.tv_results;
  const match = results?.[0];
  if (!match) return null;

  const tmdbTitle = showType === 'movie' ? (match.title ?? '') : (match.name ?? '');
  if (!titlesMatch(csvTitle, tmdbTitle)) {
    console.warn(`  ⚠ IMDB ${imdbId}: TMDB returned "${tmdbTitle}" for "${csvTitle}" — falling through to title search`);
    return null;
  }
  return match.id;
}

/** Steps 3 & 4: title search, with optional year filter */
async function searchByTitle(
  title: string,
  year: number | undefined,
  showType: 'movie' | 'series',
  apiKey: string,
  useYear = true
): Promise<number | null> {
  const endpoint = showType === 'movie' ? 'search/movie' : 'search/tv';
  const yearParam = useYear && year
    ? (showType === 'movie' ? `&year=${year}` : `&first_air_date_year=${year}`)
    : '';
  const url = `${TMDB_BASE}/${endpoint}?api_key=${apiKey}&query=${encodeURIComponent(title)}${yearParam}`;

  const data = await tmdbGet<SearchResult>(url);
  if (!data?.results?.length) return null;

  // Prefer exact title match; fall back to first result
  const normalise = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const target = normalise(title);
  const exact = data.results.find(r => normalise(r.title ?? r.name ?? '') === target);
  return (exact ?? data.results[0]).id;
}

/** Resolve TMDB ID from all available signals, logging each step. */
async function resolveTmdbId(
  title: string,
  year: number | undefined,
  imdbId: string | undefined,
  showType: 'movie' | 'series',
  apiKey: string
): Promise<{ tmdbId: number; method: string } | null> {
  await new Promise(r => setTimeout(r, RATE_DELAY_MS));

  // Step 2: IMDB ID lookup (with title sanity check)
  if (imdbId) {
    const id = await findByImdbId(imdbId, title, showType, apiKey);
    if (id) return { tmdbId: id, method: `find(${imdbId})` };
  }

  // Step 3: title + year search
  if (year) {
    const id = await searchByTitle(title, year, showType, apiKey, true);
    if (id) return { tmdbId: id, method: `search("${title}" ${year})` };
  }

  // Step 4: title-only search
  const id = await searchByTitle(title, undefined, showType, apiKey, false);
  if (id) return { tmdbId: id, method: `search("${title}")` };

  return null;
}

// ─── Seed one CSV file ────────────────────────────────────────────────────────

async function seedFile(
  csvPath: string,
  showType: 'movie' | 'series',
  tmdbApiKey: string
): Promise<{ seeded: number; skipped: number; apiCalls: number }> {
  let rows: CsvRow[];
  try {
    rows = await parseCsv(csvPath);
  } catch (err) {
    console.warn(`  Could not read ${csvPath} — skipping. Error: ${err}`);
    return { seeded: 0, skipped: 0, apiCalls: 0 };
  }

  let seeded = 0;
  let skipped = 0;
  let apiCalls = 0;

  for (const row of rows) {
    const title = row.title?.trim();
    if (!title) continue;

    const year = row.year ? parseInt(row.year, 10) : undefined;
    const imdbId = row.imdbId?.trim() || undefined;
    const tmdbIdStr = row.tmdbId?.trim() || undefined;
    let tmdbId = tmdbIdStr ? parseInt(tmdbIdStr, 10) : undefined;
    let resolveMethod = 'csv';

    // Resolve TMDB ID if not in CSV
    if (!tmdbId && tmdbApiKey) {
      const resolved = await resolveTmdbId(title, year, imdbId, showType, tmdbApiKey);
      apiCalls++;
      if (resolved) {
        tmdbId = resolved.tmdbId;
        resolveMethod = resolved.method;
        logApiCall('tmdb', `seed-resolve/${title}`, undefined, 1);
      } else {
        logApiCall('tmdb', `seed-resolve/${title}`, undefined, 0);
      }
    }

    if (!tmdbId) {
      console.warn(`  ⚠ Could not resolve TMDB ID for "${title}" — add tmdbId to CSV manually.`);
      skipped++;
      continue;
    }

    console.log(`  ✓ "${title}" → tmdb:${tmdbId} (via ${resolveMethod})`);

    const showId = insertShowIfMissing({
      tmdb_id: tmdbId,
      imdb_id: imdbId ?? null,
      title,
      original_title: null,
      show_type: showType,
      release_year: year ?? null,
      runtime_minutes: null,
      season_count: null,
      overview: null,
      rating: null,
      genres: null,
      image_url: null,
      youtube_url: null,
      is_featured: 1,
      // Leave tmdb_fetched_at NULL so A2 enrichment fills fresh metadata
      tmdb_fetched_at: null,
    });

    setFeatured(tmdbId);
    upsertFeaturedShow({ show_id: showId, priority: 3, url_enrich_status: 'pending' });
    seeded++;
  }

  return { seeded, skipped, apiCalls };
}

// ─── Entry point ──────────────────────────────────────────────────────────────

export async function runSeedFeatured(): Promise<void> {
  const cfg = getConfig();
  console.log('=== Seeding Featured Shows from CSV ===');

  if (!cfg.tmdbApiKey) {
    console.warn('  ⚠ tmdbApiKey not set — cannot resolve TMDB IDs.');
    console.warn('  Set tmdbApiKey in config.json and re-run.');
    return;
  }

  const root = resolve(__dirname, '../../');
  const movieCsv = resolve(root, cfg.seedCsvs.movies);
  const tvCsv = resolve(root, cfg.seedCsvs.tvshows);

  console.log(`  Movies:   ${movieCsv}`);
  const movieResult = await seedFile(movieCsv, 'movie', cfg.tmdbApiKey);

  console.log(`  TV shows: ${tvCsv}`);
  const tvResult = await seedFile(tvCsv, 'series', cfg.tmdbApiKey);

  const total = movieResult.seeded + tvResult.seeded;
  const totalSkipped = movieResult.skipped + tvResult.skipped;
  const totalApi = movieResult.apiCalls + tvResult.apiCalls;

  console.log('\nSeed complete:');
  console.log(`  ${movieResult.seeded} movies + ${tvResult.seeded} TV shows = ${total} featured shows added/updated`);
  if (totalSkipped > 0) {
    console.log(`  ${totalSkipped} shows could not be resolved — add tmdbId column to CSV manually`);
  }
  console.log(`  ${totalApi} TMDB API calls made`);
}
