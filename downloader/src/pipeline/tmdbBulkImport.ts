/**
 * Phase A1 — TMDB Bulk Import
 * Downloads the daily TMDB export files and inserts all IDs into the shows table.
 * No API key required. Run monthly to keep catalog fresh.
 */
import { createGunzip } from 'node:zlib';
import { createInterface } from 'node:readline';
import { Readable } from 'node:stream';
import { batchInsertShows } from '../db/queries.js';

const TMDB_EXPORT_BASE = 'http://files.tmdb.org/p/exports';
const BATCH_SIZE = 1000;

function todayStr(): string {
  const d = new Date();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const yyyy = d.getUTCFullYear();
  return `${mm}_${dd}_${yyyy}`;
}

async function fetchAndInsert(url: string, showType: 'movie' | 'series'): Promise<number> {
  console.log(`Downloading ${showType} export: ${url}`);

  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`Failed to fetch ${url}: HTTP ${resp.status}`);
  }

  const nodeStream = Readable.fromWeb(resp.body as any);
  const gunzip = createGunzip();
  const rl = createInterface({ input: nodeStream.pipe(gunzip), crlfDelay: Infinity });

  let batch: Array<{ tmdb_id: number; title: string; original_title?: string; show_type: 'movie' | 'series' }> = [];
  let total = 0;

  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      const obj = JSON.parse(line);
      if (!obj.id) continue;

      batch.push({
        tmdb_id: obj.id,
        title: obj.original_title || obj.name || `Unknown ${obj.id}`,
        original_title: obj.original_title || obj.original_name,
        show_type: showType,
      });

      if (batch.length >= BATCH_SIZE) {
        batchInsertShows(batch);
        total += batch.length;
        process.stdout.write(`\r  ${showType}: ${total.toLocaleString()} inserted...`);
        batch = [];
      }
    } catch {
      // malformed line — skip
    }
  }

  if (batch.length > 0) {
    batchInsertShows(batch);
    total += batch.length;
  }

  console.log(`\r  ${showType}: ${total.toLocaleString()} rows processed.`);
  return total;
}

export async function runBulkImport(): Promise<void> {
  const date = todayStr();

  const movieUrl = `${TMDB_EXPORT_BASE}/movie_ids_${date}.json.gz`;
  const tvUrl = `${TMDB_EXPORT_BASE}/tv_series_ids_${date}.json.gz`;

  console.log('=== Phase A1: TMDB Bulk Import ===');

  let movieCount = 0;
  let tvCount = 0;

  try {
    movieCount = await fetchAndInsert(movieUrl, 'movie');
  } catch (err) {
    console.error('Movie import failed:', err);
  }

  try {
    tvCount = await fetchAndInsert(tvUrl, 'series');
  } catch (err) {
    console.error('TV import failed:', err);
  }

  console.log(`\nBulk import complete: ${movieCount.toLocaleString()} movies, ${tvCount.toLocaleString()} TV series.`);
}
