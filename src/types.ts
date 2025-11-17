export interface Config {
  apiKey: string;
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
  cachedFreeServices?: string;
  cachedPaidServices?: string;
}

export interface ShowWithStreaming {
  title: string;
  year: number;
  overview: string;
  rating: number;
  imageUrl: string;
  genres: string[];
  freeStreamingServices: StreamingService[];
  paidStreamingServices: StreamingService[];
  imdbId?: string;
  runtime?: number;
  showType: 'movie' | 'series';
  episodeCount?: number;
  seasonCount?: number;
}

export interface StreamingService {
  name: string;
  link: string;
  type: string;
  quality?: string;
  isFree: boolean;
}
