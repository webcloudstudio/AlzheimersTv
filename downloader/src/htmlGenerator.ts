/**
 * HTML Generator
 * Queries the DB and generates index.html for the senior TV guide.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getFeaturedShowsForHtml } from './db/queries.js';
import type { FeaturedShowRow, ServiceBadge } from './types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..'); // downloader/dist/ → downloader/ → project root

// ─── Badge rendering ──────────────────────────────────────────────────────────

function renderBadge(badge: ServiceBadge): string {
  const isPaid = badge.access === 'rent' || badge.access === 'buy';
  const color = badge.color ?? '#666';

  const priceStr = badge.price != null ? ` $${badge.price.toFixed(2)}` : '';
  const label = isPaid ? `${badge.name} (${badge.access}${priceStr})` : badge.name;

  // Subscription/free: solid color. Rent/buy: outlined (costs extra money).
  const solidStyle = `background:${color};color:#fff;padding:4px 10px;border-radius:4px;font-size:14px;font-weight:600;text-decoration:none;display:inline-block;margin:2px 4px 2px 0;`;
  const outlineStyle = `border:2px solid ${color};color:${color};background:transparent;padding:3px 9px;border-radius:4px;font-size:13px;font-weight:500;text-decoration:none;display:inline-block;margin:2px 4px 2px 0;`;
  const style = isPaid ? outlineStyle : solidStyle;

  if (badge.url && badge.status !== 404) {
    const titleAttr = badge.status === null ? `${label} (unverified link)` : label;
    return `<a href="${escHtml(badge.url)}" target="_blank" rel="noopener" style="${style}" title="${titleAttr}">${label}</a>`;
  }

  if (!badge.url && badge.base) {
    // TMDB confirmed it's on the service but no direct URL yet
    return `<a href="${escHtml(badge.base)}" target="_blank" rel="noopener" style="${style};opacity:0.8;" title="Search on ${badge.name}">${label} ↗</a>`;
  }

  // Dead URL (404) — suppressed per plan
  return '';
}

// ─── Show card ────────────────────────────────────────────────────────────────

function renderCard(row: FeaturedShowRow, services: ServiceBadge[]): string {
  const genres: string[] = row.genres ? JSON.parse(row.genres) : [];
  const genreStr = genres.join(', ');
  const ratingStr = row.rating ? (row.rating * 10).toFixed(0) + '/100' : '—';
  const yearStr = row.release_year ? String(row.release_year) : '';
  const typeLabel = row.show_type === 'series' ? 'TV Series' : 'Movie';
  const seasonStr = row.season_count ? ` · ${row.season_count} seasons` : '';
  const runtimeStr = row.runtime_minutes
    ? row.show_type === 'movie'
      ? ` · ${Math.floor(row.runtime_minutes / 60)}h ${row.runtime_minutes % 60}m`
      : ` · ~${row.runtime_minutes}m/ep`
    : '';

  const overview = row.overview ? escHtml(row.overview.slice(0, 300)) + (row.overview.length > 300 ? '…' : '') : '';
  const img = row.image_url ? `<img src="${escHtml(row.image_url)}" alt="${escHtml(row.title)}" loading="lazy" style="width:90px;border-radius:4px;flex-shrink:0;">` : '<div style="width:90px;height:135px;background:#ddd;border-radius:4px;flex-shrink:0;"></div>';

  const badgesHtml = services.map(renderBadge).join('');
  const youtubeHtml = row.youtube_url
    ? `<a href="${escHtml(row.youtube_url)}" target="_blank" rel="noopener" style="background:#FF0000;color:#fff;padding:4px 10px;border-radius:4px;font-size:14px;font-weight:600;text-decoration:none;display:inline-block;margin:2px 4px 2px 0;">YouTube</a>`
    : '';

  return `
  <div class="show-card" data-title="${escHtml(row.title)}" data-type="${row.show_type}" data-genres="${escHtml(genreStr)}" data-rating="${row.rating ?? 0}" data-year="${row.release_year ?? 0}">
    <div style="display:flex;gap:12px;">
      ${img}
      <div style="flex:1;min-width:0;">
        <div style="font-size:20px;font-weight:700;margin-bottom:4px;">${escHtml(row.title)}</div>
        <div style="color:#666;font-size:14px;margin-bottom:8px;">${typeLabel}${yearStr ? ' · ' + yearStr : ''}${seasonStr}${runtimeStr} · Rating: ${ratingStr}</div>
        ${genreStr ? `<div style="color:#888;font-size:13px;margin-bottom:8px;">${escHtml(genreStr)}</div>` : ''}
        <div style="font-size:15px;color:#333;margin-bottom:10px;line-height:1.4;">${overview}</div>
        <div style="display:flex;flex-wrap:wrap;gap:0;">
          ${badgesHtml}${youtubeHtml}
        </div>
      </div>
    </div>
  </div>`;
}

// ─── Full page ────────────────────────────────────────────────────────────────

function renderPage(cards: string[], totalCount: number): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AlzheimersTv — Streaming Guide</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: Georgia, 'Times New Roman', serif;
      background: #f5f0eb;
      margin: 0; padding: 0;
      color: #222;
    }
    header {
      background: #2c3e50;
      color: #fff;
      padding: 20px 24px;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 16px;
    }
    header h1 { margin: 0; font-size: 28px; font-weight: 700; flex: 1; }
    header .subtitle { font-size: 16px; opacity: 0.8; }
    .controls {
      background: #fff;
      border-bottom: 1px solid #ddd;
      padding: 14px 24px;
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      align-items: center;
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .controls label { font-size: 15px; font-weight: 600; margin-right: 4px; }
    .controls input, .controls select {
      font-size: 15px;
      padding: 6px 10px;
      border: 1px solid #ccc;
      border-radius: 4px;
    }
    .controls input[type=text] { width: 200px; }
    .count { font-size: 14px; color: #666; margin-left: auto; }
    main { padding: 16px 24px; max-width: 960px; margin: 0 auto; }
    .show-card {
      background: #fff;
      border: 1px solid #e0d9d0;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 16px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
    }
    .show-card.hidden { display: none; }
    footer {
      text-align: center;
      padding: 24px;
      color: #999;
      font-size: 13px;
    }
  </style>
</head>
<body>
  <header>
    <div>
      <h1>AlzheimersTv</h1>
      <div class="subtitle">Streaming shows curated for older viewers</div>
    </div>
  </header>

  <div class="controls">
    <label for="search">Search:</label>
    <input type="text" id="search" placeholder="Title, genre…" oninput="filterShows()">

    <label for="typeFilter">Type:</label>
    <select id="typeFilter" onchange="filterShows()">
      <option value="">All</option>
      <option value="movie">Movies</option>
      <option value="series">TV Series</option>
    </select>

    <label for="sortBy">Sort:</label>
    <select id="sortBy" onchange="sortShows()">
      <option value="rating">Rating (high→low)</option>
      <option value="year-desc">Year (newest)</option>
      <option value="year-asc">Year (oldest)</option>
      <option value="title">Title A→Z</option>
    </select>

    <span class="count" id="countLabel">${totalCount} shows</span>
  </div>

  <main id="showList">
    ${cards.join('\n')}
  </main>

  <footer>
    Updated ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} ·
    ${totalCount} curated titles · AlzheimersTv
  </footer>

  <script>
    function filterShows() {
      const q = document.getElementById('search').value.toLowerCase().trim();
      const type = document.getElementById('typeFilter').value;
      let visible = 0;
      document.querySelectorAll('.show-card').forEach(card => {
        const titleMatch = !q || card.dataset.title.toLowerCase().includes(q) || card.dataset.genres.toLowerCase().includes(q);
        const typeMatch = !type || card.dataset.type === type;
        const show = titleMatch && typeMatch;
        card.classList.toggle('hidden', !show);
        if (show) visible++;
      });
      document.getElementById('countLabel').textContent = visible + ' shows';
    }

    function sortShows() {
      const sort = document.getElementById('sortBy').value;
      const list = document.getElementById('showList');
      const cards = Array.from(list.querySelectorAll('.show-card'));
      cards.sort((a, b) => {
        if (sort === 'rating') return parseFloat(b.dataset.rating) - parseFloat(a.dataset.rating);
        if (sort === 'year-desc') return parseInt(b.dataset.year) - parseInt(a.dataset.year);
        if (sort === 'year-asc') return parseInt(a.dataset.year) - parseInt(b.dataset.year);
        if (sort === 'title') return a.dataset.title.localeCompare(b.dataset.title);
        return 0;
      });
      cards.forEach(c => list.appendChild(c));
    }
  </script>
</body>
</html>`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function escHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── Entry point ──────────────────────────────────────────────────────────────

export async function generateHtml(): Promise<void> {
  console.log('=== Generating HTML ===');

  const rows = getFeaturedShowsForHtml() as FeaturedShowRow[];
  console.log(`  ${rows.length} featured shows found.`);

  const cards: string[] = [];

  for (const row of rows) {
    let services: ServiceBadge[] = [];
    try {
      const parsed = JSON.parse(row.services ?? '[]');
      // Deduplicate by service+access combination
      const seen = new Set<string>();
      for (const b of parsed) {
        if (!b || !b.service) continue;
        const key = `${b.service}|${b.access}`;
        if (seen.has(key)) continue;
        seen.add(key);
        services.push(b as ServiceBadge);
      }
    } catch {
      // malformed JSON — treat as no services
    }

    cards.push(renderCard(row, services));
  }

  const html = renderPage(cards, rows.length);
  const outPath = resolve(ROOT, 'index.html');
  writeFileSync(outPath, html, 'utf-8');
  console.log(`  Written: ${outPath}`);
  console.log('HTML generation complete.');
}
