export interface Config {
  apiKey: string;
  country: string;
  maxItemsToProcess: number;
  targetServices: string[];
  minYear: number;
  movies: {
    csvInputFile: string;
    outputHtmlFile: string;
  };
  tvShows: {
    csvInputFile: string;
    outputHtmlFile: string;
  };
}

export interface ShowInput {
  title: string;
  year?: number;
  imdbId?: string;
  tmdbId?: string;
}

export interface ShowWithStreaming {
  title: string;
  year: number;
  overview: string;
  rating: number;
  imageUrl: string;
  genres: string[];
  streamingServices: StreamingService[];
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
}
