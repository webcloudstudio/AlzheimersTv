// ─── DB row shapes ────────────────────────────────────────────────────────────

export interface Show {
  id?: number;
  tmdb_id: number;
  imdb_id?: string | null;
  title: string;
  original_title?: string | null;
  show_type: 'movie' | 'series';
  release_year?: number | null;
  runtime_minutes?: number | null;
  season_count?: number | null;
  overview?: string | null;
  rating?: number | null;
  genres?: string | null; // JSON array string e.g. '["Drama","Crime"]'
  image_url?: string | null;
  youtube_url?: string | null;
  is_featured: number; // 0 or 1
  tmdb_fetched_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Service {
  id: string;
  display_name: string;
  is_free: number; // 0 or 1
  color_hex?: string | null;
  base_url: string;
}

export interface StreamingAvailabilityRow {
  id?: number;
  show_id: number;
  service_id: string;
  access_type: 'subscription' | 'free' | 'rent' | 'buy';
  stream_url?: string | null;
  stream_url_verified_at?: string | null;
  stream_url_status?: number | null;
  price?: number | null;           // rent/buy price in USD from Watchmode
  source: 'tmdb_providers' | 'watchmode' | 'motn' | 'manual';
  fetched_at?: string;
}

export interface FeaturedShow {
  show_id: number;
  priority: number;
  curator_notes?: string | null;
  content_warnings?: string | null; // JSON array string
  seniority_score?: number | null;
  url_enrich_status: 'pending' | 'partial' | 'complete' | 'failed';
  watchmode_id?: number | null;
  last_enrich_at?: string | null;
  curated_at?: string;
}

// ─── Config ───────────────────────────────────────────────────────────────────

export interface Config {
  dbPath: string;
  tmdbApiKey: string;
  watchmodeApiKey: string;
  motnApiKey: string;
  country: string;
  targetServices: string[];
  pipeline: {
    watchmodeDailyBudget: number;
    watchmodeMonthlyBudget: number;
    motnDailyBudget: number;
    urlVerifyPerRun: number;
    tmdbRatePerSecond: number;
  };
  seedCsvs: {
    movies: string;
    tvshows: string;
  };
}

// ─── TMDB API response shapes ─────────────────────────────────────────────────

export interface TmdbMovieResponse {
  id: number;
  imdb_id?: string;
  title?: string;
  original_title?: string;
  overview?: string;
  vote_average?: number;
  release_date?: string; // "YYYY-MM-DD"
  runtime?: number;
  genres?: Array<{ id: number; name: string }>;
  poster_path?: string | null;
}

export interface TmdbTvResponse {
  id: number;
  external_ids?: { imdb_id?: string };
  name?: string;
  original_name?: string;
  overview?: string;
  vote_average?: number;
  first_air_date?: string; // "YYYY-MM-DD"
  episode_run_time?: number[];
  number_of_seasons?: number;
  genres?: Array<{ id: number; name: string }>;
  poster_path?: string | null;
}

export interface TmdbProviderEntry {
  provider_id: number;
  provider_name: string;
}

export interface TmdbProvidersResponse {
  id: number;
  results?: {
    US?: {
      flatrate?: TmdbProviderEntry[];
      free?: TmdbProviderEntry[];
      ads?: TmdbProviderEntry[];
      rent?: TmdbProviderEntry[];
      buy?: TmdbProviderEntry[];
    };
  };
}

// ─── Watchmode API response shapes ────────────────────────────────────────────

export interface WatchmodeSource {
  source_id: number;
  name: string;
  type: string;
  region: string;
  web_url: string;
  format: string;
  price: number | null;
  seasons?: number[] | null;
  episodes?: number[] | null;
}

export interface WatchmodeTitleResponse {
  id: number;
  title: string;
  sources?: WatchmodeSource[];
}

// ─── HTML generation ──────────────────────────────────────────────────────────

export interface ServiceBadge {
  service: string;
  url: string | null;
  status: number | null;
  access: string;   // 'subscription' | 'free' | 'rent' | 'buy'
  price: number | null;
  name: string;
  color: string | null;
  base: string;
}

export interface FeaturedShowRow extends Show {
  curator_notes: string | null;
  seniority_score: number | null;
  services: string; // JSON from json_group_array
}

// ─── CSV seed input ───────────────────────────────────────────────────────────
// Minimal format: title (required), imdbId and year are optional identifiers.
// Everything else is stored in the DB — don't put it in the CSV.

export interface CsvRow {
  title: string;
  imdbId?: string;   // IMDB ID for reliable TMDB lookup
  year?: string;     // release year, helps disambiguate title searches
  [key: string]: string | undefined;
}
