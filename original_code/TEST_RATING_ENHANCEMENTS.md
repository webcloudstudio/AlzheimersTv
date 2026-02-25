# Testing Guide - Rating System Enhancements

## 🧪 Quick Test Plan

### Test 1: Community Ratings Display (Yellow Stars)
**Purpose**: Verify community averages display correctly

**Steps**:
1. Open `index.html` in browser
2. Look at any show in the table
3. **Expected**:
   - If show has votes: Yellow stars filled (⭐⭐⭐⭐☆)
   - Text below: `(N votes)` where N is the number
   - If no votes: Empty gray stars (★★★★★)

**Pass Criteria**: ✅ Yellow stars appear, vote counts correct

---

### Test 2: Vote Count Format
**Purpose**: Verify vote count displays correctly

**Steps**:
1. Check database for a show with 1 vote
2. Look at that show in the page
3. **Expected**: `(1 vote)` - singular, not "votes"

4. Check a show with multiple votes (e.g., 5 votes)
5. **Expected**: `(5 votes)` - plural

**Pass Criteria**: ✅ Singular/plural handled correctly

---

### Test 3: User Rating (Green Stars)
**Purpose**: Verify user's own ratings show in green

**Steps**:
1. Click on 4 stars for "The Godfather"
2. **Expected**:
   - Shows "Saving..." → "Saved!"
   - Stars turn GREEN (not yellow)
   - Text changes to "Your rating"

3. Refresh the page (F5)
4. **Expected**: Green stars still there, "Your rating" text

**Pass Criteria**: ✅ Green stars appear and persist

---

### Test 4: Community vs User Rating Colors
**Purpose**: Verify color coding works correctly

**Steps**:
1. Find a show you haven't rated yet
2. **Expected**: Yellow stars (if others voted) or gray (if no votes)

3. Rate that show (click any star)
4. **Expected**: Stars change to green

5. Find a different show, rate it
6. Refresh page
7. **Expected**:
   - Shows you rated: Green stars + "Your rating"
   - Shows you didn't rate: Yellow stars + "(N votes)"

**Pass Criteria**: ✅ Clear distinction between green (yours) and yellow (community)

---

### Test 5: Star Hover Effects
**Purpose**: Verify interactive hover works

**Steps**:
1. Hover mouse over 3rd star
2. **Expected**: First 3 stars turn yellow/gold and scale up
3. Move mouse away
4. **Expected**: Stars return to original state

5. On a show you've rated (green stars):
6. Hover over stars
7. **Expected**: Still shows hover effect (darker green)

**Pass Criteria**: ✅ Hover effects work on both green and yellow stars

---

### Test 6: Database Integration
**Purpose**: Verify data loads from Supabase

**Steps**:
1. Open browser console (F12)
2. Go to Console tab
3. Refresh page
4. **Expected**: No red errors
5. Look for: Supabase queries completing

6. Go to Supabase dashboard
7. Open `show_ratings_summary` table
8. **Expected**: See aggregated data (show_id, average_rating, total_votes)

**Pass Criteria**: ✅ No errors, data loads from database

---

### Test 7: Multiple Users Simulation
**Purpose**: Test community average calculation

**Steps**:
1. Rate "The Godfather" 5 stars
2. Note: Stars are green, "Your rating"

3. Open page in Incognito/Private window
4. Rate "The Godfather" 3 stars (different rating)
5. Note: Should see your own rating (green)

6. Check Supabase `show_ratings_summary`
7. **Expected**:
   - the-godfather: total_votes = 2
   - average_rating = 4.0 (average of 5 and 3)

8. Close incognito, go back to normal browser
9. **Expected**: Still see YOUR green 5-star rating

**Pass Criteria**: ✅ Each browser has own rating, community average updates

---

### Test 8: Empty State
**Purpose**: Verify shows with no ratings

**Steps**:
1. Find a show with 0 votes (check database)
2. Look at that show on page
3. **Expected**:
   - Empty gray stars ★★★★★
   - No text below stars
   - Still clickable

4. Hover over stars
5. **Expected**: Hover effect works (turn yellow)

6. Click to rate
7. **Expected**: Saves, turns green, shows "Your rating"

**Pass Criteria**: ✅ Empty state works, can rate from zero votes

---

## 🎨 Visual Verification

### Color Reference
Take a screenshot and verify colors match:

| State | Color | Hex Code | Visual |
|-------|-------|----------|--------|
| Empty star | Dark gray | #444 | ★ |
| Community (yellow) | Gold | #ffd700 | ⭐ |
| User rating (green) | Bright green | #4ade80 | 🌟 (imagine green) |
| Hover | Gold | #ffd700 | ✨ |

---

## 📊 Database Check

### Query to Verify Data
Run in Supabase SQL Editor:

```sql
-- Check summary view
SELECT * FROM show_ratings_summary
ORDER BY total_votes DESC
LIMIT 10;

-- Expected columns:
-- show_id, total_votes, average_rating

-- Check individual ratings
SELECT show_id, COUNT(*) as votes, AVG(rating) as avg
FROM show_ratings
GROUP BY show_id
ORDER BY votes DESC
LIMIT 10;

-- Should match the summary view
```

---

## 🐛 Common Issues & Solutions

### Issue 1: All stars are gray
**Problem**: Community ratings not loading

**Check**:
```javascript
// Browser console
console.log('Check errors');
```

**Solution**:
1. Verify Supabase API key is correct
2. Check `show_ratings_summary` view exists
3. Verify RLS policies allow anonymous SELECT

---

### Issue 2: Stars are yellow when they should be green
**Problem**: User ratings not loading after community ratings

**Check**:
- User ratings should load AFTER community ratings
- Check `loadUserRatings()` is called after `loadCommunityRatings()`

**Solution**:
- Verify initialization order in DOMContentLoaded event

---

### Issue 3: Vote count shows "(0 votes)"
**Problem**: Shows with ratings display 0 votes

**Check**:
```sql
SELECT * FROM show_ratings_summary
WHERE total_votes = 0;
```

**Solution**:
- This shouldn't happen if view is correct
- Re-run `supabase-setup.sql`

---

### Issue 4: Green stars don't persist
**Problem**: After refresh, user's ratings are gone

**Check**:
- localStorage has user_fingerprint
- Database has user's ratings

**Solution**:
1. Check browser allows localStorage
2. Verify rating was saved (check Supabase table)
3. Clear cache and try again

---

## ✅ Final Acceptance Test

**All systems working when**:

- [ ] Yellow stars show community averages
- [ ] Green stars show your ratings
- [ ] Vote counts display: `(N votes)` or `(1 vote)`
- [ ] "Your rating" text appears for rated shows
- [ ] Hover effects work on all stars
- [ ] Clicking saves and changes color yellow → green
- [ ] Refresh persists your green ratings
- [ ] No errors in browser console
- [ ] Database updates with each vote
- [ ] Community averages calculate correctly

---

## 📸 Screenshot Checklist

Take screenshots of:
1. ✅ Yellow stars with vote count
2. ✅ Green stars with "Your rating"
3. ✅ Mix of yellow and green in same table
4. ✅ Empty gray stars (no votes)
5. ✅ Hover effect (stars light up)
6. ✅ Browser console (no errors)

---

**Ready to test?** Start with Test 1 and work through sequentially! 🚀
