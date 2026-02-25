import { Router, Request, Response } from 'express';
import { getAllFeaturedShows, getAllServices, getShowCount } from '../db/queries';
import type { ApiShow } from '../types';

const router = Router();

// ─── In-memory cache ──────────────────────────────────────────────────────────

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

let showsCache: { data: ApiShow[]; cachedAt: number } | null = null;

function getShowsCached(): ApiShow[] {
  if (showsCache && Date.now() - showsCache.cachedAt < CACHE_TTL_MS) {
    return showsCache.data;
  }
  const data = getAllFeaturedShows();
  showsCache = { data, cachedAt: Date.now() };
  return data;
}

// ─── Routes ───────────────────────────────────────────────────────────────────

router.get('/shows', (req: Request, res: Response) => {
  try {
    const shows = getShowsCached();
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.json(shows);
  } catch (err) {
    console.error('GET /api/shows error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

router.get('/services', (req: Request, res: Response) => {
  try {
    res.json(getAllServices());
  } catch (err) {
    console.error('GET /api/services error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

router.get('/health', (req: Request, res: Response) => {
  try {
    const shows = getShowsCached();
    res.json({
      ok: true,
      shows: shows.length,
      cachedAt: showsCache ? new Date(showsCache.cachedAt).toISOString() : null,
    });
  } catch (err) {
    res.status(503).json({ ok: false, error: String(err) });
  }
});

export default router;
