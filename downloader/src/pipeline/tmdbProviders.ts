/**
 * Phase A3 — TMDB Watch Providers
 * Fetches which services carry each show (US only).
 * Confirms service presence without direct URLs.
 * Upserts streaming_availability rows with stream_url=NULL, source='tmdb_providers'.
 */
import { getConfig } from '../db/connection.js';
import {
  getFeaturedShowsForProviders,
  upsertStreamingAvailability,
  logApiCall,
} from '../db/queries.js';
import { TMDB_PROVIDER_MAP } from '../db/schema.js';
import type { Show, TmdbProvidersResponse } from '../types.js';

const TMDB_BASE = 'https://api.themoviedb.org/3';
const MS_PER_REQUEST = 25; // ~40 req/sec

function sleep(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms));
}

async function fetchProviders(show: Show, apiKey: string): Promise<TmdbProvidersResponse | null> {
  const type = show.show_type === 'movie' ? 'movie' : 'tv';
  const url = `${TMDB_BASE}/${type}/${show.tmdb_id}/watch/providers?api_key=${apiKey}`;
  try {
    const resp = await fetch(url);
    if (!resp.ok) {
      if (resp.status === 404) return null;
      throw new Error(`HTTP ${resp.status}`);
    }
    return resp.json() as Promise<TmdbProvidersResponse>;
  } catch (err) {
    console.error(`  Provider fetch error for tmdb_id ${show.tmdb_id}:`, err);
    return null;
  }
}

function processAccessType(
  entries: Array<{ provider_id: number }> | undefined,
  accessType: 'subscription' | 'free' | 'rent' | 'buy',
  show: Show,
  targetServices: string[]
): void {
  if (!entries) return;
  for (const entry of entries) {
    const serviceId = TMDB_PROVIDER_MAP[entry.provider_id];
    if (!serviceId || !targetServices.includes(serviceId)) continue;
    upsertStreamingAvailability({
      show_id: show.id!,
      service_id: serviceId,
      access_type: accessType,
      stream_url: null,
      source: 'tmdb_providers',
    });
  }
}

export async function runTmdbProviders(limit = 500): Promise<void> {
  const cfg = getConfig();
  if (!cfg.tmdbApiKey) {
    console.warn('⚠ tmdbApiKey not set in config.json — skipping TMDB providers.');
    return;
  }

  console.log('=== Phase A3: TMDB Watch Providers ===');

  const shows = getFeaturedShowsForProviders(limit);
  console.log(`  Fetching providers for ${shows.length} shows...`);

  let count = 0;
  for (const show of shows) {
    const data = await fetchProviders(show, cfg.tmdbApiKey);
    logApiCall('tmdb', `providers/${show.tmdb_id}`, show.id, data ? 1 : 0);

    if (data?.results?.US) {
      const us = data.results.US;
      processAccessType(us.flatrate, 'subscription', show, cfg.targetServices);
      processAccessType(us.free,     'free',         show, cfg.targetServices);
      processAccessType(us.ads,      'free',         show, cfg.targetServices);
      processAccessType(us.rent,     'rent',         show, cfg.targetServices);
      processAccessType(us.buy,      'buy',          show, cfg.targetServices);
    }

    count++;
    if (count % 50 === 0) console.log(`  ${count}/${shows.length} processed...`);
    await sleep(MS_PER_REQUEST);
  }

  console.log(`TMDB providers complete: ${count} shows processed.`);
}
