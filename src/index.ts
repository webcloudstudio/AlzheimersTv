import { readFile } from 'fs/promises';
import { parseShowsCSV } from './csvParser.js';
import { StreamingApiClient } from './streamingApi.js';
import { HtmlGenerator } from './htmlGenerator.js';
import { ShowSorter } from './movieSorter.js';
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
    console.log(`  - Minimum year: ${config.minYear}\n`);

    // Initialize API client and HTML generator
    const apiClient = new StreamingApiClient(
      config.apiKey,
      config.country,
      config.targetServices
    );
    const htmlGenerator = new HtmlGenerator();

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

    if (moviesWithStreaming.length > 0) {
      console.log('Sorting and filtering movies...');
      const sortedMovies = ShowSorter.prepareForOlderViewers(
        moviesWithStreaming,
        config.minYear
      );
      console.log(`✓ ${sortedMovies.length} movies after filtering and sorting\n`);

      console.log(`Generating HTML file: ${config.movies.outputHtmlFile}...`);
      await htmlGenerator.generateHtmlFile(
        sortedMovies,
        config.movies.outputHtmlFile,
        'Classic Movies',
        'Your Guide to Streaming Favorites'
      );
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

    if (tvShowsWithStreaming.length > 0) {
      console.log('Sorting and filtering TV shows...');
      const sortedTvShows = ShowSorter.prepareForOlderViewers(
        tvShowsWithStreaming,
        config.minYear
      );
      console.log(`✓ ${sortedTvShows.length} TV shows after filtering and sorting\n`);

      console.log(`Generating HTML file: ${config.tvShows.outputHtmlFile}...`);
      await htmlGenerator.generateHtmlFile(
        sortedTvShows,
        config.tvShows.outputHtmlFile,
        'Classic TV Shows',
        'Your Guide to Streaming Series'
      );
    } else {
      console.log('⚠ No TV shows found on target streaming services.\n');
    }

    // ========== SUMMARY ==========
    console.log('\n=== Completed Successfully! ===');
    console.log(`\n📺 Movies: ${moviesWithStreaming.length > 0 ? config.movies.outputHtmlFile : 'None found'}`);
    console.log(`📺 TV Shows: ${tvShowsWithStreaming.length > 0 ? config.tvShows.outputHtmlFile : 'None found'}`);
    console.log('\nThe files are ready to be used in your YouTube videos!\n');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
