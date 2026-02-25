# YouTube URL Integration - Implementation Complete

## Overview

The YouTube URL feature has been fully implemented. This allows you to manually add YouTube links to shows or use the automated discovery function to find YouTube sources.

## What Was Implemented

### 1. **Database Schema Changes**

Added `youtubeUrl` column to CSV files:
- **Type**: Optional string field
- **Values**:
  - Empty/blank: Not yet checked
  - Valid URL (starts with `http`): YouTube source found
  - `"not on youtube"`: Previously checked, no YouTube source available

### 2. **TypeScript Type Updates**

Updated interfaces in `src/types.ts`:
```typescript
export interface ShowInput {
  // ... existing fields
  youtubeUrl?: string; // YouTube URL if available, or 'not on youtube' if checked
}

export interface ShowWithStreaming {
  // ... existing fields
  youtubeUrl?: string; // YouTube URL if available
}

export interface Config {
  apiKey: string;
  youtubeApiKey?: string; // Optional YouTube Data API v3 key for YouTube discovery
  // ... other fields
}
```

### 3. **CSV Handling**

**Parser (`src/csvParser.ts`)**:
- Reads `youtubeUrl` column from CSV
- Preserves existing values

**Writer (`src/csvWriter.ts`)**:
- Saves `youtubeUrl` column to CSV
- Preserves values from input or API data
- Added to column list for CSV output

### 4. **YouTube Discovery Function**

Created `src/youtubeDiscovery.ts`:
- **YouTubeDiscovery class** with methods:
  - `shouldCheckYouTube(show)`: Determines if show needs checking
  - `discoverYouTubeUrl(title, year)`: Searches YouTube API for content
  - `discoverBatch(shows)`: Processes multiple shows

**Features**:
- Only checks shows with blank `youtubeUrl`
- Skips shows marked as `"not on youtube"`
- Searches using multiple query variations
- Returns YouTube channel or video URLs
- Handles API rate limits (1 second delay between requests)

**YouTube API Usage**:
- Uses YouTube Data API v3
- Requires API key in `config.json` as `youtubeApiKey`
- Searches for official channels and videos
- Free tier: 10,000 quota units/day

### 5. **HTML Display Updates**

