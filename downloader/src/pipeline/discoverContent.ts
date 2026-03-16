/**
 * discoverContent.ts
 * One-time content discovery: queries TMDB Discover API across all 15 supported
 * streaming services (US) to find ~400 shows/movies curated for viewers with
 * early Alzheimer's/dementia.
 *
 * Targeted categories:
 *   - Musicals & music films
 *   - Comedy (slapstick + clever humor)
 *   - Nature / animal documentaries
 *   - Cooking / food reality shows
 *   - Concert & music performance
 *   - Family & animation
 *   - Talk & variety
 *
 * Run:  npm run discover
 *
 * Appends new entries to ../../movies.csv and ../../tvshows.csv.
 * Adds a `tmdbId` column to both files if not already present
 * (avoids IMDB-lookup API calls during seed; seedFeatured uses tmdbId directly).
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getConfig } from '../db/connection.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TMDB_BASE  = 'https://api.themoviedb.org/3';
const DELAY_MS   = 275; // ~3.6 req/s — well inside TMDB free-tier limit (40/s)

// All TMDB provider IDs that map to our 15 streaming services
const PROVIDER_IDS = [
  8,    // Netflix
  9,    // Prime Video
  15,   // Hulu
  337,  // Disney+
  1899, // Max
  350,  // Apple TV+
  531,  // Paramount+
  386,  // Peacock
  526,  // AMC+
  151,  // BritBox
  258,  // Criterion Channel
  73,   // Tubi
  300,  // Pluto TV
  207,  // Roku Channel
  613,  // Amazon Freevee
];
const PROVIDERS_PARAM = PROVIDER_IDS.join('|'); // pipe = OR in TMDB

// ─── Genre IDs to exclude (not suitable for elderly/dementia audience) ─────────
// Horror=27  Thriller=53  Crime=80  War=10752  War&Politics(TV)=10768  Soap=10766
const EXCLUDE_MOVIE = [27, 53, 80, 10752];
const EXCLUDE_TV    = [27, 53, 10768, 10766];

// ─── Search plans ─────────────────────────────────────────────────────────────
interface SearchPlan {
  type:          'movie' | 'tv';
  category:      string;
  genreIds:      number[];   // comma-separated → AND in TMDB
  excludeGenres: number[];
  minVotes:      number;
  minRating:     number;
  maxPages:      number;
  target:        number;     // max results to keep from this plan
}

const PLANS: SearchPlan[] = [
  // ── Movies (total target: 180) ────────────────────────────────────────────
  { type:'movie', category:'Musicals & Music Films',
    genreIds:[10402], excludeGenres:EXCLUDE_MOVIE,
    minVotes:100, minRating:6.0, maxPages:8, target:40 },

  { type:'movie', category:'Comedy',
    genreIds:[35], excludeGenres:EXCLUDE_MOVIE,
    minVotes:200, minRating:6.5, maxPages:10, target:50 },

  { type:'movie', category:'Documentary (Nature / Concert / Food)',
    genreIds:[99], excludeGenres:EXCLUDE_MOVIE,
    minVotes:50, minRating:6.5, maxPages:8, target:35 },

  { type:'movie', category:'Family',
    genreIds:[10751], excludeGenres:[27, 53],
    minVotes:100, minRating:6.5, maxPages:6, target:30 },

  { type:'movie', category:'Animation',
    genreIds:[16], excludeGenres:[27, 53],
    minVotes:100, minRating:6.5, maxPages:6, target:25 },

  // ── TV Shows (total target: 220) ──────────────────────────────────────────
  { type:'tv', category:'Comedy Series',
    genreIds:[35], excludeGenres:EXCLUDE_TV,
    minVotes:100, minRating:7.0, maxPages:12, target:60 },

  { type:'tv', category:'Nature & Wildlife Docs',
    genreIds:[99], excludeGenres:EXCLUDE_TV,
    minVotes:50, minRating:7.0, maxPages:8, target:50 },

  { type:'tv', category:'Reality (Cooking / Baking / Craft)',
    genreIds:[10764], excludeGenres:EXCLUDE_TV,
    minVotes:30, minRating:6.5, maxPages:8, target:40 },

  { type:'tv', category:'Family Series',
    genreIds:[10751], excludeGenres:EXCLUDE_TV,
    minVotes:50, minRating:7.0, maxPages:6, target:40 },

  { type:'tv', category:'Music & Concert',
    genreIds:[10402], excludeGenres:EXCLUDE_TV,
    minVotes:20, minRating:6.0, maxPages:5, target:20 },

  { type:'tv', category:'Talk & Variety',
    genreIds:[10767], excludeGenres:EXCLUDE_TV,
    minVotes:20, minRating:6.5, maxPages:4, target:10 },
];
// Plan totals: 40+50+35+30+25 = 180 movies | 60+50+40+40+20+10 = 220 TV = 400

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

/** Quote a CSV field if it contains commas, quotes, or newlines. */
function csvEscape(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

function extractYear(dateStr: string | undefined): string {
  return dateStr?.split('-')[0] ?? '';
}

function normalizeTitle(t: string): string {
  return t.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
}

// ─── CSV state ────────────────────────────────────────────────────────────────

interface CsvState {
  lines:           string[];
  existingTitles:  Set<string>;
  existingTmdbIds: Set<number>;
}

/**
 * Load a CSV file, upgrading it to 4-column format (title,imdbId,year,tmdbId)
 * if needed. Returns lines array + dedup sets.
 */
function loadCsv(filePath: string): CsvState {
  const existingTitles  = new Set<string>();
  const existingTmdbIds = new Set<number>();

  if (!existsSync(filePath)) {
    return { lines: ['title,imdbId,year,tmdbId'], existingTitles, existingTmdbIds };
  }

  const raw    = readFileSync(filePath, 'utf-8');
  const lines  = raw.split('\n');
  const header = lines[0] ?? '';
  const hasTmdbCol = header.includes('tmdbId');

  // Upgrade header + existing rows to 4-column format if needed
  const outLines: string[] = hasTmdbCol
    ? [...lines]
    : [
        `${header},tmdbId`,
        ...lines.slice(1).map(l => (l.trim() ? `${l},` : l)),
      ];

  // Collect existing titles (all rows) and tmdbIds (if column present)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Simple comma-split sufficient — our titles don't contain commas
    const parts   = line.split(',');
    const rawTitle = parts[0]?.replace(/^"|"$/g, '').trim() ?? '';
    if (rawTitle) existingTitles.add(normalizeTitle(rawTitle));

    if (hasTmdbCol) {
      const id = parseInt(parts[3]?.trim() ?? '', 10);
      if (!isNaN(id)) existingTmdbIds.add(id);
    }
  }

  return { lines: outLines, existingTitles, existingTmdbIds };
}

