// Script to add rating column to ALL rows using DOM parsing
import { readFileSync, writeFileSync } from 'fs';

const filePath = './index.html';
let html = readFileSync(filePath, 'utf-8');

// Find all show rows and add rating column
const lines = html.split('\n');
const newLines = [];
let inShowRow = false;
let currentRow = [];
let tdCount = 0;
let showId = '';

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  // Check if this is a show row start
  if (line.includes('<tr class="show-row"')) {
    inShowRow = true;
    currentRow = [line];
    tdCount = 0;

    // Extract show ID from the details link in next few lines
    for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
      if (lines[j].includes('href="details/')) {
        const match = lines[j].match(/href="details\/([^"]+)\.html"/);
        if (match) {
          showId = match[1];
          break;
        }
      }
    }

    // Update the tr tag to include data-show-id if not present
    if (!line.includes('data-show-id=')) {
      currentRow[0] = line.replace('<tr class="show-row"', `<tr class="show-row" data-show-id="${showId}"`);
    }

    newLines.push(currentRow[0]);
    continue;
  }

  if (inShowRow) {
    // Count TD tags
    if (line.includes('<td')) {
      tdCount++;
    }

    // After the 5th TD (rating column), insert the user rating column
    if (tdCount === 5 && line.includes('</td>') && !line.includes('user-rating-cell')) {
      newLines.push(line);
      // Add the user rating column
      newLines.push(`        <td class="user-rating-cell">`);
      newLines.push(`          <div class="user-rating-container">`);
      newLines.push(`            <div class="user-stars" data-show-id="${showId}">`);
      newLines.push(`              <span class="star" data-rating="1">★</span>`);
      newLines.push(`              <span class="star" data-rating="2">★</span>`);
      newLines.push(`              <span class="star" data-rating="3">★</span>`);
      newLines.push(`              <span class="star" data-rating="4">★</span>`);
      newLines.push(`              <span class="star" data-rating="5">★</span>`);
      newLines.push(`            </div>`);
      newLines.push(`            <div class="rating-info"></div>`);
      newLines.push(`          </div>`);
      newLines.push(`        </td>`);
      continue;
    }

    // Check if row ended
    if (line.includes('</tr>')) {
      inShowRow = false;
      tdCount = 0;
    }
  }

  newLines.push(line);
}

writeFileSync(filePath, newLines.join('\n'), 'utf-8');
console.log('✅ Successfully added rating column to all rows!');
