# CSV Format and Troubleshooting Guide

## Current Issues

### Issue 1: Broken Service Links
**Problem**: CSV shows `Prime Video:https` instead of full URLs
**Cause**: The streaming-availability API is returning incomplete links ("https" instead of full URLs)
**Impact**: Service badges still work because the HTML generator uses `show.showUrl` (movieofthenight.com URL) as a fallback

### Issue 2: Missing Service Filter Buttons
**Problem**: You don't see buttons for Paramount+, Peacock, AMC+, BritBox, etc.
**Cause**: None of your current shows are available on those services (or haven't been checked yet)
**Solution**: Filter buttons appear automatically when shows with those services are found

## How the System Works

### 1. **Adding New Shows to CSV**

You can add shows in two ways:

#### Option A: Minimal Entry (Recommended)
Just add the title and optionally the year:
```csv
title,year,imdbId,tmdbId,lastApiCall,lastApiCallFailed,cachedYear,cachedRating,cachedOverview,cachedGenres,cachedRuntime,cachedSeasonCount,cachedImageUrl,cachedShowUrl,cachedFreeServices,cachedPaidServices,youtubeUrl
The Princess Bride,1987,,,,,,,,,,,,,,,,
```

Then run: `npm run dev`

The system will:
1. Search the API for "The Princess Bride"
2. Find all streaming services where it's available
3. Cache the data (rating, overview, genres, etc.)
4. Save everything to CSV

#### Option B: With IMDb ID (More Accurate)
If you have the IMDb ID, include it for better matching:
```csv
title,year,imdbId,tmdbId,lastApiCall,lastApiCallFailed,cachedYear,cachedRating,cachedOverview,cachedGenres,cachedRuntime,cachedSeasonCount,cachedImageUrl,cachedShowUrl,cachedFreeServices,cachedPaidServices,youtubeUrl
The Princess Bride,1987,tt0093779,,,,,,,,,,,,,,,
```

**Where to find IMDb ID**:
- Go to https://www.imdb.com/
- Search for the movie/show
- Look at the URL: `https://www.imdb.com/title/tt0093779/`
- The ID is `tt0093779`

### 2. **CSV Column Reference**

Here's what each column means:

| Column | Description | Example | Required |
|--------|-------------|---------|----------|
| `title` | Show name | "The Princess Bride" | ✅ YES |
| `year` | Release year | 1987 | Recommended |
| `imdbId` | IMDb identifier | tt0093779 | Optional |
| `tmdbId` | TMDb identifier | (rarely used) | Optional |
| `lastApiCall` | When API was last checked | 2025-11-30T20:44:56.003Z | Auto-filled |
| `lastApiCallFailed` | Did last API call fail? | true/false | Auto-filled |
| `cachedYear` | Year from API | 1987 | Auto-filled |
| `cachedRating` | Rating (0-100) | 88 | Auto-filled |
| `cachedOverview` | Plot summary | "A fairy tale..." | Auto-filled |
| `cachedGenres` | Pipe-separated genres | "Adventure\|Comedy\|Romance" | Auto-filled |
| `cachedRuntime` | Runtime in minutes | 98 | Auto-filled |
| `cachedSeasonCount` | # of seasons (TV only) | 5 | Auto-filled |
| `cachedImageUrl` | Poster URL | https://... | Auto-filled |
| `cachedShowUrl` | movieofthenight.com URL | https://www.movieofthenight.com/show/123 | Auto-filled |
| `cachedFreeServices` | Free streaming services | "Hulu:https\|Netflix:https" | Auto-filled |
| `cachedPaidServices` | Paid streaming options | "Prime Video:https" | Auto-filled |
| `youtubeUrl` | YouTube URL or status | https://youtube.com/@channel OR "not on youtube" | Manual/Auto |

### 3. **Service Detection**

When you run `npm run dev`, the system:

1. **Checks each show** against all 14 configured services:
   - netflix
   - prime (Prime Video)
   - hulu
   - disney (Disney+)
   - max
   - appletv (Apple TV+)
   - paramount (Paramount+)
   - peacock
   - amc (AMC+)
   - britbox (BritBox)
   - criterion (Criterion Channel)
   - tubi
   - pluto (Pluto TV)
   - roku (Roku Channel)
   - freevee

2. **Categorizes availability**:
   - **Free (subscription)**: Included with service subscription
   - **Paid**: Rental or purchase required

3. **Saves to CSV**:
   - Format: `ServiceName:link|ServiceName:link`
   - Example: `Hulu:https://www.movieofthenight.com/show/82|Netflix:https://www.movieofthenight.com/show/82`

4. **Generates filter buttons** only for services with shows

## Why You're Only Seeing 6 Services

Looking at your current data, shows are only available on:
- Hulu
- YouTube (from manual entries)
- Prime Video
- Disney+
- Netflix
- (maybe 1-2 others)

The other services (Paramount+, Peacock, AMC+, BritBox, Criterion, Tubi, Pluto TV, Roku, Freevee) don't have any of your current 78 shows available.

**This will change when**:
1. You add more shows that are on those services
2. Shows move between services (streaming rights change)
3. You force a refresh to check for new availability

## Force Refresh All Shows

To force the system to re-check all shows (ignoring cache):

```bash
npm run dev -- --refresh-all
```

**Warning**: This uses your API quota (100 requests/day on free tier)
- 78 shows = 78 API calls
- Use sparingly!

## API Rate Limits

**Free Tier**: 100 requests per day

**What counts as a request**:
- Each show lookup = 1 request
- Cached shows (within 7 days) = 0 requests

**Current cache**: 7 days (configurable in config.json)

**If you hit the limit**:
- Wait 24 hours for reset
- The system will use cached data
- Or upgrade to paid plan ($10/month for 10,000 requests)

## Adding Shows - Step by Step

### Example: Adding "The Sound of Music"

1. **Find IMDb ID** (optional but recommended):
   - Go to https://www.imdb.com/
   - Search "The Sound of Music"
   - URL: https://www.imdb.com/title/tt0059742/
   - ID: `tt0059742`

2. **Add to movies.csv**:
   ```csv
   The Sound of Music,1965,tt0059742,,,,,,,,,,,,,,,
   ```

3. **Run update**:
   ```bash
   npm run build
   npm run dev
   ```

4. **Check results**:
   - Open `index.html`
   - Search for "The Sound of Music"
   - See which services it's on
   - Service filter buttons update automatically

## Troubleshooting

### "No service buttons for new services I added to config"
- Service buttons only appear when shows are available on them
- Your current shows might not be on Paramount+, Peacock, etc.
- Try adding shows known to be on those services

### "Service links show as 'https' in CSV"
- This is a known issue with the API returning incomplete links
- **It still works!** The HTML generator uses movieofthenight.com URLs as fallback
- Links in the web page work correctly

### "Show not found in API"
- Check the title spelling (must match exactly)
- Try adding IMDb ID for better matching
- Some very old or obscure shows may not be in the database

### "API rate limit exceeded"
- You've used 100+ API calls in 24 hours
- Wait for reset or use `--refresh-all` less frequently
- System will use cached data until reset

### "Duplicate services in CSV"
- Example: `Prime Video:https|Prime Video:https|Prime Video:https`
- This happens when the API returns the same service multiple times
- It's cosmetic - the HTML deduplicates them correctly

## Best Practices

1. **Add shows in batches**:
   - Add 10-20 shows to CSV
   - Run `npm run dev` once
   - Check results

2. **Use IMDb IDs when possible**:
   - More accurate matching
   - Faster API responses

3. **Don't abuse --refresh-all**:
   - Normal mode uses cache (faster, free)
   - Refresh-all mode bypasses cache (slow, uses quota)
   - Only refresh when needed

4. **Let the cache work**:
   - Default 7-day cache is good
   - Shows don't change services that often
   - Monthly refresh is usually enough

5. **YouTube URLs**:
   - Add manually for now
   - Format: `https://www.youtube.com/@channelname`
   - Or mark as `not on youtube` to skip future checks

## Example: Complete CSV Row

After processing, a row looks like this:

```csv
The Sound of Music,1965,tt0059742,,2025-11-30T21:59:40.841Z,false,1965,85,A woman leaves an Austrian convent to become a governess to the children of a Naval officer widower.,Drama|Family|Music|Romance,174,,https://cdn.movieofthenight.com/show/456/poster/vertical/en/480.jpg,https://www.movieofthenight.com/show/456,Disney+:https://www.movieofthenight.com/show/456|Hulu:https://www.movieofthenight.com/show/456,,
```

Breaking it down:
- Title: "The Sound of Music"
- Year: 1965
- IMDb ID: tt0059742
- Last checked: 2025-11-30
- API call succeeded: false (no failure)
- Rating: 85/100
- Genres: Drama, Family, Music, Romance
- Runtime: 174 minutes
- Available on: Disney+ and Hulu (both free with subscription)
- No paid rental options
- No YouTube URL

## Quick Reference: Adding a New Movie

**Minimal**:
```csv
Movie Title,Year,,,,,,,,,,,,,,,
```

**With IMDb ID**:
```csv
Movie Title,Year,tt1234567,,,,,,,,,,,,,,,
```

**Then run**:
```bash
npm run dev
```

That's it! The system handles the rest.
