# YouTube Integration Options

## Problem Statement
Many classic movies and TV shows (especially PBS content) are available for free on YouTube, but the current streaming-availability API does not explicitly list YouTube as a supported service.

## Research Findings

### Current API (streaming-availability v4.4.0)
**Confirmed Supported Services:**
- Netflix, Prime Video, Hulu, Disney+, Max, Apple TV+
- Paramount+, Peacock, AMC+, BritBox, Criterion
- Tubi, Pluto TV, Roku Channel, Freevee
- **YouTube**: ❓ Unknown (likely not supported)

### Why YouTube is Complex
1. **Content Licensing**: YouTube has both:
   - Official studio channels (Warner Bros, Sony Pictures)
   - User-uploaded content (copyright unclear)
   - Free ad-supported movies (YouTube Movies)
   - Rental/purchase options (YouTube Movies - paid)

2. **No Subscription Model**: Unlike Netflix, YouTube doesn't have a unified subscription for all content

3. **Availability Changes**: Content appears/disappears frequently

## Solution Options

### ⭐ Option 1: Manual YouTube Curation (Recommended)

**Approach:**
- Add a `youtubeUrl` column to CSV
- Manually curate YouTube links for shows
- Display YouTube as an additional free option

**Pros:**
- ✅ No additional API costs
- ✅ Complete control over quality/legitimacy
- ✅ Can verify content is official
- ✅ Easy to implement

**Cons:**
- ❌ Manual work required
- ❌ Links may break over time
- ❌ No automatic updates

**Implementation:**
```csv
title,year,imdbId,...,youtubeUrl
"The Dick Van Dyke Show",1961,tt0054518,...,https://www.youtube.com/@DickVanDykeShow
"I Love Lucy",1951,tt0043208,...,https://www.youtube.com/@ILoveLucyTV
```

**Example YouTube Sources:**
- PBS: https://www.youtube.com/@PBS (many shows free)
- Classic TV: Many old shows have official channels
- Turner Classic Movies: https://www.youtube.com/@tcm

---

### Option 2: YouTube Free Movies API

**Service:** Zyla API Hub - YouTube Free Movies API
**URL:** https://zylalabs.com/api-marketplace/streaming/youtube+free+movies+api/5970

**Features:**
- Access to YouTube's free movie catalog
- Includes ratings, reviews, cast
- Structured API responses

**Pros:**
- ✅ Automated YouTube movie detection
- ✅ Curated free content only
- ✅ Structured data

**Cons:**
- ❌ Additional API subscription needed
- ❌ Only covers movies (not TV shows)
- ❌ Another rate limit to manage
- ❌ Cost (pricing unknown from search)

---

### Option 3: Watchmode API (Full Migration)

**Service:** Watchmode API
**URL:** https://api.watchmode.com/

**Features:**
- Supports 200+ streaming services
- Includes YouTube
- Free tier available
- More comprehensive than current API

**Pros:**
- ✅ YouTube included
- ✅ More services (200+ vs ~30)
- ✅ Better free service coverage
- ✅ Free tier available

**Cons:**
- ❌ Complete codebase migration
- ❌ Different API structure
- ❌ Unknown free tier limits
- ❌ Learning curve

**Migration Effort:** 4-8 hours

---

### Option 4: Check if YouTube Actually IS Supported

Let me test if YouTube might be supported under a different service ID:

**Possible Service IDs to Test:**
- `youtube`
- `youtube-free`
- `youtube-movies`
- `googlevideo`

**Test Approach:**
Create a script to query the API for all supported services and check for YouTube variants.

---

## Recommended Implementation Plan

### Phase 1: Quick Win (1 hour)
**Manual YouTube Links for PBS Shows**

1. Add `youtubeUrl` column to CSV:
```typescript
export interface ShowInput {
  // ... existing fields
  youtubeUrl?: string;  // Official YouTube channel/playlist
}
```

2. Manually add YouTube links for PBS shows:
   - Call the Midwife → Check PBS YouTube
   - Masterpiece shows → PBS Masterpiece channel
   - Doc Martin → Available on BritBox YouTube?

3. Display YouTube badge if URL exists:
```html
<a href="${show.youtubeUrl}" target="_blank" class="service-badge youtube">
  YouTube (Free)
</a>
```

