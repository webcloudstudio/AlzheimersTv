import { readFile } from 'fs/promises';
import { parseShowsCSV } from './csvParser.js';
import { StreamingApiClient } from './streamingApi.js';
import { HtmlTableGenerator } from './htmlTableGenerator.js';
import { ShowSorter } from './movieSorter.js';
import { updateCsvWithApiData } from './csvWriter.js';
import { Config } from './types.js';

async function main() {
  console.log('=== AlzheimersTv Movie & TV Show Finder ===\n');

  try {
    // Load configuration
    console.log('Loading configuration...');
    const configContent = await readFile('./config.json', 'utf-8');
    const config: Config = JSON.parse(configContent);

    // Validate API key
    if (!config.apiKey || config.apiKey === 'YOUR_RAPIDAPI_KEY_HERE') {
      console.error('❌ Error: Please set your RapidAPI key in config.json');
      console.log('\nTo get an API key:');
      console.log('1. Visit https://rapidapi.com/movie-of-the-night-movie-of-the-night-default/api/streaming-availability');
      console.log('2. Sign up for a free account');
      console.log('3. Subscribe to the free plan');
      console.log('4. Copy your API key to config.json\n');
      process.exit(1);
    }

    console.log(`✓ Configuration loaded`);
    console.log(`  - Country: ${config.country}`);
    console.log(`  - Max items to process: ${config.maxItemsToProcess}`);
    console.log(`  - Target services: ${config.targetServices.join(', ')}`);
    console.log(`  - Minimum year: ${config.minYear}`);
    console.log(`  - Cache days: ${config.cacheDays}\n`);

    // Initialize API client and HTML generator
    const apiClient = new StreamingApiClient(
      config.apiKey,
      config.country,
      config.targetServices,
      config.cacheDays
    );
    const htmlGenerator = new HtmlTableGenerator();

    // ========== PROCESS MOVIES ==========
    console.log('========== PROCESSING MOVIES ==========\n');

    console.log(`Reading movies CSV: ${config.movies.csvInputFile}...`);
    const moviesInput = await parseShowsCSV(
      config.movies.csvInputFile,
      config.maxItemsToProcess
    );
    console.log(`✓ Loaded ${moviesInput.length} movies from CSV\n`);

    console.log('Fetching movie streaming availability...\n');
    const moviesWithStreaming = await apiClient.getShowsWithStreaming(moviesInput, 'movie');
    console.log(`\n✓ Found ${moviesWithStreaming.length} movies available on streaming services\n`);

    // Update CSV with API data
    if (moviesWithStreaming.length > 0) {
      const moviesMap = new Map(moviesWithStreaming.map(m => [m.title, m]));
      await updateCsvWithApiData(config.movies.csvInputFile, moviesInput, moviesMap);
    }

    // Sort and filter movies
    let sortedMovies: any[] = [];
    if (moviesWithStreaming.length > 0) {
      console.log('Sorting and filtering movies...');
      sortedMovies = ShowSorter.prepareForOlderViewers(
        moviesWithStreaming,
        config.minYear
      );
      console.log(`✓ ${sortedMovies.length} movies after filtering and sorting\n`);
    } else {
      console.log('⚠ No movies found on target streaming services.\n');
    }

    // ========== PROCESS TV SHOWS ==========
    console.log('\n========== PROCESSING TV SHOWS ==========\n');

    console.log(`Reading TV shows CSV: ${config.tvShows.csvInputFile}...`);
    const tvShowsInput = await parseShowsCSV(
      config.tvShows.csvInputFile,
      config.maxItemsToProcess
    );
    console.log(`✓ Loaded ${tvShowsInput.length} TV shows from CSV\n`);

    console.log('Fetching TV show streaming availability...\n');
    const tvShowsWithStreaming = await apiClient.getShowsWithStreaming(tvShowsInput, 'series');
    console.log(`\n✓ Found ${tvShowsWithStreaming.length} TV shows available on streaming services\n`);

    // Update CSV with API data
    if (tvShowsWithStreaming.length > 0) {
      const tvShowsMap = new Map(tvShowsWithStreaming.map(s => [s.title, s]));
      await updateCsvWithApiData(config.tvShows.csvInputFile, tvShowsInput, tvShowsMap);
    }

    // Sort and filter TV shows
    let sortedTvShows: any[] = [];
    if (tvShowsWithStreaming.length > 0) {
      console.log('Sorting and filtering TV shows...');
      sortedTvShows = ShowSorter.prepareForOlderViewers(
        tvShowsWithStreaming,
        config.minYear
      );
      console.log(`✓ ${sortedTvShows.length} TV shows after filtering and sorting\n`);
    } else {
      console.log('⚠ No TV shows found on target streaming services.\n');
    }

    // ========== GENERATE COMBINED PAGE ==========
    if (sortedMovies.length > 0 || sortedTvShows.length > 0) {
      console.log('Generating combined HTML page...');
      const combined = [...sortedMovies, ...sortedTvShows];
      console.log(`✓ Combined ${sortedMovies.length} movies and ${sortedTvShows.length} TV shows\n`);

      console.log(`Generating HTML table: index.html...`);
      await htmlGenerator.generateTableHtmlFile(
        combined,
        'index.html',
        'details',
        'TV for Older People',
        ''
      );

      // Generate detail pages for all shows
      await htmlGenerator.generateAllDetailPages(sortedMovies, config.movies.detailsDirectory);
      await htmlGenerator.generateAllDetailPages(sortedTvShows, config.tvShows.detailsDirectory);
    }

    // ========== SUMMARY ==========
    console.log('\n=== Completed Successfully! ===');
    console.log(`\n📺 Combined Page: index.html`);
    console.log(`   - ${sortedMovies.length} movies`);
    console.log(`   - ${sortedTvShows.length} TV shows`);
    console.log('\nThe file is ready to be used in your YouTube videos!\n');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
