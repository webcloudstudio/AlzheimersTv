// ─── API response shapes sent to the browser ─────────────────────────────────

export interface ApiServiceBadge {
  service_id: string;
  display_name: string;
  access_type: 'subscription' | 'free' | 'rent' | 'buy';
  stream_url: string | null;
  stream_url_status: number | null;
  price: number | null;
  color_hex: string | null;
  base_url: string;
  is_free: number; // 0 or 1
}

export interface ApiShow {
  id: number;
  tmdb_id: number;
  title: string;
  show_type: 'movie' | 'series';
  release_year: number | null;
  runtime_minutes: number | null;
  season_count: number | null;
  overview: string | null;
  rating: number | null;        // TMDB vote_average 0.0–10.0
  genres: string[];             // parsed from DB JSON string
  image_url: string | null;
  youtube_url: string | null;
  services: ApiServiceBadge[];  // deduplicated by service_id+access_type
}

export interface ApiService {
  id: string;
  display_name: string;
  is_free: number;
  color_hex: string | null;
  base_url: string;
}

// ─── Raw DB row shapes (internal) ────────────────────────────────────────────

export interface RawShowRow {
  id: number;
  tmdb_id: number;
  title: string;
  show_type: string;
  release_year: number | null;
  runtime_minutes: number | null;
  season_count: number | null;
  overview: string | null;
  rating: number | null;
  genres: string | null;        // JSON string from DB
  image_url: string | null;
  youtube_url: string | null;
  services_json: string;        // JSON from json_group_array
}