// ─── TMDB discovery ───────────────────────────────────────────────────────────

interface TmdbItem {
  id:              number;
  title?:          string;  // movie
  name?:           string;  // tv
  release_date?:   string;
  first_air_date?: string;
  vote_average:    number;
  vote_count:      number;
}

interface TmdbPage {
  results:     TmdbItem[];
  total_pages: number;
}

async function fetchPage(
  plan: SearchPlan,
  apiKey: string,
  page: number,
): Promise<TmdbPage | null> {
  await sleep(DELAY_MS);

  const endpoint = plan.type === 'movie' ? 'discover/movie' : 'discover/tv';
  const params   = new URLSearchParams({
    api_key:              apiKey,
    with_watch_providers: PROVIDERS_PARAM,
    watch_region:         'US',
    with_genres:          plan.genreIds.join(','),
    without_genres:       plan.excludeGenres.join(','),
    sort_by:              'vote_average.desc',
    'vote_count.gte':     String(plan.minVotes),
    'vote_average.gte':   String(plan.minRating),
    include_adult:        'false',
    page:                 String(page),
  });

  try {
    const res = await fetch(`${TMDB_BASE}/${endpoint}?${params}`);
    if (!res.ok) {
      console.warn(`    TMDB ${res.status} on page ${page}`);
      return null;
    }
    return res.json() as Promise<TmdbPage>;
  } catch (err) {
    console.warn(`    Fetch error: ${err}`);
    return null;
  }
}

