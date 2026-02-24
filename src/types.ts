export interface Config {
  apiKey: string;
  youtubeApiKey?: string; // Optional YouTube Data API v3 key for YouTube discovery
  country: string;
  maxItemsToProcess: number;
  targetServices: string[];
  minYear: number;
  cacheDays: number;
  movies: {
    csvInputFile: string;
    outputHtmlFile: string;
    detailsDirectory: string;
  };
  tvShows: {
    csvInputFile: string;
    outputHtmlFile: string;
    detailsDirectory: string;
  };
}

export interface ShowInput {
  title: string;
  year?: number;
  imdbId?: string;
  tmdbId?: string;
  // Cached data from previous API calls
  lastApiCall?: string;
  lastApiCallFailed?: string; // 'true' or 'false' - whether the last API call failed
  cachedYear?: number;
  cachedRating?: number;
  cachedOverview?: string;
  cachedGenres?: string;
  cachedRuntime?: number;
  cachedSeasonCount?: number;
  cachedImageUrl?: string;
  cachedShowUrl?: string; // Movie of the Night show page URL
  cachedFreeServices?: string;
  cachedPaidServices?: string;
  youtubeUrl?: string; // YouTube URL if available, or 'not on youtube' if checked
}

export interface ShowWithStreaming {
  title: string;
  year: number;
  overview: string;
  rating: number;
  imageUrl: string;
  showUrl: string; // Movie of the Night show page URL
  genres: string[];
  freeStreamingServices: StreamingService[];
  paidStreamingServices: StreamingService[];
  imdbId?: string;
  runtime?: number;
  showType: 'movie' | 'series';
  episodeCount?: number;
  seasonCount?: number;
  youtubeUrl?: string; // YouTube URL if available
}

export interface StreamingService {
  name: string;
  link: string;
  type: string;
  quality?: string;
  isFree: boolean;
}