**Table Generator (`src/htmlTableGenerator.ts`)**:
- Displays YouTube badge when URL exists
- Badge shows "YouTube (free)" label
- YouTube badge uses red background (#FF0000)
- Links directly to YouTube URL
- YouTube included in service filter buttons
- YouTube added to `data-free-services` attribute for filtering

**CSS Styling**:
```css
.service-badge.youtube { background: #FF0000; }
.service-link.youtube { background: #FF0000; }
```

### 6. **Streaming API Integration**

**Cache Method (`src/streamingApi.ts`)**:
- Preserves `youtubeUrl` when loading from cache
- Passes through to `ShowWithStreaming` object

## How to Use

### Manual Method (Recommended for Now)

1. **Edit CSV Files Directly**:
   ```csv
   title,year,imdbId,tmdbId,...,youtubeUrl
   "Call the Midwife",2012,tt2261188,,...,https://www.youtube.com/@pbsmasterpiece
   "I Love Lucy",1951,tt0043208,,...,https://www.youtube.com/@ILoveLucyTV
   "The Dick Van Dyke Show",1961,tt0054518,,...,https://www.youtube.com/@DickVanDykeShow
   ```

2. **Mark Shows NOT on YouTube**:
   ```csv
   "The Godfather",1972,tt0068646,,...,not on youtube
   ```
   This prevents the discovery algorithm from rechecking.

3. **Run Update**:
   ```bash
   npm run build
   npm run dev
   ```

4. **View Results**:
   - Open `index.html` in browser
   - YouTube badges will appear for shows with URLs
   - Click YouTube filter to show only YouTube-available content

### Automated Discovery Method (Future)

The YouTube discovery function is ready but needs integration into the main workflow:

**To enable automated discovery**:

1. **Get YouTube API Key**:
   - Go to https://console.cloud.google.com/
   - Create project → Enable YouTube Data API v3
   - Create credentials → API key
   - Copy the key

2. **Add to config.json**:
   ```json
   {
     "apiKey": "...",
     "youtubeApiKey": "YOUR_YOUTUBE_API_KEY_HERE",
     ...
   }
   ```

3. **Create Integration Script** (example):
   ```typescript
   // discover-youtube.ts
   import { parseShowsCSV } from './src/csvParser.js';
   import { YouTubeDiscovery } from './src/youtubeDiscovery.js';
   import config from './config.json';

   async function main() {
     const shows = await parseShowsCSV('tvshows.csv');
     const discovery = new YouTubeDiscovery(config.youtubeApiKey!);
     const results = await discovery.discoverBatch(shows);

     // Update shows with discovered URLs
     shows.forEach(show => {
       const url = results.get(show.title);
       if (url) {
         show.youtubeUrl = url;
       }
     });

     // Write back to CSV (use csvWriter.updateCsvWithApiData)
   }

   main();
   ```

## Files Modified

1. ✅ `src/types.ts` - Added `youtubeUrl` and `youtubeApiKey` fields
2. ✅ `src/csvParser.ts` - Read `youtubeUrl` column
3. ✅ `src/csvWriter.ts` - Write `youtubeUrl` column
4. ✅ `src/youtubeDiscovery.ts` - **NEW FILE** - YouTube discovery logic
5. ✅ `src/htmlTableGenerator.ts` - Display YouTube badges and CSS
6. ✅ `src/streamingApi.ts` - Preserve `youtubeUrl` in cache

## Example Use Cases

### PBS Content
Many PBS shows are free on YouTube:
```csv
title,youtubeUrl
"Nature",https://www.youtube.com/@PBSNATURE
"NOVA",https://www.youtube.com/@novapbs
"Antiques Roadshow",https://www.youtube.com/@antiquesroadshow
```

### Classic TV
Official channels for classic shows:
```csv
title,youtubeUrl
"I Love Lucy",https://www.youtube.com/@ILoveLucyTV
"The Dick Van Dyke Show",https://www.youtube.com/@DickVanDykeShow
"The Carol Burnett Show",https://www.youtube.com/@thecarolburnettshowofficial
```

### Mark as Not Available
Shows checked but not on YouTube:
```csv
title,youtubeUrl
"Breaking Bad",not on youtube
"Game of Thrones",not on youtube
```

## Discovery Algorithm Logic

The `YouTubeDiscovery` class:

1. **Filtering**:
   - Only checks shows with blank/empty `youtubeUrl`
   - Skips shows already marked as `"not on youtube"`
   - Skips shows with existing URLs

2. **Search Strategy**:
   - Query 1: `"{title} official channel"`
   - Query 2: `"{title} {year} full episodes"`
   - Query 3: `"{title} official"`

3. **Matching**:
   - Looks for channel titles matching show title
   - Looks for video titles matching show title
   - Returns first strong match

4. **Result Format**:
   - Channel: `https://www.youtube.com/channel/{channelId}`
   - Video: `https://www.youtube.com/watch?v={videoId}`
   - Not found: `"not on youtube"`

5. **Rate Limiting**:
   - 1.1 second delay between requests
   - Handles API quota errors gracefully

## YouTube API Quota

**Free Tier Limits**:
- 10,000 quota units per day
- Each search costs ~100 units
- Can check ~100 shows per day

**Cost per operation**:
- Search query: 100 units
- Get video details: 1 unit

**Recommendations**:
- Run discovery once per week or month
- Manually curate top shows first
- Use "not on youtube" status to avoid rechecking

## Next Steps (Optional Enhancements)

### 1. Integrate Discovery into Main Workflow
Add YouTube discovery step to `npm run dev`:
```typescript
// In main update script
if (config.youtubeApiKey) {
  await runYouTubeDiscovery();
}
```

### 2. Add YouTube-Specific Filters
- "Free on YouTube" filter button
- Combine with other filters
- Show YouTube-only content

### 3. Community Curation
- Allow users to suggest YouTube URLs
- Store suggestions in Supabase
- Moderator approval before adding to CSV

### 4. Smart Discovery
- Prioritize PBS shows (high YouTube availability)
- Skip modern streaming-only shows
- Focus on classic/public domain content

## Testing

To test the implementation:

1. **Manual Testing**:
   ```bash
   # Add a YouTube URL to one show in tvshows.csv
   # Example: Add https://www.youtube.com/@pbsmasterpiece to "Call the Midwife"

   npm run build
   npm run dev

   # Open index.html
   # Look for YouTube badge on "Call the Midwife"
   # Click YouTube filter button
   ```

2. **Discovery Testing** (requires YouTube API key):
   ```typescript
   // Create test-youtube.ts
   import { YouTubeDiscovery } from './src/youtubeDiscovery.js';

   const discovery = new YouTubeDiscovery('YOUR_API_KEY');
   const url = await discovery.discoverYouTubeUrl('Call the Midwife', 2012);
   console.log('Found:', url);
   ```

## Troubleshooting

**YouTube badge not appearing**:
- Check CSV has `youtubeUrl` column
- Verify URL starts with `http`
- Run `npm run build && npm run dev`
- Clear browser cache

**Discovery not finding shows**:
- Check YouTube API key is valid
- Verify API quota not exceeded
- Try more specific search terms
- Some shows may not be on YouTube

**Filter not working**:
- Check `data-free-services` includes YouTube
- Verify JavaScript filtering logic
- Check browser console for errors

## Summary

✅ YouTube URL column fully implemented
✅ Manual curation ready to use
✅ Automated discovery function created
✅ HTML display with badges and filters
✅ CSS styling (red YouTube badge)
✅ All code compiled successfully

**Ready to use**: You can now add YouTube URLs manually to your CSV files and they will display as red badges in the HTML output!

**Next step**: Add a few YouTube URLs to your shows and run `npm run dev` to see them in action.