4. Add CSS:
```css
.service-badge.youtube { background: #FF0000; }
```

**Result:** Users can find YouTube sources for select shows

---

### Phase 2: Verify API Support (30 minutes)

Test if streaming-availability API actually supports YouTube:

1. Run service discovery script (list-services.ts)
2. Check output for any YouTube-related services
3. If found, add to config.json

**If YouTube IS supported:**
- Add `youtube` to targetServices
- Update automatically like other services
- No manual work needed!

**If YouTube is NOT supported:**
- Proceed with manual curation (Phase 1)
- Consider Watchmode migration for future

---

### Phase 3: Community Enhancement (Future)

Allow users to suggest YouTube links:
1. Add "Suggest YouTube Link" button
2. Store suggestions in Supabase
3. Moderator reviews before adding to CSV

---

## Specific Use Cases

### PBS Content
**Problem:** Many PBS shows require PBS Passport (paid subscription)
**YouTube Solution:**
- PBS uploads full episodes to YouTube
- Completely free with ads
- Examples: Nature, NOVA, Antiques Roadshow

**Implementation:**
```csv
"Nature",1982,tt0083437,...,https://www.youtube.com/@PBSNATURE
"NOVA",1974,tt0206501,...,https://www.youtube.com/@novapbs
```

### Classic Sitcoms
**Problem:** Many classic sitcoms scattered across services
**YouTube Solution:**
- Official channels often upload episodes
- Free with ads

**Examples:**
- I Love Lucy: Has official YouTube channel
- The Dick Van Dyke Show: Episodes on YouTube
- Classic TV Network channels

### Public Domain Movies
**Problem:** Many classic films (pre-1928) in public domain
**YouTube Solution:**
- Legally available free on YouTube
- Multiple uploaders

---

## Decision Matrix

| Criteria | Manual Curation | YouTube API | Watchmode | Current API |
|----------|----------------|-------------|-----------|-------------|
| Cost | Free | Paid? | Free tier | Current |
| Effort | Low | Medium | High | None |
| Coverage | Limited | Movies only | Comprehensive | Good |
| YouTube Support | ✅ Yes | ✅ Yes | ✅ Yes | ❌ No |
| Maintenance | Manual | Auto | Auto | Auto |

---

## My Recommendation

**Start with Manual Curation (Phase 1)**

**Why:**
1. Zero additional cost
2. Immediate value (especially PBS shows)
3. Quality control (verify official sources)
4. Easy to implement (30 min - 1 hour)
5. Can always automate later

**Focus on:**
- PBS shows (high value for target audience)
- Classic TV with official channels
- Public domain films

**Next Step:**
Test if `youtube` or `youtube-free` is actually supported by current API. If yes, switch to automatic! If no, proceed with manual curation.

---

## Implementation Steps

### Step 1: Test Current API
```bash
# Run the service discovery script
npm run build
node dist/list-services.js

# Look for "youtube" in output
grep -i youtube output.txt
```

### Step 2A: If YouTube IS in API
```json
// config.json
{
  "targetServices": [
    ...,
    "youtube",  // or whatever the ID is
    "youtube-free"
  ]
}
```

### Step 2B: If YouTube NOT in API
```typescript
// src/types.ts
export interface ShowInput {
  // Add field
  youtubeUrl?: string;
}

// src/csvWriter.ts
// Add youtubeUrl to CSV output

// src/htmlTableGenerator.ts
// Display YouTube badge if youtubeUrl exists
```

### Step 3: Populate Data
```csv
# Manually add for top PBS/classic shows
"Call the Midwife",2012,tt2261188,...,https://www.youtube.com/@pbsmasterpiece
```

---

## Conclusion

**YouTube integration is valuable** because:
- Many classic shows legally available
- Free for users (ad-supported)
- Especially good for PBS content
- Target audience (older viewers) may prefer free options

**Best approach:**
1. Test if current API supports it (30 min)
2. If not, manually curate top 20 shows (1 hour)
3. Expand gradually
4. Consider Watchmode migration if YouTube becomes critical

Would you like me to:
1. ✅ Test if current API supports YouTube?
2. ✅ Add manual YouTube URL field to CSV?
3. ✅ Create curated list of YouTube sources for your shows?
