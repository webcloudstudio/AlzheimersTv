#!/usr/bin/env node

/**
 * Populate cachedShowUrl field from existing cachedImageUrl data
 * This extracts the show ID from the image URL and constructs the Movie of the Night URL
 * WITHOUT calling the API, preserving your monthly quota
 */

const fs = require('fs');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');

function extractShowIdFromImageUrl(imageUrl) {
  if (!imageUrl) return null;

  // Image URL format: https://cdn.movieofthenight.com/show/82/poster/vertical/en/480.jpg
  const match = imageUrl.match(/\/show\/(\d+)\//);
  return match ? match[1] : null;
}

function processFile(filePath) {
  console.log(`\nProcessing ${filePath}...`);

  // Read CSV file
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
  });

  let updated = 0;
  let skipped = 0;
  let noImageUrl = 0;

  // Process each record
  const updatedRecords = records.map(record => {
    // If cachedShowUrl already exists, skip
    if (record.cachedShowUrl) {
      skipped++;
      return record;
    }

    // Extract show ID from image URL
    const showId = extractShowIdFromImageUrl(record.cachedImageUrl);

    if (showId) {
      record.cachedShowUrl = `https://www.movieofthenight.com/show/${showId}`;
      updated++;
      console.log(`  ✓ ${record.title}: https://www.movieofthenight.com/show/${showId}`);
    } else if (!record.cachedImageUrl) {
      noImageUrl++;
      console.log(`  ⚠ ${record.title}: No image URL (likely failed API call)`);
    } else {
      console.log(`  ⚠ ${record.title}: Could not extract show ID from: ${record.cachedImageUrl}`);
    }

    return record;
  });

  // Write back to CSV
  const csvContent = stringify(updatedRecords, {
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
      'cachedShowUrl',
      'cachedFreeServices',
      'cachedPaidServices',
    ],
  });

  fs.writeFileSync(filePath, csvContent, 'utf-8');

  console.log(`\n✓ Updated ${filePath}:`);
  console.log(`  - ${updated} URLs added`);
  console.log(`  - ${skipped} already had URLs`);
  console.log(`  - ${noImageUrl} missing image URLs (skipped)`);
}

// Process both files
console.log('='.repeat(60));
console.log('Populating Movie of the Night URLs from cached image URLs');
console.log('='.repeat(60));

try {
  processFile('movies.csv');
  processFile('tvshows.csv');

  console.log('\n' + '='.repeat(60));
  console.log('✅ Complete! No API calls were made.');
  console.log('='.repeat(60));
  console.log('\nNext steps:');
  console.log('1. Run: npm run dev');
  console.log('2. Check the HTML - service badges should now link to Movie of the Night');
  console.log('3. Prime Video buttons should be dark green\n');
} catch (error) {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
}
