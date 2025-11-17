import { stringify } from 'csv-stringify/sync';
import { writeFile } from 'fs/promises';
import { ShowInput, ShowWithStreaming } from './types.js';

export async function updateCsvWithApiData(
  filePath: string,
  originalInputs: ShowInput[],
  apiResults: Map<string, ShowWithStreaming>
): Promise<void> {
  const timestamp = new Date().toISOString();

  // Update inputs with API data
  const updatedRows = originalInputs.map(input => {
    const apiData = apiResults.get(input.title);

    if (apiData) {
      // Convert services to comma-separated strings
      const freeServices = apiData.freeStreamingServices
        .map(s => `${s.name}:${s.link}`)
        .join('|');
      const paidServices = apiData.paidStreamingServices
        .map(s => `${s.name}:${s.link}`)
        .join('|');

      return {
        title: input.title,
        year: input.year || '',
        imdbId: input.imdbId || '',
        tmdbId: input.tmdbId || '',
        lastApiCall: timestamp,
        lastApiCallFailed: 'false',
        cachedYear: apiData.year,
        cachedRating: apiData.rating,
        cachedOverview: apiData.overview.replace(/,/g, ';'), // Replace commas to avoid CSV issues
        cachedGenres: apiData.genres.join('|'),
        cachedRuntime: apiData.runtime || '',
        cachedSeasonCount: apiData.seasonCount || '',
        cachedImageUrl: apiData.imageUrl,
        cachedFreeServices: freeServices,
        cachedPaidServices: paidServices,
      };
    } else {
      // Mark as failed if no API data (but was attempted)
      const wasFreshAttempt = !input.lastApiCall || !apiResults.has(input.title);

      return {
        title: input.title,
        year: input.year || '',
        imdbId: input.imdbId || '',
        tmdbId: input.tmdbId || '',
        lastApiCall: wasFreshAttempt ? timestamp : (input.lastApiCall || ''),
        lastApiCallFailed: wasFreshAttempt ? 'true' : (input.lastApiCallFailed || 'false'),
        cachedYear: input.cachedYear || '',
        cachedRating: input.cachedRating || '',
        cachedOverview: input.cachedOverview || '',
        cachedGenres: input.cachedGenres || '',
        cachedRuntime: input.cachedRuntime || '',
        cachedSeasonCount: input.cachedSeasonCount || '',
        cachedImageUrl: input.cachedImageUrl || '',
        cachedFreeServices: input.cachedFreeServices || '',
        cachedPaidServices: input.cachedPaidServices || '',
      };
    }
  });

  // Write back to CSV
  const csvContent = stringify(updatedRows, {
    header: true,
    columns: [
      'title',
      'year',
      'imdbId',
      'tmdbId',
      'lastApiCall',
      'lastApiCallFailed',
      'cachedYear',
      'cachedRating',
      'cachedOverview',
      'cachedGenres',
      'cachedRuntime',
      'cachedSeasonCount',
      'cachedImageUrl',
      'cachedFreeServices',
      'cachedPaidServices',
    ],
  });

  await writeFile(filePath, csvContent, 'utf-8');
  console.log(`✓ Updated ${filePath} with API data`);
}
