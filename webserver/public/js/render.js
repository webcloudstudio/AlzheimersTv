/**
 * DOM rendering — no state, no fetch calls.
 * Uses createElement + textContent (never innerHTML with data) for XSS safety.
 */

// ─── Badge ────────────────────────────────────────────────────────────────────

export function renderBadge(badge) {
  if (badge.stream_url_status === 404) return null; // suppressed
  if (badge.access_type === 'buy') return null;     // buy is always available; not useful
  if (badge.service_id === 'prime' && badge.access_type === 'free') return null; // inaccurate; true free Amazon content is on Amazon Freevee

  const isPaid = badge.access_type === 'rent';
  const color = badge.color_hex ?? '#666';
  const priceStr = badge.price != null ? ` $${badge.price.toFixed(2)}` : '';
  const label = isPaid
    ? `${badge.display_name} (rent${priceStr})`
    : badge.display_name;

  const href = badge.stream_url ?? badge.base_url;
  if (!href) return null;

  const a = document.createElement('a');
  a.className = 'badge ' + (isPaid ? 'badge-outlined' : 'badge-solid');
  a.href = href;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';

  if (isPaid) {
    a.style.color = color;
    a.style.borderColor = color;
  } else {
    a.style.background = color;
  }

  if (!badge.stream_url && badge.base_url) {
    // No direct URL — TMDB confirmed service, link to homepage
    a.classList.add('badge-dim');
    a.title = `Search on ${badge.display_name}`;
    a.textContent = label + ' ↗';
  } else {
    if (badge.stream_url_status === null) {
      a.title = `${label} (unverified link)`;
    }
    a.textContent = label;
  }

  // Stop card-click from opening modal when user clicks a badge
  a.addEventListener('click', e => e.stopPropagation());

  return a;
}

// ─── Poster ───────────────────────────────────────────────────────────────────

function makePoster(show, size = 90) {
  if (show.image_url) {
    const img = document.createElement('img');
    img.src = show.image_url;
    img.alt = show.title;
    img.loading = 'lazy';
    img.width = size;
    return img;
  }
  const div = document.createElement('div');
  div.className = size > 100 ? 'modal-poster-placeholder' : 'card-poster-placeholder';
  div.textContent = show.title.charAt(0).toUpperCase();
  return div;
}

// ─── Rating star display ──────────────────────────────────────────────────────

export function ratingStars(rating) {
  if (rating == null) return '—';
  const pct = Math.round(rating * 10); // 0–100
  const full = Math.floor(pct / 20);   // 0–5 stars
  const half = (pct % 20) >= 10 ? 1 : 0;
  const stars = '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(5 - full - half);
  return `${stars} ${pct}/100`;
}

// ─── Meta line ────────────────────────────────────────────────────────────────

function metaLine(show) {
  const parts = [show.show_type === 'series' ? 'TV Series' : 'Movie'];
  if (show.release_year) parts.push(String(show.release_year));
  if (show.show_type === 'series' && show.season_count) {
    parts.push(`${show.season_count} season${show.season_count !== 1 ? 's' : ''}`);
  }
  if (show.show_type === 'movie' && show.runtime_minutes) {
    const h = Math.floor(show.runtime_minutes / 60);
    const m = show.runtime_minutes % 60;
    parts.push(h > 0 ? `${h}h ${m}m` : `${m}m`);
  }
  if (show.show_type === 'series' && show.runtime_minutes) {
    parts.push(`~${show.runtime_minutes}m/ep`);
  }
  return parts.join(' · ');
}

// ─── Show card ────────────────────────────────────────────────────────────────

export function renderCard(show) {
  const article = document.createElement('article');
  article.className = 'show-card';
  article.dataset.showId = String(show.id);

  // Poster
  const posterDiv = document.createElement('div');
  posterDiv.className = 'card-poster';
  posterDiv.appendChild(makePoster(show, 90));
  article.appendChild(posterDiv);

  // Body
  const body = document.createElement('div');
  body.className = 'card-body';

  // Title
  const h2 = document.createElement('h2');
  h2.className = 'card-title';
  h2.textContent = show.title;
  body.appendChild(h2);

  // Meta
  const meta = document.createElement('div');
  meta.className = 'card-meta';
  const metaTxt = metaLine(show);
  const ratingTxt = show.rating != null ? `  ★ ${Math.round(show.rating * 10)}/100` : '';
  meta.textContent = metaTxt;
  if (ratingTxt) {
    const ratingSpan = document.createElement('span');
    ratingSpan.className = 'star';
    ratingSpan.textContent = ratingTxt;
    meta.appendChild(ratingSpan);
  }
  body.appendChild(meta);

  // Genres
  if (show.genres.length) {
    const genresDiv = document.createElement('div');
    genresDiv.className = 'card-genres';
    for (const g of show.genres) {
      const tag = document.createElement('span');
      tag.className = 'genre-tag';
      tag.textContent = g;
      genresDiv.appendChild(tag);
    }
    body.appendChild(genresDiv);
  }

  // Overview (truncated)
  if (show.overview) {
    const p = document.createElement('p');
    p.className = 'card-overview';
    const truncated = show.overview.length > 280
      ? show.overview.slice(0, 280) + '…'
      : show.overview;
    p.textContent = truncated;
    body.appendChild(p);
  }

  // Badges
  const badgesDiv = document.createElement('div');
  badgesDiv.className = 'card-badges';
  for (const svc of show.services) {
    const el = renderBadge(svc);
    if (el) badgesDiv.appendChild(el);
  }
  body.appendChild(badgesDiv);

  // Stars container (populated by stars.js)
  const starsDiv = document.createElement('div');
  starsDiv.className = 'card-stars';
  starsDiv.dataset.showId = String(show.id);
  body.appendChild(starsDiv);

  article.appendChild(body);
  return article;
}

// ─── List render ─────────────────────────────────────────────────────────────

export function renderList(shows, container) {
  const frag = document.createDocumentFragment();

  if (shows.length === 0) {
    const div = document.createElement('div');
    div.className = 'no-results';
    const p = document.createElement('p');
    p.textContent = 'No shows match your filters.';
    const small = document.createElement('small');
    small.textContent = 'Try clearing some filters or broadening your search.';
    div.appendChild(p);
    div.appendChild(small);
    frag.appendChild(div);
  } else {
    for (const show of shows) {
      frag.appendChild(renderCard(show));
    }
  }

  container.innerHTML = '';
  container.appendChild(frag);
}

// ─── Count label ──────────────────────────────────────────────────────────────

export function updateCount(visible, total) {
  const el = document.getElementById('count-label');
  if (el) el.textContent = `Showing ${visible} of ${total} shows`;
  const footer = document.getElementById('footer-count');
  if (footer) footer.textContent = String(total);
}
