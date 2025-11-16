import * as streamingAvailability from 'streaming-availability';
import { ShowInput, ShowWithStreaming, StreamingService } from './types.js';

export class StreamingApiClient {
  private client: streamingAvailability.Client;
  private country: string;
  private targetServices: string[];

  constructor(apiKey: string, country: string, targetServices: string[]) {
    this.client = new streamingAvailability.Client(
      new streamingAvailability.Configuration({
        apiKey: apiKey,
      })
    );
    this.country = country;
    this.targetServices = targetServices;
  }

  async getShowDetails(
    input: ShowInput,
    showType: 'movie' | 'series'
  ): Promise<ShowWithStreaming | null> {
    try {
      let show: streamingAvailability.Show | null = null;

      // Try to get by IMDb or TMDb ID first
      if (input.imdbId) {
        try {
          show = await this.client.showsApi.getShow({
            id: input.imdbId,
            country: this.country,
          });
        } catch (error) {
          console.log(`Could not find ${showType} by IMDb ID: ${input.imdbId}`);
        }
      } else if (input.tmdbId) {
        try {
          show = await this.client.showsApi.getShow({
            id: input.tmdbId,
            country: this.country,
          });
        } catch (error) {
          console.log(`Could not find ${showType} by TMDb ID: ${input.tmdbId}`);
        }
      }

      // If no ID or ID lookup failed, search by title
      if (!show) {
        const apiShowType = showType === 'movie'
          ? streamingAvailability.ShowType.Movie
          : streamingAvailability.ShowType.Series;

        const searchResults = await this.client.showsApi.searchShowsByTitle({
          title: input.title,
          country: this.country,
          showType: apiShowType,
        });

        if (searchResults.length === 0) {
          console.log(`No results found for: ${input.title}`);
          return null;
        }

        // Find best match (exact title match or first result)
        show = searchResults.find(s =>
          s.title.toLowerCase() === input.title.toLowerCase() ||
          s.originalTitle?.toLowerCase() === input.title.toLowerCase()
        ) || searchResults[0];
      }

      // Check if available on target streaming services
      const streamingOptions = show.streamingOptions?.[this.country] || [];
      const availableServices: StreamingService[] = [];

      for (const option of streamingOptions) {
        if (this.targetServices.includes(option.service.id)) {
          availableServices.push({
            name: option.service.name,
            link: option.link,
            type: option.type,
            quality: option.quality,
          });
        }
      }

      // Only return shows available on at least one target service
      if (availableServices.length === 0) {
        console.log(`${show.title} not available on target services`);
        return null;
      }

      return {
        title: show.title,
        year: show.releaseYear || 0,
        overview: show.overview || '',
        rating: show.rating || 0,
        imageUrl: show.imageSet?.verticalPoster?.w480 || show.imageSet?.horizontalPoster?.w480 || '',
        genres: show.genres.map(g => g.name),
        streamingServices: availableServices,
        imdbId: show.imdbId,
        runtime: show.runtime,
        showType: showType,
        episodeCount: show.episodeCount,
        seasonCount: show.seasonCount,
      };
    } catch (error: any) {
      console.error(`Error fetching ${showType} ${input.title}:`, error.message);
      return null;
    }
  }

  async getShowsWithStreaming(
    shows: ShowInput[],
    showType: 'movie' | 'series'
  ): Promise<ShowWithStreaming[]> {
    const results: ShowWithStreaming[] = [];

    for (const show of shows) {
      console.log(`Processing ${showType}: ${show.title}...`);

      const showDetails = await this.getShowDetails(show, showType);

      if (showDetails) {
        results.push(showDetails);
        console.log(`✓ Found ${showDetails.title} (${showDetails.year}) on ${showDetails.streamingServices.length} service(s)`);
      }

      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return results;
  }
}
