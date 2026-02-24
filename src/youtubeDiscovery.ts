import { ShowInput } from './types.js';

/**
 * YouTube discovery service to find official YouTube channels/videos for shows
 * Uses YouTube Data API v3 to search for content
 */
export class YouTubeDiscovery {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Check if a show needs YouTube discovery
   * Only check shows where youtubeUrl is blank/undefined
   */
  shouldCheckYouTube(show: ShowInput): boolean {
    // Skip if already has a URL
    if (show.youtubeUrl && show.youtubeUrl.startsWith('http')) {
      return false;
    }

    // Skip if previously checked and marked as not available
    if (show.youtubeUrl === 'not on youtube') {
      return false;
    }

    // Check if blank/undefined
    return !show.youtubeUrl || show.youtubeUrl.trim() === '';
  }

  /**
   * Search YouTube for a show and return the best match URL
   * @param title Show title
   * @param year Show year (optional, helps with disambiguation)
   * @returns YouTube URL or 'not on youtube' if not found
   */
  async discoverYouTubeUrl(title: string, year?: number): Promise<string> {
    try {
      // Build search query - try multiple variations
      const queries = [
        `${title} official channel`,
        `${title} ${year || ''} full episodes`,
        `${title} official`,
      ];

      for (const query of queries) {
        const url = `https://www.googleapis.com/youtube/v3/search?` +
          `part=snippet&q=${encodeURIComponent(query)}&` +
          `type=video,channel&maxResults=5&key=${this.apiKey}`;

        const response = await fetch(url);

        if (!response.ok) {
          if (response.status === 403) {
            console.error('  ⚠ YouTube API quota exceeded or API key invalid');
            return ''; // Return empty to skip and try again later
          }
          continue;
        }

        const data: any = await response.json();

        if (data.items && data.items.length > 0) {
          // Look for official channels or verified content
          const officialItem = data.items.find((item: any) => {
            const snippet = item.snippet;
            const channelTitle = snippet.channelTitle?.toLowerCase() || '';
            const videoTitle = snippet.title?.toLowerCase() || '';
            const titleLower = title.toLowerCase();

            // Prioritize results that match the title closely
            return channelTitle.includes(titleLower) ||
                   videoTitle.includes(titleLower);
          });

          if (officialItem) {
            // Return channel or video URL
            if (officialItem.id.kind === 'youtube#channel') {
              return `https://www.youtube.com/channel/${officialItem.id.channelId}`;
            } else if (officialItem.id.kind === 'youtube#video') {
              return `https://www.youtube.com/watch?v=${officialItem.id.videoId}`;
            }
          }
        }
      }

      // No results found after all queries
      console.log(`  ℹ No YouTube results found for "${title}"`);
      return 'not on youtube';

    } catch (error: any) {
      console.error(`  ❌ Error searching YouTube for "${title}":`, error.message);
      return ''; // Return empty to preserve existing value and try again later
    }
  }

  /**
   * Process a batch of shows and discover YouTube URLs
   * Only processes shows that need checking (blank youtubeUrl)
   */
  async discoverBatch(shows: ShowInput[]): Promise<Map<string, string>> {
    const results = new Map<string, string>();

    // Filter to only shows that need checking
    const showsToCheck = shows.filter(show => this.shouldCheckYouTube(show));

    if (showsToCheck.length === 0) {
      console.log('✓ All shows already have YouTube status');
      return results;
    }

    console.log(`\nDiscovering YouTube URLs for ${showsToCheck.length} show(s)...`);

    for (const show of showsToCheck) {
      console.log(`  Searching YouTube for: ${show.title}...`);

      const youtubeUrl = await this.discoverYouTubeUrl(show.title, show.year);

      if (youtubeUrl) {
        results.set(show.title, youtubeUrl);

        if (youtubeUrl === 'not on youtube') {
          console.log(`  ✗ Not found: ${show.title}`);
        } else {
          console.log(`  ✓ Found: ${show.title} → ${youtubeUrl}`);
        }
      }

      // Add delay to avoid YouTube API rate limits (100 requests per 100 seconds)
      await new Promise(resolve => setTimeout(resolve, 1100));
    }

    console.log(`\n✓ YouTube discovery complete: ${results.size} shows processed`);
    return results;
  }
}
