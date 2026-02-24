# Streaming Providers Expansion Plan

## Current Setup

**Current API**: `streaming-availability` npm package (v4.4.0)
- **API Provider**: RapidAPI / Movie of the Night
- **Current Services** (from config.json): netflix, prime, hulu, disney, max, appletv
- **Cache Period**: 7 days
- **Rate Limit**: Currently hitting limits (429 errors)

## ✅ Services Available in streaming-availability API

Based on the API documentation and npm package, the following services are supported:

### Subscription Services (Free with subscription)

| Service | Service ID | Notes |
|---------|-----------|-------|
| **Paramount Plus** | `paramount` | ✅ Includes Showtime content |
| **Peacock** | `peacock` | ✅ NBC/Universal content |
| **AMC+** | `amc` | ✅ AMC, IFC, Sundance, Shudder |
| **Apple TV+** | `appletv` | ✅ Already in config |
| **Showtime** | N/A | ❌ Merged with Paramount+ (June 2023) |
| **Starz** | `starz` | ✅ Premium channel |
| **MGM+** (formerly Epix) | `mgm` | ✅ MGM content |
| **BritBox** | `britbox` | ✅ British TV |
| **Mubi** | `mubi` | ✅ Curated indie films |
| **Criterion Channel** | `criterion` | ✅ Classic & art house films |

### Free Ad-Supported Services (FAST)

| Service | Service ID | Notes |
|---------|-----------|-------|
| **Tubi** | `tubi` | ✅ Fox-owned, large library |
| **Pluto TV** | `pluto` | ✅ Paramount-owned |
| **Roku Channel** | `roku` | ✅ Free streaming |
| **Crackle** | `crackle` | ✅ Sony-owned |
| **Freevee** | `freevee` | ✅ Amazon's free service |
| **Plex** | `plex` | ✅ Free content + personal media |

### PBS Note

**PBS** streaming is complex:
- PBS has `PBS Passport` (subscription)
- Many PBS shows available on YouTube for free
- PBS website streams some content free
- **PBS Passport** may be available in API as `pbs`

### ⚠️ Not Available / Issues

| Service | Status |
|---------|--------|
| Showtime | Merged with Paramount+ |
| Local PBS | Not typically in streaming APIs |

## 🎯 Recommended Service IDs to Add

### High Priority (Subscription - Good for Older Viewers)

```json
{
  "targetServices": [
    "netflix",      // Current
    "prime",        // Current
    "hulu",         // Current
    "disney",       // Current
    "max",          // Current
    "appletv",      // Current
    "paramount",    // NEW - includes Showtime content
    "peacock",      // NEW - NBC classics
    "amc",          // NEW - classic films, prestige TV
    "britbox",      // NEW - British classics
    "criterion"     // NEW - classic cinema
  ]
}
```

### Medium Priority (Free with Ads - Great for Budget)

```json
{
  "freeServices": [
    "tubi",         // Huge classic movie library
    "pluto",        // Live TV + on-demand
    "roku",         // Classic movies
    "freevee"       // Amazon's free tier
  ]
}
```

## 📊 Database Schema Enhancement

Add tracking fields to CSV to manage monthly updates:

### Current CSV Structure
```csv
title,year,imdbId,lastApiCall,lastApiCallFailed,cachedRating...
```

### Proposed Enhancement
```csv
title,year,imdbId,
lastApiCall,          // When we last fetched from API
lastApiCallFailed,    // Did it fail?
cacheExpiryDate,      // When cache expires (calculated field)
downloadDate,         // When we first added this show
needsRefresh,         // Flag: true if > N days old
errorCount,           // How many times has this failed?
...cachedData
```

### Update Logic

```typescript
// Determine if show needs refresh
function needsApiRefresh(show: ShowInput): boolean {
  // Never downloaded
  if (!show.downloadDate) return true;

  // Download failed and not in cooldown
  if (show.lastApiCallFailed === 'true') {
    const daysSinceAttempt = daysDiff(show.lastApiCall, now);
    return daysSinceAttempt > 7; // Retry failed after 7 days
  }

  // Successful download but cache expired
  const daysSinceDownload = daysDiff(show.lastApiCall, now);
  return daysSinceDownload > config.cacheDays;
}

// Monthly update schedule
function shouldProcessShow(show: ShowInput, mode: 'normal' | 'refresh-all'): boolean {
  if (mode === 'refresh-all') return true;

  return needsApiRefresh(show);
}
```

## 🔄 Monthly Update Strategy

### Strategy 1: Rolling Updates (Recommended)

Update 1/30th of shows daily:

```bash
# Day 1: Update shows 1-50
npm run update -- --start 0 --count 50

# Day 2: Update shows 51-100
npm run update -- --start 50 --count 50

# etc...
```

### Strategy 2: Weekly Batch

Update shows older than 7 days:

```bash
# Runs automatically, only updates stale shows
npm run dev
```

### Strategy 3: Full Monthly Refresh

```bash
# First day of month
npm run dev:refresh-all
```

## 🚀 Implementation Plan

### Phase 1: Add New Services (1 hour)

**Files to modify**:
1. `config.json` - Add service IDs
2. `index.html` - Add filter buttons
3. CSS - Add service badge colors

**Changes**:

