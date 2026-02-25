# AlzheimersTv — Downloader

This is the data pipeline for the AlzheimersTv streaming guide.
It maintains a SQLite database of curated shows with direct streaming URLs,
then generates `../index.html` (the senior-facing TV guide in the parent directory).

---

## Recommended workflow

```bash
cd downloader

# 1. First time only
npm run init          # create DB, seed 16 streaming services

# 2. Every few weeks — download full TMDB catalog (~900K titles, no API key needed)
npm run bulk

# 3. When CSVs change — import curated titles, resolve TMDB IDs automatically
npm run seed

# 4. Daily — enrich metadata, fetch stream URLs, verify links, regenerate HTML
npm run pipeline
```

**First full run after a fresh install:**
```bash
npm run init && npm run bulk && npm run seed && npm run pipeline
```

---

## Project structure

```
downloader/
  src/
    db/
      connection.ts      singleton SQLite connection (better-sqlite3)
      schema.ts          DDL, 16-service seed data, TMDB provider ID map
      queries.ts         all typed DB query functions
    pipeline/
      tmdbBulkImport.ts  A1 — download TMDB daily export (~900K titles, no key needed)
      tmdbEnrich.ts      A2 — metadata per show; fills NULL rows first, then refreshes stale
      tmdbProviders.ts   A3 — which services carry each show (confirms presence, no URLs yet)
      watchmodeEnrich.ts B1 — direct stream URLs from Watchmode (33/day, 950/mo cap)
      motnEnrich.ts      B2 — direct stream URLs from Movie of the Night (95/day cap)
      urlVerifier.ts     C  — HTTP HEAD ping; marks dead links
      seedFeatured.ts    import CSVs; resolves IMDB ID → TMDB ID → title search
    scheduler.ts         CLI orchestrator (see npm scripts below)
    htmlGenerator.ts     queries DB → writes ../index.html
    types.ts             TypeScript interfaces
  config.json            API keys and pipeline settings (fill in keys)
  alzheimerstv.db        SQLite database (gitignored, created by npm run init)
  dist/                  compiled JS output (gitignored)
  node_modules/          (gitignored)
```

---

## npm scripts

| Command | What it does |
|---|---|
| `npm run init` | Create DB schema + seed 16 streaming services (run once) |
| `npm run bulk` | Phase A1: download full TMDB catalog from daily export file (run every few weeks) |
| `npm run seed` | Import `../movies.csv` + `../tvshows.csv`; auto-resolves TMDB IDs |
| `npm run pipeline` | Daily: A2 enrich → A3 providers → B1 Watchmode → B2 MOTN → C verify → generate HTML |
| `npm run pipeline:full` | seed + full pipeline (useful after a fresh bulk import) |
| `npm run pipeline:verify` | Only Phase C — HEAD-ping all stored URLs |
| `npm run generate` | Only regenerate `../index.html` from current DB state |

---

## Configuration (`config.json`)

```json
{
  "dbPath": "./alzheimerstv.db",
  "tmdbApiKey": "",       ← required for enrichment + seed ID resolution
  "watchmodeApiKey": "",  ← optional, enables direct streaming URLs (B1)
  "motnApiKey": "",       ← optional, enables direct streaming URLs (B2)
  "country": "us",
  "targetServices": ["netflix","prime","hulu","disney","max","appletv",
                     "paramount","peacock","amc","britbox","criterion",
                     "tubi","pluto","roku","freevee","youtube"],
  "pipeline": {
    "watchmodeDailyBudget": 33,
    "watchmodeMonthlyBudget": 950,
    "motnDailyBudget": 95,
    "urlVerifyPerRun": 200,
    "tmdbRatePerSecond": 40
  },
  "seedCsvs": {
    "movies": "../movies.csv",
    "tvshows": "../tvshows.csv"
  }
}
```

---

## API keys

### TMDB (required)
- Free, no monthly cap, ~50 req/sec
- Sign up: https://www.themoviedb.org/signup
- Get key: https://www.themoviedb.org/settings/api → "API Key (v3 auth)"
- Used for: metadata enrichment (A2), watch providers (A3), seed TMDB ID resolution

### Watchmode (optional)
- Free tier: 1,000 calls/month (33/day budget enforced)
- Sign up: https://api.watchmode.com/
- Used for: direct deep-link stream URLs (B1)

### Movie of the Night / streaming-availability (optional)
- Free tier: ~3,000 calls/month, 100/day (95/day budget enforced)
- Sign up: https://rapidapi.com/movie-of-the-night-movie-of-the-night-default/api/streaming-availability
- Used for: direct deep-link stream URLs, fills gaps after Watchmode (B2)

