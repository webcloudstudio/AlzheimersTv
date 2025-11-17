import * as streamingAvailability from 'streaming-availability';
import { ShowInput, ShowWithStreaming, StreamingService } from './types.js';

export class StreamingApiClient {
  private client: streamingAvailability.Client;
  private country: string;
  private targetServices: string[];
  private cacheDays: number;
  private refreshAll: boolean;
  private consecutiveErrors: number = 0;
  private maxConsecutiveErrors: number = 5;

  constructor(apiKey: string, country: string, targetServices: string[], cacheDays: number, refreshAll: boolean = false) {
    this.client = new streamingAvailability.Client(
      new streamingAvailability.Configuration({
        apiKey: apiKey,
      })
    );
    this.country = country;
    this.targetServices = targetServices;
    this.cacheDays = cacheDays;
    this.refreshAll = refreshAll;
  }

  private isCacheValid(lastApiCall?: string): boolean {
    if (!lastApiCall) return false;

    const lastCall = new Date(lastApiCall);
    const now = new Date();
    const daysDiff = (now.getTime() - lastCall.getTime()) / (1000 * 60 * 60 * 24);

    return daysDiff < this.cacheDays;
  }

  private isServiceFree(type: string, serviceName: string): boolean {
    // Subscription services are "free" (included in subscription)
    if (type === 'subscription') return true;

    // Amazon Prime Video subscription is free, but some content requires rental/purchase
    if (serviceName.toLowerCase().includes('prime') && type === 'addon') return false;
    if (type === 'rent' || type === 'buy') return false;

    return true;
  }

  private getFromCache(input: ShowInput, showType: 'movie' | 'series'): ShowWithStreaming | null {
    // Check if we have cached data (regardless of age)
    // Note: We don't check cachedYear because API often returns 0 for year, but we have the original year in input.year
    if (input.cachedRating === undefined) {
      return null;
    }

    console.log(`  ✓ Using cached data for ${input.title}`);

    const freeServices: StreamingService[] = [];
    const paidServices: StreamingService[] = [];

    // Parse cached services
    if (input.cachedFreeServices) {
      input.cachedFreeServices.split('|').forEach(entry => {
        const [name, link] = entry.split(':');
        if (name && link) {
          freeServices.push({ name, link, type: 'subscription', isFree: true });
        }
      });
    }

    if (input.cachedPaidServices) {
      input.cachedPaidServices.split('|').forEach(entry => {
        const [name, link] = entry.split(':');
        if (name && link) {
          paidServices.push({ name, link, type: 'rent/buy', isFree: false });
        }
      });
    }

    return {
      title: input.title,
      year: input.year || input.cachedYear || 0, // Prefer original year, fallback to cached, then 0
      overview: input.cachedOverview || '',
      rating: input.cachedRating,
      imageUrl: input.cachedImageUrl || '',
      genres: input.cachedGenres ? input.cachedGenres.split('|') : [],
      freeStreamingServices: freeServices,
      paidStreamingServices: paidServices,
      imdbId: input.imdbId,
      runtime: input.cachedRuntime,
      showType: showType,
      seasonCount: input.cachedSeasonCount,
    };
  }

