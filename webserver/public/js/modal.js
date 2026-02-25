/**
 * Detail modal — open/close/populate.
 * Opens when a show card is clicked.
 */
import { renderBadge, ratingStars } from './render.js';

const modal = document.getElementById('modal');
const modalBody = document.getElementById('modal-body');
const modalClose = document.getElementById('modal-close');
const modalBackdrop = document.getElementById('modal-backdrop');

// Close handlers
modalClose?.addEventListener('click', closeModal);
modalBackdrop?.addEventListener('click', closeModal);
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
});

export function openModal(show) {
  if (!modal || !modalBody) return;

  // Clear previous content
  modalBody.innerHTML = '';

  // ── Poster ──────────────────────────────────────────────────────────────────
  const inner = document.createElement('div');
  inner.className = 'modal-inner';

  const posterDiv = document.createElement('div');
  posterDiv.className = 'modal-poster';
  if (show.image_url) {
    const img = document.createElement('img');
    img.src = show.image_url;
    img.alt = show.title;
    img.width = 160;
    posterDiv.appendChild(img);
  } else {
    const ph = document.createElement('div');
    ph.className = 'modal-poster-placeholder';
    ph.textContent = show.title.charAt(0).toUpperCase();
    posterDiv.appendChild(ph);
  }
  inner.appendChild(posterDiv);

  // ── Info column ─────────────────────────────────────────────────────────────
  const info = document.createElement('div');
  info.className = 'modal-info';

  // Title
  const h2 = document.createElement('h2');
  h2.id = 'modal-title';
  h2.textContent = show.title;
  info.appendChild(h2);

  // Meta
  const meta = document.createElement('div');
  meta.className = 'modal-meta';
  const typeParts = [show.show_type === 'series' ? 'TV Series' : 'Movie'];
  if (show.release_year) typeParts.push(String(show.release_year));
  if (show.show_type === 'series' && show.season_count) {
    typeParts.push(`${show.season_count} season${show.season_count !== 1 ? 's' : ''}`);
  }
  if (show.show_type === 'movie' && show.runtime_minutes) {
    const h = Math.floor(show.runtime_minutes / 60);
    const m = show.runtime_minutes % 60;
    typeParts.push(h > 0 ? `${h}h ${m}m` : `${m}m`);
  }
  meta.textContent = typeParts.join(' · ');
  if (show.rating != null) {
    const span = document.createElement('span');
    span.className = 'star';
    span.textContent = `  ★ ${Math.round(show.rating * 10)}/100`;
    meta.appendChild(span);
  }
  info.appendChild(meta);

  // Genres
  if (show.genres?.length) {
    const genreDiv = document.createElement('div');
    genreDiv.className = 'modal-genres';
    for (const g of show.genres) {
      const tag = document.createElement('span');
      tag.className = 'genre-tag';
      tag.textContent = g;
      genreDiv.appendChild(tag);
    }
    info.appendChild(genreDiv);
  }

  // Overview (full, no truncation)
  if (show.overview) {
    const p = document.createElement('p');
    p.className = 'modal-overview';
    p.textContent = show.overview;
    info.appendChild(p);
  }

  // Watch on label + badges
  if (show.services?.length) {
    const label = document.createElement('div');
    label.className = 'modal-watch-label';
    label.textContent = 'Watch on';
    info.appendChild(label);

    const badgesDiv = document.createElement('div');
    badgesDiv.className = 'modal-badges';
    for (const svc of show.services) {
      const el = renderBadge(svc);
      if (el) badgesDiv.appendChild(el);
    }
    info.appendChild(badgesDiv);
  }

  // YouTube button
  if (show.youtube_url) {
    const yt = document.createElement('a');
    yt.className = 'modal-youtube';
    yt.href = show.youtube_url;
    yt.target = '_blank';
    yt.rel = 'noopener noreferrer';
    yt.textContent = '▶ Watch on YouTube';
    info.appendChild(yt);
  }

  // Stars section (placeholder — populated by stars.js after modal opens)
  const starsSection = document.createElement('div');
  starsSection.className = 'modal-stars';
  starsSection.dataset.showId = String(show.id);
  info.appendChild(starsSection);

  inner.appendChild(info);
  modalBody.appendChild(inner);

  // Show modal
  modal.removeAttribute('hidden');
  modal.focus?.();

  // Notify stars.js to render into the modal stars section
  modal.dispatchEvent(new CustomEvent('modalopened', { detail: show }));
}

export function closeModal() {
  modal?.setAttribute('hidden', '');
}
