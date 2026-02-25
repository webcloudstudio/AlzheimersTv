# AlzheimersTv Movie Finder

A Node.js application that generates HTML pages of movies and TV shows with streaming availability information. Designed for creating content targeted at older viewers, featuring classic films available on major streaming services.

## Features

- Reads movie lists from CSV files
- Checks streaming availability across Netflix, Prime Video, Hulu, Disney+, Max, Apple TV+, and more
- Generates beautiful, responsive HTML pages ready for screen recording
- Sorts movies by rating and year (newer, higher-rated first)
- Filters content suitable for older audiences
- Configurable processing limits to manage API usage

## Prerequisites

- Node.js 18.0.0 or higher
- A RapidAPI account with access to the Streaming Availability API

## Setup

### 1. Get Your API Key

1. Visit [RapidAPI - Streaming Availability API](https://rapidapi.com/movie-of-the-night-movie-of-the-night-default/api/streaming-availability)
2. Sign up for a free account (no credit card required for free tier)
3. Subscribe to the free plan (100 requests/day)
4. Copy your API key from the dashboard

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure the Application

Edit `config.json` and add your API key:

```json
{
  "apiKey": "YOUR_RAPIDAPI_KEY_HERE",
  "country": "us",
  "maxMoviesToProcess": 50,
  "targetServices": ["netflix", "prime", "hulu", "disney", "max", "appletv"],
  "minYear": 1950,
  "outputHtmlFile": "movies.html",
  "csvInputFile": "movies.csv"
}
```

**Configuration Options:**

- `apiKey`: Your RapidAPI key (required)
- `country`: Country code for streaming availability (e.g., "us", "uk", "ca")
- `maxMoviesToProcess`: Maximum number of movies to process from CSV
- `targetServices`: Array of streaming service IDs to check
- `minYear`: Filter out movies older than this year
- `outputHtmlFile`: Name of the generated HTML file
- `csvInputFile`: Path to your CSV file with movie list

### 4. Prepare Your CSV File

Create a CSV file (default: `movies.csv`) with your movie list. The CSV should have these columns:

- `title` (required): Movie title
- `year` (optional): Release year
- `imdbId` (optional): IMDb ID for more accurate matching (e.g., "tt0111161")

**Example CSV:**

```csv
title,year,imdbId
The Shawshank Redemption,1994,tt0111161
The Godfather,1972,tt0068646
Casablanca,1942,tt0034583
```

A sample CSV with 50 classic movies is included.

## Usage

### Normal Mode (Recommended)

Uses cached data when available and skips shows that recently failed API calls:

```bash
npm run dev
```

This mode:
- ✅ Uses cached data for shows fetched within the cache period (default: 7 days)
- ✅ Fetches new shows that haven't been attempted before
- ⏭️ Skips shows that failed API calls within the cache period
- 🛡️ Stops automatically if API rate limit is hit (after 5 consecutive errors)

### Refresh All Mode

Re-fetches ALL shows from the API, ignoring cache:

```bash
npm run dev:refresh-all
```

⚠️ **Warning**: This mode will make API calls for every show and may quickly exhaust your API quota.

Use this mode when:
- You want to update all data with fresh information
- After the API rate limit has reset (usually 24 hours)
- You've upgraded to a higher API tier

### What Happens

1. The application reads your CSV file
2. For each movie, it queries the Streaming Availability API
3. It filters movies that are available on your target streaming services
4. Movies are sorted by rating and year (best and newest first)
5. An HTML file is generated with all available movies

### Output

The generated HTML file (`movies.html` by default) includes:

- Movie posters
- Title, year, and runtime
- IMDb rating
- Genre information
- Plot overview
- Direct links to streaming services
- Responsive design that looks great on all screen sizes

## API Rate Limits

The free tier includes:
- 100 requests per day
- Each movie lookup counts as 1-2 requests

Tips for managing your quota:
- Use the `maxMoviesToProcess` setting to limit processing
- Include IMDb IDs in your CSV for more efficient lookups
- Process movies in batches if you have a large list

## Customization

### Styling

Edit `src/htmlGenerator.ts` to customize:
- Color scheme
- Layout and card design
- Font sizes and styles
- Streaming service badge colors

### Filtering

Edit `src/movieSorter.ts` to adjust:
- Minimum rating threshold (default: 6.0)
- Minimum year filter
- Sorting priority

### Streaming Services

Available service IDs for `targetServices` in config:
- `netflix`
- `prime` (Amazon Prime Video)
- `hulu`
- `disney` (Disney+)
- `max` (HBO Max)
- `appletv` (Apple TV+)
- `paramount` (Paramount+)
- `peacock`
- And many more...

## Project Structure

```
AlzheimersTv/
├── src/
│   ├── index.ts              # Main application entry point
│   ├── csvParser.ts          # CSV file parsing
│   ├── streamingApi.ts       # Streaming Availability API integration
│   ├── htmlGenerator.ts      # HTML page generation
│   ├── movieSorter.ts        # Sorting and filtering logic
│   └── types.ts              # TypeScript type definitions
├── config.json               # Configuration file
├── movies.csv                # Sample movie list
├── package.json              # Node.js dependencies
├── tsconfig.json             # TypeScript configuration
└── README.md                 # This file
```

## Troubleshooting

### "No results found for [movie title]"
- Check the spelling in your CSV
- Add the IMDb ID for more accurate matching
- The movie might not be in the API's database

### "Not available on target services"
- The movie isn't currently streaming on your selected services
- Try expanding the `targetServices` list in config.json

### API Rate Limit Errors
- You've exceeded the daily quota
- Reduce `maxMoviesToProcess` or wait 24 hours
- Consider upgrading to a paid plan for higher limits

### TypeScript Errors
- Make sure you're using Node.js 18.0.0 or higher
- Run `npm install` to ensure all dependencies are installed
- Delete `node_modules` and `dist` folders, then reinstall

## For YouTube Video Production

The generated HTML is optimized for screen recording:
- Large, readable text suitable for video compression
- High contrast for better visibility
- Clean layout without distracting animations
- Direct streaming links for easy verification

**Recording Tips:**
1. Open the HTML file in full-screen browser mode
2. Use 1920x1080 resolution for best quality
3. Scroll slowly through the list
4. Consider adding background music in your video editor

## License

ISC

## Support

For issues with:
- This application: Check the GitHub issues
- Streaming Availability API: Visit [RapidAPI Support](https://rapidapi.com/movie-of-the-night-movie-of-the-night-default/api/streaming-availability)

## Credits

Powered by the [Streaming Availability API](https://www.movieofthenight.com/)
