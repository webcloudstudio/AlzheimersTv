/**
 * Optional Supabase star ratings.
 * If SUPABASE_URL / SUPABASE_ANON_KEY are not set, stars do not render.
 *
 * To enable: fill in the two constants below with your project credentials.
 * Supabase table required:
 *   CREATE TABLE show_ratings (
 *     id               BIGSERIAL PRIMARY KEY,
 *     show_id          INTEGER NOT NULL,
 *     rating           INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
 *     user_fingerprint TEXT NOT NULL,
 *     created_at       TIMESTAMPTZ DEFAULT NOW(),
 *     UNIQUE(show_id, user_fingerprint)
 *   );
 *   ALTER TABLE show_ratings ENABLE ROW LEVEL SECURITY;
 *   CREATE POLICY "public read"  ON show_ratings FOR SELECT USING (true);
 *   CREATE POLICY "public write" ON show_ratings FOR INSERT WITH CHECK (true);
 *   CREATE POLICY "public upsert" ON show_ratings FOR UPDATE USING (true);
 */

const SUPABASE_URL      = '';  // e.g. 'https://xyz.supabase.co'
const SUPABASE_ANON_KEY = '';  // public anon key

let supabaseClient = null;
let userFingerprint = null;
const ratingCache = new Map(); // showId → rating (1–5)

export function initStars(supabaseGlobal) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return; // not configured

  supabaseClient = supabaseGlobal.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Stable browser identity
  userFingerprint = localStorage.getItem('atv_uid');
  if (!userFingerprint) {
    userFingerprint = crypto.randomUUID();
    localStorage.setItem('atv_uid', userFingerprint);
  }

  // Listen for modal opens to render stars there too
  document.getElementById('modal')?.addEventListener('modalopened', e => {
    const show = e.detail;
    const section = document.querySelector(`.modal-stars[data-show-id="${show.id}"]`);
    if (section) renderStarsWidget(show.id, section);
  });
}

/** Render stars into a container that has data-show-id */
export function renderStarsWidget(showId, container) {
  if (!supabaseClient) return;

  container.innerHTML = '';

  const label = document.createElement('span');
  label.className = 'modal-stars-label';
  label.textContent = 'Your rating:';
  container.appendChild(label);

  const starsWrap = document.createElement('span');
  const currentRating = ratingCache.get(showId) ?? 0;

  for (let i = 1; i <= 5; i++) {
    const btn = document.createElement('button');
    btn.className = 'star-btn' + (i <= currentRating ? ' filled' : '');
    btn.textContent = '★';
    btn.title = `Rate ${i} star${i !== 1 ? 's' : ''}`;
    btn.dataset.value = String(i);

    btn.addEventListener('mouseenter', () => highlightStars(starsWrap, i));
    btn.addEventListener('mouseleave', () => highlightStars(starsWrap, ratingCache.get(showId) ?? 0));
    btn.addEventListener('click', () => saveRating(showId, i, container));

    starsWrap.appendChild(btn);
  }
  container.appendChild(starsWrap);

  const feedback = document.createElement('span');
  feedback.className = 'stars-feedback';
  container.appendChild(feedback);
}

function highlightStars(wrap, upTo) {
  wrap.querySelectorAll('.star-btn').forEach((btn, idx) => {
    btn.classList.toggle('filled', idx < upTo);
  });
}

async function saveRating(showId, rating, container) {
  if (!supabaseClient || !userFingerprint) return;

  const feedback = container.querySelector('.stars-feedback');
  if (feedback) feedback.textContent = 'Saving…';

  ratingCache.set(showId, rating);
  highlightStars(container, rating);

  const { error } = await supabaseClient.from('show_ratings').upsert(
    { show_id: showId, rating, user_fingerprint: userFingerprint },
    { onConflict: 'show_id,user_fingerprint' }
  );

  if (feedback) {
    feedback.textContent = error ? '✗ Error saving' : '✓ Saved';
    setTimeout(() => { if (feedback) feedback.textContent = ''; }, 2000);
  }
}

/** Pre-load ratings for a batch of show IDs */
export async function loadRatingsForShows(showIds) {
  if (!supabaseClient || !userFingerprint || !showIds.length) return;

  const { data } = await supabaseClient
    .from('show_ratings')
    .select('show_id, rating')
    .eq('user_fingerprint', userFingerprint)
    .in('show_id', showIds);

  if (data) {
    for (const row of data) {
      ratingCache.set(row.show_id, row.rating);
    }
  }
}
