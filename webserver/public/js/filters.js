/**
 * Pure filter + sort functions — no DOM access, no side effects.
 * All state is passed in; nothing is read from globals.
 */

/** Mirrors renderBadge suppression rules — true if the badge would actually render. */
function isVisibleBadge(s) {
  if (s.stream_url_status === 404) return false;
  if (s.access_type === 'buy') return false;
  if (s.service_id === 'prime' && s.access_type === 'free') return false;
  return !!(s.stream_url ?? s.base_url);
}

export function applyFilters(shows, state) {
  let result = shows.filter(show => {
    // Always hide shows with no visible badges
    if (!show.services.some(isVisibleBadge)) return false;

    // Search: title or any genre
    if (state.searchQuery) {
      const q = state.searchQuery.toLowerCase();
      const titleMatch = show.title.toLowerCase().includes(q);
      const genreMatch = show.genres.some(g => g.toLowerCase().includes(q));
      if (!titleMatch && !genreMatch) return false;
    }

    // Type filter
    if (state.typeFilter !== 'all' && show.show_type !== state.typeFilter) {
      return false;
    }

    // Service filter — show must be on at least one of the selected services
    if (state.serviceFilter.size > 0) {
      const has = show.services.some(s => state.serviceFilter.has(s.service_id));
      if (!has) return false;
    }

    // Access filter
    if (state.accessFilter === 'free') {
      const hasFree = show.services.some(
        s => s.is_free === 1 || s.access_type === 'free'
      );
      if (!hasFree) return false;
    } else if (state.accessFilter === 'paid') {
      const hasPaid = show.services.some(
        s => s.is_free === 0 &&
          (s.access_type === 'subscription' || s.access_type === 'rent')
      );
      if (!hasPaid) return false;
    }

    return true;
  });

  // Sort
  result = [...result].sort((a, b) => {
    switch (state.sortBy) {
      case 'rating':    return (b.rating ?? 0) - (a.rating ?? 0);
      case 'year-desc': return (b.release_year ?? 0) - (a.release_year ?? 0);
      case 'year-asc':  return (a.release_year ?? 0) - (b.release_year ?? 0);
      case 'title':     return a.title.localeCompare(b.title);
      default:          return 0;
    }
  });

  return result;
}
