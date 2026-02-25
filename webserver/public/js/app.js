/**
 * app.js — Entry point
 * Orchestrates state, fetches data, wires up events, drives refresh cycle.
 */
import { applyFilters } from './filters.js';
import { renderList, updateCount } from './render.js';
import { openModal } from './modal.js';
import { initStars, loadRatingsForShows } from './stars.js';

// ─── State ────────────────────────────────────────────────────────────────────

const state = {
  shows:         [],    // raw from API — never mutated
  services:      [],    // raw from API
  filtered:      [],    // result of applyFilters()
  searchQuery:   '',
  typeFilter:    'all', // 'all' | 'movie' | 'series'
  serviceFilter: new Set(),  // Set of selected service_ids (empty = no filter)
  accessFilter:  'all', // 'all' | 'free' | 'paid'
  sortBy:        'rating',
};

// ─── Core refresh ─────────────────────────────────────────────────────────────

function refresh() {
  state.filtered = applyFilters(state.shows, state);
  renderList(state.filtered, document.getElementById('show-list'));
  updateCount(state.filtered.length, state.shows.length);
}

// ─── Service filter bar ───────────────────────────────────────────────────────

function buildServiceButtons(services) {
  const row = document.getElementById('service-filter-row');
  if (!row) return;
  row.innerHTML = '';

  // "All" button — active when no service filter is active
  const allBtn = document.createElement('button');
  allBtn.className = 'service-btn all-services-btn';
  allBtn.id = 'all-services-btn';
  allBtn.textContent = 'All';
  allBtn.addEventListener('click', () => {
    state.serviceFilter.clear();
    updateServiceButtons();
    refresh();
  });
  row.appendChild(allBtn);

  for (const svc of services) {
    const btn = document.createElement('button');
    btn.className = 'service-btn';
    btn.textContent = svc.display_name;
    btn.dataset.serviceId = svc.id;
    btn.style.setProperty('--service-color', svc.color_hex ?? '#666');

    btn.addEventListener('click', () => {
      if (state.serviceFilter.has(svc.id)) {
        state.serviceFilter.delete(svc.id);
      } else {
        state.serviceFilter.add(svc.id);
      }
      updateServiceButtons();
      refresh();
    });

    row.appendChild(btn);
  }
}

function updateServiceButtons() {
  const isAll = state.serviceFilter.size === 0;

  const allBtn = document.getElementById('all-services-btn');
  if (allBtn) allBtn.classList.toggle('active', isAll);

  document.querySelectorAll('.service-btn:not(.all-services-btn)').forEach(btn => {
    btn.classList.toggle('active', state.serviceFilter.has(btn.dataset.serviceId));
  });
}

// ─── Event wiring ─────────────────────────────────────────────────────────────

function wireEvents() {
  // Search
  document.getElementById('search-input')?.addEventListener('input', e => {
    state.searchQuery = e.target.value.trim();
    refresh();
  });

  // Type filter buttons
  document.getElementById('type-filter')?.addEventListener('click', e => {
    const btn = e.target.closest('.toggle-btn');
    if (!btn) return;
    state.typeFilter = btn.dataset.type;
    document.querySelectorAll('#type-filter .toggle-btn').forEach(b =>
      b.classList.toggle('active', b === btn)
    );
    refresh();
  });

  // Access filter buttons
  document.getElementById('access-filter')?.addEventListener('click', e => {
    const btn = e.target.closest('.toggle-btn');
    if (!btn) return;
    state.accessFilter = btn.dataset.access;
    document.querySelectorAll('#access-filter .toggle-btn').forEach(b =>
      b.classList.toggle('active', b === btn)
    );
    refresh();
  });

  // Sort
  document.getElementById('sort-select')?.addEventListener('change', e => {
    state.sortBy = e.target.value;
    refresh();
  });

  // Card click → open modal
  document.getElementById('show-list')?.addEventListener('click', e => {
    const card = e.target.closest('.show-card');
    if (!card) return;
    const showId = parseInt(card.dataset.showId, 10);
    const show = state.shows.find(s => s.id === showId);
    if (show) openModal(show);
  });
}

// ─── Init ─────────────────────────────────────────────────────────────────────

async function init() {
  try {
    const [showsRes, servicesRes] = await Promise.all([
      fetch('/api/shows'),
      fetch('/api/services'),
    ]);

    if (!showsRes.ok) throw new Error(`/api/shows returned ${showsRes.status}`);
    if (!servicesRes.ok) throw new Error(`/api/services returned ${servicesRes.status}`);

    state.shows = await showsRes.json();
    state.services = await servicesRes.json();

    // Build dynamic service buttons from services API
    buildServiceButtons(state.services);

    // Wire up all events
    wireEvents();

    // Initialize optional Supabase star ratings
    if (window.supabase) {
      initStars(window.supabase);
      // Pre-load ratings for all shows
      loadRatingsForShows(state.shows.map(s => s.id));
    }

    // Initial render
    refresh();

  } catch (err) {
    const list = document.getElementById('show-list');
    if (list) {
      list.innerHTML = `<div class="no-results">
        <p>Could not load shows.</p>
        <small>${err.message}</small>
      </div>`;
    }
    console.error('AlzheimersTv init error:', err);
  }
}

document.addEventListener('DOMContentLoaded', init);
