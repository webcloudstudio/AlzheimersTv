/**
 * Phase B1 — Watchmode URL Enrichment
 * Fetches direct streaming URLs from Watchmode API.
 * Budget-enforced: respects daily + monthly limits.
 */
import { getConfig } from '../db/connection.js';
import {
  getFeaturedShowsForUrlEnrich,
  getStreamingForShow,
  upsertStreamingAvailability,
  updateFeaturedEnrichStatus,
  logApiCall,
  countApiCalls,
} from '../db/queries.js';
import type { Show, WatchmodeTitleResponse } from '../types.js';

const WATCHMODE_BASE = 'https://api.watchmode.com/v1';

// Watchmode service name → our service_id
const WATCHMODE_SERVICE_MAP: Record<string, string> = {
  'netflix':          'netflix',
  'amazon prime':     'prime',
  'prime video':      'prime',
  'hulu':             'hulu',
  'disney plus':      'disney',
  'disney+':          'disney',
  'hbo max':          'max',
  'max':              'max',
  'apple tv plus':    'appletv',
  'apple tv+':        'appletv',
  'paramount plus':   'paramount',
  'paramount+':       'paramount',
  'peacock':          'peacock',
  'amc plus':         'amc',
  'amc+':             'amc',
  'britbox':          'britbox',
  'criterion channel':'criterion',
  'tubi':             'tubi',
  'pluto tv':         'pluto',
  'the roku channel': 'roku',
  'amazon freevee':   'freevee',
  'freevee':          'freevee',
};

function mapWatchmodeService(name: string): string | null {
  return WATCHMODE_SERVICE_MAP[name.toLowerCase()] ?? null;
}

function accessTypeFromWatchmode(type: string): 'subscription' | 'free' | 'rent' | 'buy' | null {
  switch (type.toLowerCase()) {
    case 'sub': return 'subscription';
    case 'free': return 'free';
    case 'rent': return 'rent';
    case 'buy': return 'buy';
    default: return null;
  }
}

async function fetchWatchmodeTitle(tmdb_id: number, show_type: 'movie' | 'series', apiKey: string): Promise<WatchmodeTitleResponse | null> {
  const type = show_type === 'movie' ? 'movie' : 'tv';
  const url = `${WATCHMODE_BASE}/title/tmdb:${type}:${tmdb_id}/?apiKey=${apiKey}`;
  try {
    const resp = await fetch(url);
    if (!resp.ok) {
      if (resp.status === 404 || resp.status === 500) return null; // 500 = title not in Watchmode DB
      throw new Error(`HTTP ${resp.status}`);
    }
    return resp.json() as Promise<WatchmodeTitleResponse>;
  } catch (err) {
    console.error(`  Watchmode error for tmdb_id ${tmdb_id}:`, err);
    return null;
  }
}

function checkBudget(cfg: ReturnType<typeof getConfig>): { ok: boolean; reason?: string } {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const dailyUsed = countApiCalls('watchmode', todayStart);
  const monthlyUsed = countApiCalls('watchmode', monthStart);

  if (dailyUsed >= cfg.pipeline.watchmodeDailyBudget) {
    return { ok: false, reason: `Daily budget exhausted (${dailyUsed}/${cfg.pipeline.watchmodeDailyBudget})` };
  }
  if (monthlyUsed >= cfg.pipeline.watchmodeMonthlyBudget) {
    return { ok: false, reason: `Monthly budget exhausted (${monthlyUsed}/${cfg.pipeline.watchmodeMonthlyBudget})` };
  }
  return { ok: true };
}

export async function runWatchmodeEnrich(): Promise<void> {
  const cfg = getConfig();
  if (!cfg.watchmodeApiKey) {
    console.warn('⚠ watchmodeApiKey not set — skipping Watchmode enrichment.');
    return;
  }

  console.log('=== Phase B1: Watchmode URL Enrichment ===');

  const budget = checkBudget(cfg);
  if (!budget.ok) {
    console.log(`  Budget check: ${budget.reason}. Skipping.`);
    return;
  }

  // Fetch enough shows to fill remaining daily budget
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const dailyUsed = countApiCalls('watchmode', todayStart);
  const remaining = cfg.pipeline.watchmodeDailyBudget - dailyUsed;

  const shows = getFeaturedShowsForUrlEnrich(remaining);
  console.log(`  Processing ${shows.length} shows (${remaining} calls remaining today)...`);

  for (const show of shows) {
    const budgetCheck = checkBudget(cfg);
    if (!budgetCheck.ok) {
      console.log(`  ${budgetCheck.reason}. Stopping.`);
      break;
    }

    console.log(`  Watchmode: ${show.title} (${show.tmdb_id})`);

    const data = await fetchWatchmodeTitle(show.tmdb_id, show.show_type, cfg.watchmodeApiKey);
    logApiCall('watchmode', `title/${show.tmdb_id}`, show.id, data ? 1 : 0);

    if (!data) {
      updateFeaturedEnrichStatus(show.id!, 'failed');
      continue;
    }

    // Store watchmode_id for future re-enrichment
    const watchmodeId = data.id;
    let urlsAdded = 0;

    if (data.sources) {
      for (const source of data.sources) {
        if (source.region !== 'US') continue;
        const serviceId = mapWatchmodeService(source.name);
        if (!serviceId || !cfg.targetServices.includes(serviceId)) continue;

        const accessType = accessTypeFromWatchmode(source.type);
        if (!accessType) continue;

        upsertStreamingAvailability({
          show_id: show.id!,
          service_id: serviceId,
          access_type: accessType,
          stream_url: source.web_url,
          price: source.price ?? null,
          source: 'watchmode',
        });
        urlsAdded++;
      }
    }

    // Determine enrichment status
    const existingRows = getStreamingForShow(show.id!);
    const hasUrl = existingRows.some(r => r.stream_url !== null);
    const allHaveUrls = existingRows.filter(r => r.stream_url === null).length === 0;

    const status = allHaveUrls ? 'complete' : hasUrl ? 'partial' : 'pending';
    updateFeaturedEnrichStatus(show.id!, status, watchmodeId);

    console.log(`    → ${urlsAdded} URLs added, status: ${status}`);

    // Watchmode asks for 1 req/sec max on free tier
    await new Promise(r => setTimeout(r, 1100));
  }

  console.log('Watchmode enrichment run complete.');
}
