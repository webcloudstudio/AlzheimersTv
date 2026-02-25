/**
 * Phase B2 — Movie of the Night (MOTN) URL Enrichment
 * Uses the streaming-availability SDK to get direct streaming URLs.
 * Budget-enforced: max 95 calls/day.
 * Skips shows already fully enriched by Watchmode.
 */
import * as streamingAvailability from 'streaming-availability';
import { getConfig } from '../db/connection.js';
import {
  getFeaturedShowsForUrlEnrich,
  getStreamingForShow,
  upsertStreamingAvailability,
  updateFeaturedEnrichStatus,
  logApiCall,
  countApiCalls,
} from '../db/queries.js';

// MOTN/streaming-availability service id → our service_id
const MOTN_SERVICE_MAP: Record<string, string> = {
  'netflix':         'netflix',
  'prime':           'prime',
  'hulu':            'hulu',
  'disney':          'disney',
  'hbo':             'max',
  'max':             'max',
  'apple':           'appletv',
  'paramount':       'paramount',
  'peacock':         'peacock',
  'amc':             'amc',
  'britbox':         'britbox',
  'criterion':       'criterion',
  'tubi':            'tubi',
  'pluto':           'pluto',
  'roku':            'roku',
  'freevee':         'freevee',
};

function mapMotnService(serviceId: string): string | null {
  return MOTN_SERVICE_MAP[serviceId.toLowerCase()] ?? null;
}

function accessTypeFromMotn(type: string): 'subscription' | 'free' | 'rent' | 'buy' | null {
  switch (type.toLowerCase()) {
    case 'subscription': return 'subscription';
    case 'free':         return 'free';
    case 'rent':         return 'rent';
    case 'buy':          return 'buy';
    case 'addon':        return 'subscription';
    default:             return null;
  }
}

function checkBudget(cfg: ReturnType<typeof getConfig>): { ok: boolean; reason?: string } {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const dailyUsed = countApiCalls('motn', todayStart);
  if (dailyUsed >= cfg.pipeline.motnDailyBudget) {
    return { ok: false, reason: `MOTN daily budget exhausted (${dailyUsed}/${cfg.pipeline.motnDailyBudget})` };
  }
  return { ok: true };
}

export async function runMotnEnrich(): Promise<void> {
  const cfg = getConfig();
  if (!cfg.motnApiKey) {
    console.warn('⚠ motnApiKey not set — skipping MOTN enrichment.');
    return;
  }

  console.log('=== Phase B2: MOTN URL Enrichment ===');

  const budget = checkBudget(cfg);
  if (!budget.ok) {
    console.log(`  ${budget.reason}. Skipping.`);
    return;
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const dailyUsed = countApiCalls('motn', todayStart);
  const remaining = cfg.pipeline.motnDailyBudget - dailyUsed;

  const client = new streamingAvailability.Client(
    new streamingAvailability.Configuration({ apiKey: cfg.motnApiKey })
  );

  // Fetch shows that are still pending/partial (Watchmode may have handled some)
  const shows = getFeaturedShowsForUrlEnrich(remaining);
  console.log(`  Processing ${shows.length} shows (${remaining} calls remaining today)...`);

  for (const show of shows) {
    const budgetCheck = checkBudget(cfg);
    if (!budgetCheck.ok) {
      console.log(`  ${budgetCheck.reason}. Stopping.`);
      break;
    }

    // Skip if already complete from Watchmode
    if (show.url_enrich_status === 'complete') {
      console.log(`  Skipping ${show.title} — already complete.`);
      continue;
    }

    console.log(`  MOTN: ${show.title} (imdb: ${show.imdb_id ?? 'none'})`);

    try {
      let motnShow: streamingAvailability.Show | null = null;

      // Prefer lookup by IMDB ID, fall back to TMDB ID
      const lookupId = show.imdb_id
        ? show.imdb_id
        : `tmdb:${show.show_type === 'movie' ? 'movie' : 'tv'}:${show.tmdb_id}`;

      try {
        motnShow = await client.showsApi.getShow({
          id: lookupId,
          country: cfg.country,
        });
      } catch {
        // Try by title if ID lookup fails
        const showType = show.show_type === 'movie'
          ? streamingAvailability.ShowType.Movie
          : streamingAvailability.ShowType.Series;

        const results = await client.showsApi.searchShowsByTitle({
          title: show.title,
          country: cfg.country,
          showType,
        });
        motnShow = results[0] ?? null;
      }

      logApiCall('motn', `getShow/${show.tmdb_id}`, show.id, motnShow ? 1 : 0);

      if (!motnShow) {
        updateFeaturedEnrichStatus(show.id!, 'failed');
        continue;
      }

      const streamingOptions = motnShow.streamingOptions?.[cfg.country] ?? [];
      let urlsAdded = 0;

      for (const option of streamingOptions) {
        const serviceId = mapMotnService(option.service.id);
        if (!serviceId || !cfg.targetServices.includes(serviceId)) continue;

        const accessType = accessTypeFromMotn(option.type);
        if (!accessType) continue;

        upsertStreamingAvailability({
          show_id: show.id!,
          service_id: serviceId,
          access_type: accessType,
          stream_url: option.link,
          source: 'motn',
        });
        urlsAdded++;
      }

      const existingRows = getStreamingForShow(show.id!);
      const hasUrl = existingRows.some(r => r.stream_url !== null);
      const allHaveUrls = existingRows.filter(r => r.stream_url === null).length === 0;
      const status = allHaveUrls ? 'complete' : hasUrl ? 'partial' : 'pending';
      updateFeaturedEnrichStatus(show.id!, status);

      console.log(`    → ${urlsAdded} URLs added, status: ${status}`);
    } catch (err: any) {
      console.error(`  Error for ${show.title}:`, err.message);
      logApiCall('motn', `getShow/${show.tmdb_id}`, show.id, 0);
      updateFeaturedEnrichStatus(show.id!, 'failed');
    }

    // Respect rate limit
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log('MOTN enrichment run complete.');
}
