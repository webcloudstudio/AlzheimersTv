import { ShowWithStreaming } from './types.js';
import { writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';

export class HtmlTableGenerator {
  private generateStars(rating: number): string {
    // Rating is 0-100, convert to 0-5 stars
    const stars = rating / 20;
    const fullStars = Math.floor(stars);
    const hasHalfStar = (stars % 1) >= 0.5;

    // Show 1-5 filled stars with half star icon
    return '⭐'.repeat(fullStars) + (hasHalfStar ? '½' : '');
  }

  private sanitizeFileName(title: string): string {
    return title.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  }

  private generateTableRow(show: ShowWithStreaming, detailsDir: string): string {
    const detailFile = `${detailsDir}/${this.sanitizeFileName(show.title)}.html`;
    const stars = this.generateStars(show.rating);
    const genres = show.genres.slice(0, 3).join(', ');

    // Get unique free services (remove duplicates)
    const uniqueFreeServices = new Map<string, any>();
    show.freeStreamingServices.forEach(s => {
      if (!uniqueFreeServices.has(s.name)) {
        uniqueFreeServices.set(s.name, s);
      }
    });

    const freeServices = Array.from(uniqueFreeServices.values()).map(s => {
      let serviceHtml = s.name;
      if (s.name.toLowerCase().includes('prime')) {
        serviceHtml = `${s.name}<br><span class="free-label">(free)</span>`;
      }
      // Use Movie of the Night show URL instead of incomplete streaming service links
      const linkUrl = show.showUrl || s.link;
      return `<a href="${linkUrl}" target="_blank" class="service-badge ${s.name.toLowerCase().replace(/\s+/g, '-')}" data-service="${s.name}">${serviceHtml}</a>`;
    }).join(' ');

    const metaInfo = show.showType === 'series'
      ? (show.seasonCount ? `${show.seasonCount} Season${show.seasonCount > 1 ? 's' : ''}` : 'Series')
      : (show.runtime ? `${show.runtime} min` : 'Movie');

    const showType = show.showType === 'series' ? 'Series' : 'Movie';

    return `
      <tr class="show-row" data-type="${showType.toLowerCase()}" data-free-services="${show.freeStreamingServices.map(s => s.name).join(',')}" data-has-free="${show.freeStreamingServices.length > 0}">
        <td><a href="${detailFile}" target="_blank" class="show-link">${show.title}</a></td>
        <td>${showType}</td>
        <td data-sort="${show.year}">${show.year}</td>
        <td>${metaInfo}</td>
        <td data-sort="${show.rating}"><span class="stars">${stars}</span> <span class="rating-number">(${show.rating.toFixed(1)})</span></td>
        <td>${genres}</td>
        <td class="services-cell">${freeServices}</td>
      </tr>
    `;
  }

  private generateTableHtml(shows: ShowWithStreaming[], title: string, subtitle: string, detailsDir: string, generatedDate: string): string {
    const showsJson = JSON.stringify(shows.map(show => ({
      title: show.title,
      year: show.year,
      rating: show.rating,
      freeServices: show.freeStreamingServices.map(s => s.name),
      paidServices: show.paidStreamingServices.map(s => s.name),
    })));

    const tableRows = shows.map(show => this.generateTableRow(show, detailsDir)).join('\n');

    // Get all unique services for filter buttons
    const allServices = new Set<string>();
    shows.forEach(show => {
      show.freeStreamingServices.forEach(s => allServices.add(s.name));
      show.paidStreamingServices.forEach(s => allServices.add(s.name));
    });

    const serviceButtons = Array.from(allServices).map(service =>
      `<button class="filter-btn service-filter" data-service="${service}">${service}</button>`
    ).join('\n        ');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      color: #fff;
      padding: 20px;
      line-height: 1.6;
    }

    .container {
      max-width: 1600px;
      margin: 0 auto;
    }

    header {
      padding: 40px 20px 20px;
      margin-bottom: 30px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 20px;
      backdrop-filter: blur(10px);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    h1 {
      font-size: 2.5em;
      background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      text-align: left;
    }

    .subtitle {
      font-size: 1.2em;
      color: #b8b8b8;
      margin-top: 10px;
    }

    .generated-date {
      font-size: 0.75em;
      color: #888;
      text-align: right;
    }

    .filters {
      background: rgba(255, 255, 255, 0.05);
      padding: 20px;
      border-radius: 15px;
      margin-bottom: 30px;
      backdrop-filter: blur(10px);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 30px;
      flex-wrap: wrap;
    }

    .filter-section {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .filter-section:last-child {
      margin-bottom: 0;
    }

    .filter-label {
      font-weight: 600;
      color: #4ecdc4;
      font-size: 1.1em;
      white-space: nowrap;
    }

    .filter-btn {
      padding: 10px 20px;
      margin: 5px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
      border-radius: 8px;
      cursor: pointer;
      font-size: 1em;
      font-weight: 600;
      transition: all 0.3s;
    }

    .filter-btn:hover {
      background: rgba(255, 255, 255, 0.2);
      transform: translateY(-2px);
    }

    .filter-btn.active {
      background: #4ecdc4;
      border-color: #4ecdc4;
      color: #1a1a2e;
    }

    .filter-btn.inactive {
      opacity: 0.5;
    }

    .table-container {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 15px;
      overflow: hidden;
      backdrop-filter: blur(10px);
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    thead {
      background: rgba(255, 255, 255, 0.1);
    }

    th {
      padding: 15px;
      text-align: left;
      font-weight: 600;
      font-size: 1.1em;
      color: #4ecdc4;
      cursor: pointer;
      user-select: none;
      position: relative;
    }

    th:hover {
      background: rgba(255, 255, 255, 0.15);
    }

    th.sortable::after {
      content: ' ↕';
      opacity: 0.5;
    }

    th.sorted-asc::after {
      content: ' ↑';
      opacity: 1;
    }

    th.sorted-desc::after {
      content: ' ↓';
      opacity: 1;
    }

    td {
      padding: 15px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    tbody tr {
      transition: background 0.2s;
    }

    tbody tr:hover {
      background: rgba(255, 255, 255, 0.08);
    }

    tbody tr.hidden {
      display: none;
    }

    .show-link {
      color: #fff;
      text-decoration: none;
      font-weight: 500;
      font-size: 1.1em;
    }

    .show-link:hover {
      color: #4ecdc4;
      text-decoration: underline;
    }

    .stars {
      color: #ffd700;
      font-size: 1.1em;
    }

    .rating-number {
      color: #b8b8b8;
      font-size: 0.95em;
    }

    .services-cell {
      font-size: 0.9em;
    }

    .service-badge {
      display: inline-block;
      padding: 8px 12px;
      margin: 2px;
      border-radius: 8px;
      font-size: 0.85em;
      font-weight: 600;
      color: white;
      white-space: normal;
      text-decoration: none;
      transition: opacity 0.2s, transform 0.2s, box-shadow 0.2s;
      text-align: center;
      line-height: 1.3;
      min-width: 90px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }

    .service-badge:hover {
      opacity: 0.9;
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
    }

    .service-badge .free-label {
      font-size: 0.75em;
      font-weight: 400;
      opacity: 0.9;
      display: block;
      margin-top: 2px;
    }

    .service-badge.netflix { background: #E50914; }
    .service-badge.prime,
    .service-badge.prime-video,
    .service-badge.amazon-prime,
    .service-badge.amazon-prime-video { background: #146F3E; }
    .service-badge.hulu { background: #1CE783; }
    .service-badge.disney,
    .service-badge.disney\\+ { background: #113CCF; }
    .service-badge.max,
    .service-badge.hbo-max { background: #002BE7; }
    .service-badge.appletv,
    .service-badge.apple-tv,
    .service-badge.apple-tv\\+ { background: #000000; }
    .service-badge.peacock { background: #000000; }
    .service-badge.paramount,
    .service-badge.paramount\\+ { background: #0064FF; }
    .service-badge.paid { background: #888; }

    .footer {
      text-align: center;
      margin-top: 60px;
      padding: 30px;
      color: #888;
      font-size: 0.9em;
    }

    .stats {
      text-align: right;
      color: #b8b8b8;
      font-size: 1.1em;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div style="display: flex; align-items: center; gap: 20px;">
        <h1>${title}</h1>
        <div style="display: flex; gap: 10px;">
          <button class="filter-btn type-filter active" data-type="both">Both</button>
          <button class="filter-btn type-filter" data-type="movie">Movies</button>
          <button class="filter-btn type-filter" data-type="series">Series</button>
        </div>
      </div>
      <p class="generated-date">Updated: ${generatedDate}</p>
    </header>

    <div class="filters">
      <div class="filter-section">
        <div class="filter-label">Filter by Service:</div>
        <button class="filter-btn service-filter active" data-service="all">All Services</button>
        ${serviceButtons}
      </div>
      <div class="stats" id="stats">
        Showing <span id="visible-count">${shows.length}</span> of ${shows.length} shows
      </div>
    </div>

    <div class="table-container">
      <table id="shows-table">
        <thead>
          <tr>
            <th class="sortable" data-sort="title">Title</th>
            <th class="sortable" data-sort="type">Type</th>
            <th class="sortable" data-sort="year">Year</th>
            <th>Length</th>
            <th class="sortable" data-sort="rating">Rating</th>
            <th>Genres</th>
            <th>Free Streaming</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    </div>

    <div class="footer">
      <p>Generated for AlzheimersTv</p>
      <p>Click on any show title to see full details. Streaming availability subject to change.</p>
    </div>
  </div>

  <script>
    // Table sorting
    let currentSort = { column: 'rating', direction: 'desc' };

    document.querySelectorAll('th.sortable').forEach(th => {
      th.addEventListener('click', () => {
        const column = th.dataset.sort;
        const table = document.getElementById('shows-table');
        const tbody = table.querySelector('tbody');
        const rows = Array.from(tbody.querySelectorAll('tr'));

        // Toggle direction if clicking same column
        if (currentSort.column === column) {
          currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
          currentSort.column = column;
          currentSort.direction = 'asc';
        }

        // Remove sorted class from all headers
        document.querySelectorAll('th.sorted-asc, th.sorted-desc').forEach(h => {
          h.classList.remove('sorted-asc', 'sorted-desc');
        });

        // Add sorted class to current header
        th.classList.add(currentSort.direction === 'asc' ? 'sorted-asc' : 'sorted-desc');

        // Sort rows
        rows.sort((a, b) => {
          let aVal, bVal;

          if (column === 'title') {
            aVal = a.querySelector('td:nth-child(1)').textContent.trim();
            bVal = b.querySelector('td:nth-child(1)').textContent.trim();
            return currentSort.direction === 'asc'
              ? aVal.localeCompare(bVal)
              : bVal.localeCompare(aVal);
          } else {
            // Use data-sort attribute for year and rating
            aVal = parseFloat(a.querySelector(\`td[data-sort]\`).dataset.sort);
            bVal = parseFloat(b.querySelector(\`td[data-sort]\`).dataset.sort);
            return currentSort.direction === 'asc' ? aVal - bVal : bVal - aVal;
          }
        });

        // Re-append sorted rows
        rows.forEach(row => tbody.appendChild(row));
      });
    });

    // Filters
    let currentTypeFilter = 'both';
    let currentServiceFilter = 'all';

    function updateFilters() {
      const rows = document.querySelectorAll('.show-row');
      let visibleCount = 0;

      rows.forEach(row => {
        let show = true;

        // Type filter (Movie/Series/Both)
        const rowType = row.dataset.type;
        if (currentTypeFilter !== 'both' && rowType !== currentTypeFilter) {
          show = false;
        }

        // Only show items with free streaming (paid options are removed)
        const hasFree = row.dataset.hasFree === 'true';
        if (!hasFree) {
          show = false;
        }

        // Service filter
        if (currentServiceFilter !== 'all') {
          const freeServices = row.dataset.freeServices.split(',');
          if (!freeServices.includes(currentServiceFilter)) {
            show = false;
          }
        }

        if (show) {
          row.classList.remove('hidden');
          visibleCount++;
        } else {
          row.classList.add('hidden');
        }
      });

      document.getElementById('visible-count').textContent = visibleCount;
    }

    // Type filter buttons (Movie/Series/Both)
    document.querySelectorAll('.type-filter').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.type-filter').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentTypeFilter = btn.dataset.type;
        updateFilters();
      });
    });

    // Service filter buttons
    document.querySelectorAll('.service-filter').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.service-filter').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentServiceFilter = btn.dataset.service;
        updateFilters();
      });
    });

    // Initial filter application (show all with free streaming)
    updateFilters();
  </script>
</body>
</html>`;
  }

  async generateTableHtmlFile(
    shows: ShowWithStreaming[],
    outputPath: string,
    detailsDir: string,
    title: string,
    subtitle: string
  ): Promise<void> {
    const generatedDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const html = this.generateTableHtml(shows, title, subtitle, detailsDir, generatedDate);
    await writeFile(outputPath, html, 'utf-8');
    console.log(`✓ Table HTML file generated: ${outputPath}`);
  }

  async generateDetailPage(
    show: ShowWithStreaming,
    detailsDir: string
  ): Promise<void> {
    const fileName = `${this.sanitizeFileName(show.title)}.html`;
    const filePath = join(detailsDir, fileName);

    // Create directory if it doesn't exist
    await mkdir(detailsDir, { recursive: true });

    const stars = this.generateStars(show.rating);
    const genresList = show.genres.join(', ');

    // Get unique free services (remove duplicates)
    const uniqueFreeServices = new Map<string, any>();
    show.freeStreamingServices.forEach(s => {
      if (!uniqueFreeServices.has(s.name)) {
        uniqueFreeServices.set(s.name, s);
      }
    });

    const freeServices = Array.from(uniqueFreeServices.values()).map(s => {
      let serviceName = s.name;
      if (s.name.toLowerCase().includes('prime')) {
        serviceName += ' (free with subscription)';
      }
      return `<a href="${s.link}" target="_blank" class="service-link ${s.name.toLowerCase().replace(/\s+/g, '-')}">${serviceName}</a>`;
    }).join('');

    const metaInfo = show.showType === 'series'
      ? `<p><strong>Seasons:</strong> ${show.seasonCount || 'N/A'}</p>`
      : `<p><strong>Runtime:</strong> ${show.runtime ? show.runtime + ' minutes' : 'N/A'}</p>`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${show.title} - Details</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      color: #fff;
      padding: 40px 20px;
      line-height: 1.6;
    }

    .container {
      max-width: 1000px;
      margin: 0 auto;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 20px;
      padding: 40px;
      backdrop-filter: blur(10px);
    }

    .poster {
      text-align: center;
      margin-bottom: 30px;
    }

    .poster img {
      max-width: 400px;
      border-radius: 15px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
    }

    h1 {
      font-size: 2.5em;
      margin-bottom: 15px;
      color: #4ecdc4;
    }

    .meta {
      font-size: 1.2em;
      color: #b8b8b8;
      margin-bottom: 20px;
    }

    .rating {
      font-size: 1.5em;
      margin-bottom: 20px;
    }

    .stars {
      color: #ffd700;
    }

    .rating-number {
      color: #fff;
      font-weight: 600;
    }

    .info-section {
      margin-bottom: 30px;
    }

    .info-section h2 {
      color: #4ecdc4;
      margin-bottom: 10px;
      font-size: 1.5em;
    }

    .info-section p {
      font-size: 1.1em;
      line-height: 1.8;
      color: #d0d0d0;
    }

    .streaming-section {
      margin-top: 30px;
    }

    .service-link {
      display: inline-block;
      padding: 12px 24px;
      margin: 8px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      font-size: 1.1em;
      color: white;
      transition: transform 0.2s, opacity 0.2s;
    }

    .service-link:hover {
      transform: scale(1.05);
      opacity: 0.9;
    }

    .service-link.netflix { background: #E50914; }
    .service-link.prime,
    .service-link.amazon-prime,
    .service-link.amazon-prime-video { background: #00A8E1; }
    .service-link.hulu { background: #1CE783; }
    .service-link.disney,
    .service-link.disney\\+ { background: #113CCF; }
    .service-link.max,
    .service-link.hbo-max { background: #002BE7; }
    .service-link.appletv,
    .service-link.apple-tv,
    .service-link.apple-tv\\+ { background: #000000; }
    .service-link.peacock { background: #000000; }
    .service-link.paramount,
    .service-link.paramount\\+ { background: #0064FF; }
    .service-link.paid { background: #888; }

    .back-link {
      display: inline-block;
      margin-top: 30px;
      color: #4ecdc4;
      text-decoration: none;
      font-size: 1.1em;
    }

    .back-link:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="poster">
      ${show.imageUrl ? `<img src="${show.imageUrl}" alt="${show.title}">` : '<p style="color: #888;">No image available</p>'}
    </div>

    <h1>${show.title}</h1>

    <div class="meta">
      ${show.year} • ${show.showType === 'series' ? 'TV Series' : 'Movie'}
    </div>

    <div class="rating">
      <span class="stars">${stars}</span> <span class="rating-number">${show.rating.toFixed(1)}/10</span>
    </div>

    <div class="info-section">
      <h2>Overview</h2>
      <p>${show.overview || 'No overview available.'}</p>
    </div>

    <div class="info-section">
      <h2>Details</h2>
      <p><strong>Genres:</strong> ${genresList || 'N/A'}</p>
      ${metaInfo}
      ${show.imdbId ? `<p><strong>IMDb:</strong> <a href="https://www.imdb.com/title/${show.imdbId}" target="_blank" style="color: #4ecdc4;">${show.imdbId}</a></p>` : ''}
    </div>

    ${freeServices ? `
    <div class="info-section streaming-section">
      <h2>Watch Free (with subscription)</h2>
      ${freeServices}
    </div>
    ` : '<div class="info-section"><p>No free streaming options available.</p></div>'}
  </div>
</body>
</html>`;

    await writeFile(filePath, html, 'utf-8');
  }

  async generateAllDetailPages(
    shows: ShowWithStreaming[],
    detailsDir: string
  ): Promise<void> {
    console.log(`\nGenerating ${shows.length} detail pages...`);

    for (const show of shows) {
      await this.generateDetailPage(show, detailsDir);
    }

    console.log(`✓ Generated ${shows.length} detail pages in ${detailsDir}`);
  }
}
