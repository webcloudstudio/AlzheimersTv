# Supabase Star Rating Setup Guide

## Step 1: Run the Database Setup

1. Go to your Supabase dashboard: https://supabase.com/dashboard/project/azdxbbkhbasjpbcqtchw
2. Click on **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the entire contents of `supabase-setup.sql` and paste it into the SQL editor
5. Click **Run** (or press Ctrl+Enter)
6. You should see a success message

## Step 2: Get Your API Keys

1. In your Supabase dashboard, go to **Project Settings** (gear icon in left sidebar)
2. Click on **API** in the settings menu
3. You'll see two important values:

   - **Project URL**: `https://azdxbbkhbasjpbcqtchw.supabase.co`
   - **anon public key**: Copy this long string (starts with `eyJ...`)

## Step 3: Update index.html with Your API Key

1. Open `index.html` in a text editor
2. Find line 1363 that says:
   ```javascript
   const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF6ZHhiYmtoYmFzanBiY3F0Y2h3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI4OTk2MDAsImV4cCI6MjA0ODQ3NTYwMH0.PLACEHOLDER';
   ```
3. Replace `PLACEHOLDER` at the end with your actual anon public key from Supabase
4. Save the file

## Step 4: Test Locally

1. Open `index.html` in your web browser (just double-click it)
2. You should see a new "Your Rating" column with 5 stars for each show
3. Hover over the stars - they should turn gold
4. Click on a star to rate a show
5. You should see "Saving..." then "Saved!" appear
6. Refresh the page - your ratings should persist

## Step 5: Verify Database

1. Go back to Supabase dashboard
2. Click **Table Editor** in the left sidebar
3. Select the `show_ratings` table
4. You should see your test ratings appear here!

## How It Works

### User Identification
- Each browser gets a unique fingerprint stored in `localStorage`
- No login required - ratings are tied to the browser
- One rating per show per browser

### Database Structure
```
show_ratings table:
- id (auto-increment)
- show_id (e.g., "the-godfather")
- rating (1-5)
- user_fingerprint (unique browser ID)
- created_at (timestamp)
```

### Security
- Row Level Security (RLS) enabled
- Anyone can read all ratings
- Anyone can insert/update their own ratings
- One rating per show per user (enforced by database constraint)

## Troubleshooting

### "Error saving" message appears
1. Check browser console (F12) for error messages
2. Verify your API key is correct in `index.html`
3. Verify the SQL setup ran successfully
4. Check that RLS policies were created

### Stars don't appear
1. Make sure the Supabase script is loading (check browser console)
2. Verify the column was added to all rows
3. Clear browser cache and refresh

### Ratings don't persist
1. Check that `localStorage` is enabled in your browser
2. Verify the database insert was successful in Supabase Table Editor
3. Check browser console for errors

## Next Steps (Optional)

### Add Average Ratings Display
You can query the `show_ratings_summary` view to show community average:

```javascript
const { data } = await supabase
  .from('show_ratings_summary')
  .select('*')
  .eq('show_id', 'the-godfather');

// data will have: { show_id, total_votes, average_rating }
```

### Add Rate Limiting
Consider adding rate limiting to prevent spam (already supported in Supabase):

```javascript
// In your Supabase edge function or using a library
// Limit to 10 ratings per hour per IP
```

### Add Analytics
Track which shows are most rated:

```sql
SELECT show_id, COUNT(*) as votes, AVG(rating) as avg_rating
FROM show_ratings
GROUP BY show_id
ORDER BY votes DESC
LIMIT 10;
```