async function runPlan(
  plan:            SearchPlan,
  apiKey:          string,
  seenIds:         Set<number>,
  existingTitles:  Set<string>,
): Promise<TmdbItem[]> {
  const collected: TmdbItem[] = [];
  let page = 1;

  process.stdout.write(`  [${plan.type.toUpperCase()}] ${plan.category} … `);

  while (collected.length < plan.target && page <= plan.maxPages) {
    const data = await fetchPage(plan, apiKey, page);
    if (!data || !data.results.length) break;

    for (const item of data.results) {
      if (collected.length >= plan.target) break;
      if (seenIds.has(item.id)) continue;

      const title = (item.title ?? item.name ?? '').trim();
      if (!title) continue;
      if (existingTitles.has(normalizeTitle(title))) continue;

      seenIds.add(item.id);
      existingTitles.add(normalizeTitle(title)); // prevent intra-plan dups
      collected.push(item);
    }

    if (page >= data.total_pages) break;
    page++;
  }

  console.log(`${collected.length} collected (${page} pages)`);
  return collected;
}

// ─── Entry point ──────────────────────────────────────────────────────────────

async function runDiscoverContent(): Promise<void> {
  const cfg = getConfig();

  if (!cfg.tmdbApiKey) {
    console.error('✗ tmdbApiKey not set in config.json — cannot query TMDB.');
    process.exit(1);
  }

  // Resolve CSV paths the same way seedFeatured does
  const root        = resolve(__dirname, '../../');
  const moviePath   = resolve(root, cfg.seedCsvs.movies);
  const tvPath      = resolve(root, cfg.seedCsvs.tvshows);

  console.log('=== AlzheimersTv — Content Discovery ===\n');
  console.log(`  Providers: ${PROVIDER_IDS.length} services (all supported)`);
  console.log(`  Region:    US`);
  console.log(`  Target:    ~400 new titles (180 movies + 220 TV)\n`);

  const movieState = loadCsv(moviePath);
  const tvState    = loadCsv(tvPath);

  // Seed global seen sets from existing CSV data
  const movieSeenIds = new Set<number>(movieState.existingTmdbIds);
  const tvSeenIds    = new Set<number>(tvState.existingTmdbIds);

  const newMovies: TmdbItem[] = [];
  const newTv:     TmdbItem[] = [];

  for (const plan of PLANS) {
    const seenIds        = plan.type === 'movie' ? movieSeenIds : tvSeenIds;
    const existingTitles = plan.type === 'movie'
      ? movieState.existingTitles
      : tvState.existingTitles;

    const results = await runPlan(plan, cfg.tmdbApiKey, seenIds, existingTitles);
    if (plan.type === 'movie') newMovies.push(...results);
    else                       newTv.push(...results);
  }

  // Sort by rating within each type
  newMovies.sort((a, b) => b.vote_average - a.vote_average);
  newTv.sort((a, b) => b.vote_average - a.vote_average);

  // Append new rows to in-memory CSV state
  function appendRows(state: CsvState, items: TmdbItem[]) {
    for (const item of items) {
      const title = csvEscape((item.title ?? item.name ?? '').trim());
      const year  = extractYear(item.release_date ?? item.first_air_date);
      state.lines.push(`${title},,${year},${item.id}`);
    }
  }

  appendRows(movieState, newMovies);
  appendRows(tvState,    newTv);

  // Write back (trim trailing blank lines, ensure single trailing newline)
  const serialise = (lines: string[]) =>
    lines.join('\n').trimEnd() + '\n';

  writeFileSync(moviePath, serialise(movieState.lines), 'utf-8');
  writeFileSync(tvPath,    serialise(tvState.lines),    'utf-8');

  console.log('\n=== Done ===');
  console.log(`  Movies added:   ${newMovies.length}`);
  console.log(`  TV shows added: ${newTv.length}`);
  console.log(`  Total new:      ${newMovies.length + newTv.length}`);
  console.log('\n  Next steps:');
  console.log('    npm run seed      — import new entries into DB');
  console.log('    npm run pipeline  — enrich metadata + fetch streaming URLs');
}

runDiscoverContent().catch(err => {
  console.error('Discovery failed:', err);
  process.exit(1);
});
