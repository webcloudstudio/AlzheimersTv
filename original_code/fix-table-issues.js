// Fix all table issues:
// 1. Remove duplicate rating cells
// 2. Change links to movieofthenight.com
// 3. Remove original Rating column
// 4. Rename "Your Rating" to "Community Rating"

import { readFileSync, writeFileSync } from 'fs';

const filePath = './index.html';
let html = readFileSync(filePath, 'utf-8');

// First, let's read the CSV to get the movieofthenight URLs
const moviesCSV = readFileSync('./movies.csv', 'utf-8');
const tvshowsCSV = readFileSync('./tvshows.csv', 'utf-8');

// Parse CSVs to extract show URLs
const showUrls = {};

function parseCSV(csv) {
  const lines = csv.split('\n');
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Parse CSV line (handle quoted fields)
    const fields = [];
    let currentField = '';
    let inQuotes = false;

    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        fields.push(currentField);
        currentField = '';
      } else {
        currentField += char;
      }
    }
    fields.push(currentField);

    // Title is usually first field, URL might be in the fields
    const title = fields[0]?.replace(/"/g, '').trim();
    if (title) {
      // Look for movieofthenight.com URL in any field
      for (const field of fields) {
        if (field.includes('movieofthenight.com/show/')) {
          const match = field.match(/movieofthenight\.com\/show\/(\d+)/);
          if (match) {
            const showId = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
            showUrls[showId] = `https://www.movieofthenight.com/show/${match[1]}`;
            break;
          }
        }
      }
    }
  }
}

parseCSV(moviesCSV);
parseCSV(tvshowsCSV);

// 1. Change column header from "Your Rating" to "Community Rating"
html = html.replace(
  '<th>Your Rating</th>',
  '<th>Community Rating</th>'
);

// 2. Remove the original "Rating" column header
html = html.replace(
  /<th class="sortable" data-sort="rating">Rating<\/th>/,
  ''
);

// 3. Process each row to:
//    - Remove duplicate rating cells
//    - Remove original rating column
//    - Change detail links to movieofthenight.com

const lines = html.split('\n');
const newLines = [];
let inShowRow = false;
let currentShowId = '';
let skipNextRatingCell = false;
let tdCount = 0;
let ratingCellCount = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  // Detect show row start
  if (line.includes('<tr class="show-row"')) {
    inShowRow = true;
    tdCount = 0;
    ratingCellCount = 0;
    skipNextRatingCell = false;

    // Extract show ID
    const match = line.match(/data-show-id="([^"]+)"/);
    if (match) {
      currentShowId = match[1];
    }
    newLines.push(line);
    continue;
  }

  if (inShowRow) {
    // Change detail link to movieofthenight.com
    if (line.includes('href="details/') && line.includes('class="show-link"')) {
      if (showUrls[currentShowId]) {
        const modifiedLine = line.replace(
          /href="details\/[^"]+\.html"/,
          `href="${showUrls[currentShowId]}"`
        );
        newLines.push(modifiedLine);
        continue;
      }
    }

    // Count TDs
    if (line.includes('<td')) {
      tdCount++;
    }

    // Skip original rating column (5th TD with data-sort attribute containing rating)
    if (tdCount === 5 && line.includes('data-sort=') && line.includes('stars')) {
      // Skip this line and all lines until we hit </td>
      while (i < lines.length && !lines[i].includes('</td>')) {
        i++;
      }
      tdCount++; // We're past this TD now
      continue;
    }

    // Handle user-rating-cell duplicates
    if (line.includes('user-rating-cell')) {
      ratingCellCount++;
      // Skip duplicate rating cells (keep only the first one)
      if (ratingCellCount > 1) {
        // Skip until we find the closing </td> for this cell
        let depth = 1;
        while (i < lines.length && depth > 0) {
          i++;
          if (lines[i].includes('<td')) depth++;
          if (lines[i].includes('</td>')) depth--;
        }
        continue;
      }
    }

    // Check if row ended
    if (line.includes('</tr>')) {
      inShowRow = false;
    }
  }

  newLines.push(line);
}

writeFileSync(filePath, newLines.join('\n'), 'utf-8');
console.log('✅ Fixed table issues:');
console.log('  - Removed duplicate rating cells');
console.log('  - Changed links to movieofthenight.com');
console.log('  - Removed original Rating column');
console.log('  - Renamed to "Community Rating"');
