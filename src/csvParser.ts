import { parse } from 'csv-parse';
import { readFile } from 'fs/promises';
import { ShowInput } from './types.js';

export async function parseShowsCSV(filePath: string, maxRows?: number): Promise<ShowInput[]> {
  const fileContent = await readFile(filePath, 'utf-8');

  return new Promise((resolve, reject) => {
    const shows: ShowInput[] = [];

    parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    })
      .on('data', (row: any) => {
        if (maxRows && shows.length >= maxRows) {
          return;
        }

        shows.push({
          title: row.title || row.Title,
          year: row.year ? parseInt(row.year) : (row.Year ? parseInt(row.Year) : undefined),
          imdbId: row.imdbId || row.imdb_id || row.ImdbId,
          tmdbId: row.tmdbId || row.tmdb_id || row.TmdbId,
          // Read cached data from CSV
          lastApiCall: row.lastApiCall || undefined,
          lastApiCallFailed: row.lastApiCallFailed || undefined,
          cachedYear: row.cachedYear ? parseInt(row.cachedYear) : undefined,
          cachedRating: row.cachedRating ? parseFloat(row.cachedRating) : undefined,
          cachedOverview: row.cachedOverview || undefined,
          cachedGenres: row.cachedGenres || undefined,
          cachedRuntime: row.cachedRuntime ? parseInt(row.cachedRuntime) : undefined,
          cachedSeasonCount: row.cachedSeasonCount ? parseInt(row.cachedSeasonCount) : undefined,
          cachedImageUrl: row.cachedImageUrl || undefined,
          cachedShowUrl: row.cachedShowUrl || undefined,
          cachedFreeServices: row.cachedFreeServices || undefined,
          cachedPaidServices: row.cachedPaidServices || undefined,
        });
      })
      .on('end', () => {
        resolve(shows);
      })
      .on('error', (error) => {
        reject(error);
      });
  });
}
