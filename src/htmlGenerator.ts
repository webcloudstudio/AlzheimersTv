import { ShowWithStreaming } from './types.js';
import { writeFile } from 'fs/promises';

export class HtmlGenerator {
  private generateShowCard(show: ShowWithStreaming): string {
    const genresHtml = show.genres.slice(0, 3).join(', ');
    const servicesHtml = show.streamingServices
      .map(service => `
        <a href="${service.link}" target="_blank" class="service-badge ${service.name.toLowerCase().replace(/\s+/g, '-')}">
          ${service.name}
        </a>
      `)
      .join('');

    const metaInfo = show.showType === 'series'
      ? `${show.seasonCount ? `${show.seasonCount} Season${show.seasonCount > 1 ? 's' : ''}` : ''}`
      : `${show.runtime ? `${show.runtime} min` : ''}`;

    return `
      <div class="movie-card">
        <div class="movie-poster">
          ${show.imageUrl ? `<img src="${show.imageUrl}" alt="${show.title}">` : '<div class="no-image">No Image</div>'}
        </div>
        <div class="movie-info">
          <h2 class="movie-title">${show.title}</h2>
          <div class="movie-meta">
            <span class="year">${show.year}</span>
            ${metaInfo ? `<span class="runtime">${metaInfo}</span>` : ''}
            <span class="rating">⭐ ${show.rating.toFixed(1)}/10</span>
          </div>
          <div class="genres">${genresHtml}</div>
          <p class="overview">${show.overview}</p>
          <div class="streaming-services">
            <strong>Watch on:</strong>
            ${servicesHtml}
          </div>
        </div>
      </div>
    `;
  }

  private generateHtml(shows: ShowWithStreaming[], generatedDate: string, title: string, subtitle: string): string {
    const showsHtml = shows.map(show => this.generateShowCard(show)).join('\n');

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
      max-width: 1400px;
      margin: 0 auto;
    }

    header {
      text-align: center;
      padding: 40px 20px;
      margin-bottom: 40px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 20px;
      backdrop-filter: blur(10px);
    }

    h1 {
      font-size: 3em;
      margin-bottom: 10px;
      background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .subtitle {
      font-size: 1.2em;
      color: #b8b8b8;
      margin-top: 10px;
    }

    .generated-date {
      font-size: 0.9em;
      color: #888;
      margin-top: 15px;
    }

    .movies-grid {
      display: grid;
      gap: 30px;
    }

    .movie-card {
      background: rgba(255, 255, 255, 0.08);
      border-radius: 15px;
      overflow: hidden;
      display: grid;
      grid-template-columns: 250px 1fr;
      gap: 25px;
      padding: 20px;
      transition: transform 0.3s, box-shadow 0.3s;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .movie-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
    }

    .movie-poster {
      width: 250px;
      height: 375px;
      border-radius: 10px;
      overflow: hidden;
      background: rgba(0, 0, 0, 0.3);
    }

    .movie-poster img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .no-image {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      font-size: 1.2em;
    }

    .movie-info {
      display: flex;
      flex-direction: column;
      gap: 15px;
      padding: 10px 0;
    }

    .movie-title {
      font-size: 2em;
      color: #fff;
      margin-bottom: 5px;
    }

    .movie-meta {
      display: flex;
      gap: 20px;
      font-size: 1.1em;
      color: #b8b8b8;
      flex-wrap: wrap;
    }

    .movie-meta span {
      display: flex;
      align-items: center;
      gap: 5px;
    }

    .rating {
      color: #ffd700;
      font-weight: bold;
    }

    .genres {
      color: #4ecdc4;
      font-size: 1em;
      font-weight: 500;
    }

    .overview {
      color: #d0d0d0;
      font-size: 1.1em;
      line-height: 1.8;
      margin: 10px 0;
    }

    .streaming-services {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      align-items: center;
      margin-top: auto;
      font-size: 1.1em;
    }

    .streaming-services strong {
      color: #fff;
      margin-right: 10px;
    }

    .service-badge {
      display: inline-block;
      padding: 8px 16px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      font-size: 0.95em;
      transition: transform 0.2s, opacity 0.2s;
      color: white;
    }

    .service-badge:hover {
      transform: scale(1.05);
      opacity: 0.9;
    }

    .netflix { background: #E50914; }
    .prime { background: #00A8E1; }
    .hulu { background: #1CE783; }
    .disney { background: #113CCF; }
    .disney\\+ { background: #113CCF; }
    .max { background: #002BE7; }
    .hbo-max { background: #002BE7; }
    .appletv { background: #000000; }
    .apple-tv { background: #000000; }
    .apple-tv\\+ { background: #000000; }
    .peacock { background: #000000; }
    .paramount\\+ { background: #0064FF; }
    .paramount { background: #0064FF; }

    @media (max-width: 768px) {
      .movie-card {
        grid-template-columns: 1fr;
        gap: 15px;
      }

      .movie-poster {
        width: 100%;
        max-width: 300px;
        margin: 0 auto;
      }

      h1 {
        font-size: 2em;
      }

      .movie-title {
        font-size: 1.5em;
      }
    }

    .footer {
      text-align: center;
      margin-top: 60px;
      padding: 30px;
      color: #888;
      font-size: 0.9em;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>${title}</h1>
      <p class="subtitle">${subtitle}</p>
      <p class="generated-date">Updated: ${generatedDate}</p>
    </header>

    <div class="movies-grid">
      ${showsHtml}
    </div>

    <div class="footer">
      <p>Generated for AlzheimersTv</p>
      <p>Streaming availability subject to change. Links valid as of generation date.</p>
    </div>
  </div>
</body>
</html>`;
  }

  async generateHtmlFile(
    shows: ShowWithStreaming[],
    outputPath: string,
    title: string,
    subtitle: string
  ): Promise<void> {
    const generatedDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const html = this.generateHtml(shows, generatedDate, title, subtitle);
    await writeFile(outputPath, html, 'utf-8');
    console.log(`✓ HTML file generated: ${outputPath}`);
  }
}