**config.json**:
```json
{
  "targetServices": [
    "netflix", "prime", "hulu", "disney", "max", "appletv",
    "paramount", "peacock", "amc", "britbox", "criterion",
    "tubi", "pluto", "roku", "freevee"
  ]
}
```

**index.html** - Add filter buttons:
```html
<button class="filter-btn service-filter" data-service="Paramount+">Paramount+</button>
<button class="filter-btn service-filter" data-service="Peacock">Peacock</button>
<button class="filter-btn service-filter" data-service="AMC+">AMC+</button>
<button class="filter-btn service-filter" data-service="BritBox">BritBox</button>
<button class="filter-btn service-filter" data-service="Tubi">Tubi</button>
```

**CSS** - Add badge colors:
```css
.service-badge.paramount,
.service-badge.paramount\+ { background: #0064FF; }

.service-badge.peacock { background: #000000; }

.service-badge.amc,
.service-badge.amc\+ { background: #000000; }

.service-badge.britbox { background: #E5097F; }

.service-badge.tubi { background: #FA3C28; }

.service-badge.criterion { background: #000000; }
```

### Phase 2: Enhanced Caching (2 hours)

**Files to modify**:
1. `src/types.ts` - Add new fields
2. `src/csvParser.ts` - Parse new fields
3. `src/csvWriter.ts` - Write new fields
4. `src/streamingApi.ts` - Update cache logic

**New CSV fields**:
```typescript
export interface ShowInput {
  // Existing fields...

  // New tracking fields
  downloadDate?: string;       // When first added
  cacheExpiryDate?: string;   // Calculated expiry
  errorCount?: number;        // Failed attempt count
  lastSuccessfulCall?: string; // Last successful fetch
}
```

### Phase 3: Selective Update Script (2 hours)

Create `update-stale-shows.ts`:

```typescript
// Only update shows that:
// 1. Have downloadDate = null (never fetched)
// 2. Have lastApiCall > cacheDays old
// 3. Have lastApiCallFailed = true AND > 7 days old

async function updateStaleShows() {
  const shows = await parseCSV();

  const showsToUpdate = shows.filter(show => {
    if (!show.downloadDate) return true; // Never fetched

    if (show.lastApiCallFailed === 'true') {
      const daysSince = daysDiff(show.lastApiCall, Date.now());
      return daysSince > 7; // Retry failed after 1 week
    }

    const daysSince = daysDiff(show.lastApiCall, Date.now());
    return daysSince > config.cacheDays; // Cache expired
  });

  console.log(`Updating ${showsToUpdate.length} stale shows`);

  // Process only stale shows
  await processShows(showsToUpdate);
}
```

### Phase 4: HTML Filter Updates (1 hour)

Update filter logic to handle new services:

```javascript
// Update service filter section
const serviceFilters = [
  'All Services',
  'Netflix', 'Prime Video', 'Hulu', 'Disney+', 'Max',
  'Paramount+', 'Peacock', 'AMC+',
  'BritBox', 'Criterion',
  'Tubi', 'Pluto TV', 'Roku', 'Freevee'
];
```

## 📅 Automation Strategy

### Cron Job (GitHub Actions)

Create `.github/workflows/update-shows.yml`:

```yaml
name: Update Show Availability

on:
  schedule:
    # Run daily at 2 AM UTC
    - cron: '0 2 * * *'
  workflow_dispatch:

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'

      - run: npm install
      - run: npm run build
      - run: npm run update-stale

      - name: Commit changes
        run: |
          git config user.name github-actions
          git config user.email github-actions@github.com
          git add *.csv index.html
          git commit -m "Auto-update streaming availability [skip ci]" || echo "No changes"
          git push
```

## 💰 Cost Considerations

### Current API Limits (Free Tier)
- **100 requests/day** on free tier
- **78 shows** = at least 78 API calls
- **Problem**: Can't refresh all shows daily

### Solutions:

1. **Upgrade API Plan** ($10/month)
   - 10,000 requests/month
   - ~333 requests/day
   - Can refresh all 78 shows ~4x/day

2. **Rotate Updates** (Free tier)
   - Update 1/30th of shows daily
   - Each show refreshed monthly
   - Stays within 100 requests/day

3. **Smart Caching** (Free tier)
   - Only update if cache expired (7+ days)
   - Only ~11 shows/day need updates
   - Stays well under limit

## ✅ Recommended Approach

### Immediate (This Session):
1. ✅ Add new service IDs to config.json
2. ✅ Add new filter buttons to HTML
3. ✅ Add CSS for new service badges
4. ✅ Run one-time update with new services

### Next Week:
5. Add CSV tracking fields
6. Implement smart cache logic
7. Create update-stale-shows script

### Ongoing:
8. Run update daily (manual or automated)
9. Monitor API usage
10. Adjust cache period as needed

## 📝 Summary

**Services to Add**:
- Paramount+ (includes Showtime content)
- Peacock
- AMC+
- BritBox
- Criterion Channel
- Tubi (free)
- Pluto TV (free)
- Roku Channel (free)
- Freevee (free)

**Implementation**:
- 1 hour to add services to config + HTML
- Works with existing code
- Monthly updates via smart caching
- Free tier sufficient with rotation

**Next Steps**:
1. Update config.json with new service IDs
2. Add filter buttons to HTML
3. Add CSS for service badges
4. Test with `npm run dev`

Ready to proceed with implementation?
