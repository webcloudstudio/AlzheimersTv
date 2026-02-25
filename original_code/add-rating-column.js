// Script to add user rating column to all rows in index.html
import { readFileSync, writeFileSync } from 'fs';

const filePath = './index.html';
let html = readFileSync(filePath, 'utf-8');

// Function to generate show ID from title
function generateShowId(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// Function to create rating cell HTML
function createRatingCell(showId) {
  return `<td class="user-rating-cell">
          <div class="user-rating-container">
            <div class="user-stars" data-show-id="${showId}">
              <span class="star" data-rating="1">★</span>
              <span class="star" data-rating="2">★</span>
              <span class="star" data-rating="3">★</span>
              <span class="star" data-rating="4">★</span>
              <span class="star" data-rating="5">★</span>
            </div>
            <div class="rating-info"></div>
          </div>
        </td>`;
}

// Pattern to match show rows
const rowPattern = /<tr class="show-row"([^>]*)>\s*<td><a href="details\/([^"]+)\.html"[^>]*class="show-link">([^<]+)<\/a><\/td>\s*<td>([^<]+)<\/td>\s*<td data-sort="[^"]*">([^<]+)<\/td>\s*<td>([^<]+)<\/td>\s*<td data-sort="[^"]*">([^<]+)<\/td>\s*<td>([^<]+)<\/td>\s*<td class="services-cell">([^<]*(?:<[^>]+>[^<]*)*)<\/td>\s*<\/tr>/g;

html = html.replace(rowPattern, (match, attributes, detailsFile, title, type, year, length, rating, genres, services) => {
  // Extract or generate show ID
  const showId = detailsFile;

  // Check if row already has data-show-id
  let newAttributes = attributes;
  if (!attributes.includes('data-show-id=')) {
    newAttributes = attributes + ` data-show-id="${showId}"`;
  }

  // Reconstruct the row with the rating column
  return `<tr class="show-row"${newAttributes}>
        <td><a href="details/${detailsFile}.html" target="_blank" class="show-link">${title}</a></td>
        <td>${type}</td>
        <td data-sort="${year.match(/\d{4}/) ? year.match(/\d{4}/)[0] : year}">${year}</td>
        <td>${length}</td>
        <td data-sort="${rating.match(/\((\d+\.?\d*)\)/) ? rating.match(/\((\d+\.?\d*)\)/)[1] : '0'}">${rating}</td>
        ${createRatingCell(showId)}
        <td>${genres}</td>
        <td class="services-cell">${services}</td>
      </tr>`;
});

writeFileSync(filePath, html, 'utf-8');
console.log('✅ Successfully added rating column to all rows!');