  async getShowDetails(
    input: ShowInput,
    showType: 'movie' | 'series'
  ): Promise<ShowWithStreaming | null> {
    // In normal mode, skip if we recently attempted and failed
    if (!this.refreshAll && input.lastApiCallFailed === 'true' && this.isCacheValid(input.lastApiCall)) {
      console.log(`  ⏭ Skipping ${input.title} - API call failed within cache period`);
      return null;
    }

    // Try to use cache first (unless refresh-all mode)
    if (!this.refreshAll) {
      const cached = this.getFromCache(input, showType);
      if (cached) {
        return cached;
      }
    }

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
          console.log(`  ⚠ Could not find ${showType} by IMDb ID: ${input.imdbId}`);
        }
      } else if (input.tmdbId) {
        try {
          show = await this.client.showsApi.getShow({
            id: input.tmdbId,
            country: this.country,
          });
        } catch (error) {
          console.log(`  ⚠ Could not find ${showType} by TMDb ID: ${input.tmdbId}`);
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
          console.log(`  ❌ SHOW NOT FOUND: "${input.title}" does not exist in API. Please verify the title and IMDb ID in the CSV file.`);
          return null;
        }

        // Find best match (exact title match or first result)
        show = searchResults.find(s =>
          s.title.toLowerCase() === input.title.toLowerCase() ||
          s.originalTitle?.toLowerCase() === input.title.toLowerCase()
        ) || searchResults[0];
      }

      // Check if available on target streaming services and separate free vs paid
      const streamingOptions = show.streamingOptions?.[this.country] || [];
      const freeServices: StreamingService[] = [];
      const paidServices: StreamingService[] = [];

      for (const option of streamingOptions) {
        if (this.targetServices.includes(option.service.id)) {
          const isFree = this.isServiceFree(option.type, option.service.name);
          const service: StreamingService = {
            name: option.service.name,
            link: option.link,
            type: option.type,
            quality: option.quality,
            isFree: isFree,
          };

          if (isFree) {
            freeServices.push(service);
          } else {
            paidServices.push(service);
          }
        }
      }

      // Only return shows available on at least one service (free or paid)
      if (freeServices.length === 0 && paidServices.length === 0) {
        console.log(`  ⚠ ${show.title} not available on target services`);
        return null;
      }

      return {
        title: show.title,
        year: show.releaseYear || 0,
        overview: show.overview || '',
        rating: show.rating || 0,
        imageUrl: show.imageSet?.verticalPoster?.w480 || show.imageSet?.horizontalPoster?.w480 || '',
        genres: show.genres.map(g => g.name),
        freeStreamingServices: freeServices,
        paidStreamingServices: paidServices,
        imdbId: show.imdbId,
        runtime: show.runtime,
        showType: showType,
        episodeCount: show.episodeCount,
        seasonCount: show.seasonCount,
      };
    } catch (error: any) {
      this.consecutiveErrors++;

      // Check if this is a rate limit error
      const errorMsg = error.message || '';
      const isRateLimitError = errorMsg.includes('Response returned an error code') ||
                               errorMsg.includes('429') ||
                               errorMsg.includes('rate limit');

      if (isRateLimitError) {
        console.error(`\n❌ API RATE LIMIT ERROR for ${showType} "${input.title}"`);

        if (this.consecutiveErrors >= this.maxConsecutiveErrors) {
          console.error('\n' + '='.repeat(80));
          console.error('❌ CRITICAL: API RATE LIMIT EXCEEDED');
          console.error('='.repeat(80));
          console.error('\nYou have hit the RapidAPI rate limit for the Streaming Availability API.');
          console.error('\nPossible solutions:');
          console.error('  1. Wait 24 hours for the free tier quota to reset');
          console.error('  2. Upgrade your RapidAPI subscription for higher limits');
          console.error('  3. Use cached data by running without --refresh-all flag');
          console.error('\nThe application will now stop to avoid further API errors.');
          console.error('Your data has been saved up to this point.\n');
          throw new Error('API_RATE_LIMIT_EXCEEDED');
        }
      } else {
        console.error(`  ❌ ERROR fetching ${showType} "${input.title}":`, error.message);
      }

      // Return error indicator so we can mark it in the CSV
      return { error: true, title: input.title } as any;
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
        // Check if this is an error response
        if ((showDetails as any).error) {
          // Don't add to results, will be marked as failed in CSV
          continue;
        }

        // Success - reset consecutive error counter
        this.consecutiveErrors = 0;

        results.push(showDetails);
        const totalServices = showDetails.freeStreamingServices.length + showDetails.paidStreamingServices.length;
        console.log(`✓ Found ${showDetails.title} (${showDetails.year}) - ${showDetails.freeStreamingServices.length} free, ${showDetails.paidStreamingServices.length} paid service(s)`);
      }

      // Add a small delay to avoid rate limiting (only if not using cache)
      if (!this.isCacheValid(show.lastApiCall) || this.refreshAll) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }
}
