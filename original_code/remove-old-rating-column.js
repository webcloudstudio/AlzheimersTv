// Remove the old rating column (5th column with stars and rating numbers)
import { readFileSync, writeFileSync } from 'fs';

const filePath = './index.html';
let html = readFileSync(filePath, 'utf-8');

// Pattern to match the old rating TD column with data-sort and stars
// This appears after the Length column and before user-rating-cell
const ratingColumnPattern = /\s*<td data-sort="\d+">\s*<span class="stars">[^<]+<\/span>\s*<span class="rating-number">\([^)]+\)<\/span>\s*<\/td>/g;

const beforeCount = (html.match(ratingColumnPattern) || []).length;
html = html.replace(ratingColumnPattern, '');
const afterCount = (html.match(ratingColumnPattern) || []).length;

writeFileSync(filePath, html, 'utf-8');

console.log('✅ Removed old rating column');
console.log(`   Found and removed: ${beforeCount - afterCount} rating columns`);
