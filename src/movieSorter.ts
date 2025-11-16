import { ShowWithStreaming } from './types.js';

export class ShowSorter {
  /**
   * Sort shows with newer and higher-ranked shows at the top
   * Priority: Rating > Year
   */
  static sortShows(shows: ShowWithStreaming[]): ShowWithStreaming[] {
    return shows.sort((a, b) => {
      // Primary sort: Rating (higher is better)
      const ratingDiff = b.rating - a.rating;
      if (Math.abs(ratingDiff) > 0.5) {
        return ratingDiff;
      }

      // Secondary sort: Year (newer is better)
      return b.year - a.year;
    });
  }

  /**
   * Filter shows by minimum year
   */
  static filterByYear(shows: ShowWithStreaming[], minYear: number): ShowWithStreaming[] {
    return shows.filter(show => show.year >= minYear);
  }

  /**
   * Filter shows by minimum rating
   */
  static filterByRating(shows: ShowWithStreaming[], minRating: number): ShowWithStreaming[] {
    return shows.filter(show => show.rating >= minRating);
  }

  /**
   * Apply all filters and sorting for older viewers
   * - Filter by minimum year
   * - Sort by rating and year (newer, higher-rated first)
   */
  static prepareForOlderViewers(
    shows: ShowWithStreaming[],
    minYear: number = 1950,
    minRating: number = 6.0
  ): ShowWithStreaming[] {
    let filtered = this.filterByYear(shows, minYear);
    filtered = this.filterByRating(filtered, minRating);
    return this.sortShows(filtered);
  }
}