---

## Seed ID resolution

`npm run seed` resolves TMDB IDs from the CSVs in this order:

1. **tmdbId column in CSV** — used directly if present
2. **TMDB `/find/{imdbId}`** — exact lookup when IMDB ID is in CSV; result title is sanity-checked against the CSV title (Jaccard word similarity ≥ 25%); if titles don't match the wrong result is discarded and we fall through to step 3
3. **TMDB `/search/{type}?query={title}&year={year}`** — title + year search
4. **TMDB `/search/{type}?query={title}`** — title-only (last resort)
5. **Skip** with warning if nothing matches — add tmdbId to CSV manually

All 111 curated titles resolve automatically given a TMDB API key.

---

## Enrichment priority (Phase A2)

`npm run pipeline` runs two passes for TMDB metadata:

**Pass 1 — fill (highest priority):**
Every featured show with no metadata is fetched before anything else.
No batch limit — all curated titles must have data.

**Pass 2 — refresh:**
Featured shows whose metadata is older than 30 days are refreshed,
oldest first, up to 50 per run. Keeps ratings, season counts, and
poster images current without burning unnecessary API calls.

---

## Database tables

| Table | Purpose |
|---|---|
| `shows` | One row per title — tmdb_id, imdb_id, title, metadata, is_featured |
| `services` | 16 streaming services with display names, colors, base URLs |
| `streaming_availability` | One row per (show × service × access_type) — nullable stream_url |
| `featured_shows` | Editorial state for curated senior guide titles |
| `api_quota_log` | Tracks free-tier API usage to enforce daily/monthly limits |

---

## CSV seed format

`movies.csv` and `tvshows.csv` use a minimal 3-column format:

```
title,imdbId,year
The Godfather,tt0068646,1972
```

- `title` — required
- `imdbId` — optional IMDB ID (e.g. `tt0068646`); enables fast, reliable TMDB lookup
- `year` — optional release year; used as fallback to disambiguate title searches

All metadata (genres, ratings, images, etc.) lives in the DB, not the CSV.

---

## Prime Video: subscription vs rent/buy

Prime Video reports two kinds of availability on TMDB:
- **subscription** (`access_type='subscription'`) — included with a Prime membership at no extra cost
- **rent** / **buy** (`access_type='rent'` or `'buy'`) — costs extra (e.g. $3.99 to rent, $14.99 to buy)

In `index.html`:
- Subscription/free badges render as solid colored buttons (Prime Video)
- Rent/buy badges render as outlined buttons with price: "Prime Video (rent $3.99)"
- Price data comes from Watchmode's `source.price` field, stored in `streaming_availability.price`

---

## HTML badge render logic

Badges on `../index.html` follow this priority:

1. `stream_url` present + `status=200` → direct link to show
2. `stream_url` present + `status=NULL` (unverified) → direct link (shown as unverified)
3. `stream_url=NULL` (TMDB confirmed service, no URL yet) → link to service homepage
4. `status=404` → badge suppressed

**Rent/buy badges** render with outlined style and price label. Subscription/free use solid fill.

---

## Verification checkpoints

```bash
# After init:
sqlite3 alzheimerstv.db "SELECT COUNT(*) FROM services"  -- expect 16

# After bulk:
sqlite3 alzheimerstv.db "SELECT show_type, COUNT(*) FROM shows GROUP BY show_type"

# After seed:
sqlite3 alzheimerstv.db "SELECT COUNT(*) FROM featured_shows"  -- expect ~111

# After pipeline:
sqlite3 alzheimerstv.db "SELECT COUNT(*) FROM shows WHERE tmdb_fetched_at IS NOT NULL AND is_featured=1"
sqlite3 alzheimerstv.db "SELECT service_id, COUNT(*) FROM streaming_availability GROUP BY service_id"

# URL health:
sqlite3 alzheimerstv.db "SELECT stream_url_status, COUNT(*) FROM streaming_availability WHERE stream_url IS NOT NULL GROUP BY stream_url_status"
```

---

## TMDB provider ID → service ID map

```
Netflix=8, Prime=9, Hulu=15, Disney+=337, Max=1899, AppleTV+=350,
Paramount+=531, Peacock=386, AMC+=526, BritBox=151, Criterion=258,
Tubi=73, Pluto=300, Roku=207, Freevee=613
```
Defined in `src/db/schema.ts` as `TMDB_PROVIDER_MAP`.
