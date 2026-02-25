# AlzheimersTv Web Server

Express + TypeScript web server serving the senior TV guide from SQLite.
The database is maintained by the `../downloader/` pipeline — this project only reads it.

---

## Quick Start

```bash
cd webserver
npm install
npm run dev        # http://localhost:3000
```

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Development — tsx watch, auto-restart on .ts changes, no compile step |
| `npm run build` | Compile TypeScript to dist/ |
| `npm start` | Run compiled server (after build) |
| `npm run typecheck` | Type-check without emitting files |

---

## Architecture

- **Server**: Express 4 on port 3000 (override with `PORT` env var)
- **DB**: better-sqlite3, read-only from `../downloader/alzheimerstv.db`
- **Frontend**: Vanilla JS ES Modules — no build step for client code
- **Filtering/sorting**: 100% client-side after single `/api/shows` payload

## DB path resolution

`src/db/connection.ts` uses `__dirname` (CommonJS):
```
webserver/dist/db/ → ../../../ → AlzheimersTv/ → downloader/alzheimerstv.db
```

---

## API

| Route | Response |
|---|---|
| `GET /api/shows` | All featured shows with service badges (5-min cache) |
| `GET /api/services` | All 16 streaming services for filter bar |
| `GET /health` | `{ ok, shows, cachedAt }` |
| `GET /` | index.html SPA shell |

---

## Frontend modules (`public/js/`)

| File | Role |
|---|---|
| `app.js` | Entry point — init, state, event wiring |
| `filters.js` | Pure filter/sort functions (no DOM access) |
| `render.js` | Card + badge DOM rendering (createElement, not innerHTML) |
| `modal.js` | Detail overlay — open/close/populate |
| `stars.js` | Optional Supabase star ratings |

---

## Star ratings (optional)

Set `SUPABASE_URL` and `SUPABASE_ANON_KEY` constants in `public/js/stars.js`.
If left empty, the star UI does not render. Supabase table schema is documented
in the comment at the top of `stars.js`.

---

## DO NOT modify

- `../downloader/` — data pipeline, runs independently
- `../original_code/` — reference implementation only
