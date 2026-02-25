# ⚡ Quick Start - Star Rating System

## 🎯 What You Have Now

A fully functional star rating system that lets users rate shows 1-5 stars with no login required!

## ⏱️ 5-Minute Setup

### Step 1️⃣: Setup Database (2 minutes)

1. Open: https://supabase.com/dashboard/project/azdxbbkhbasjpbcqtchw/sql
2. Click: **"+ New Query"**
3. Copy entire contents of: `supabase-setup.sql`
4. Paste into SQL editor
5. Click: **"Run"** (or Ctrl+Enter)
6. ✅ Wait for green success message

### Step 2️⃣: Get API Key (1 minute)

1. Open: https://supabase.com/dashboard/project/azdxbbkhbasjpbcqtchw/settings/api
2. Find: **"anon public"** key under "Project API keys"
3. Click: **"Copy"** (looks like: `eyJhbGciOiJIUzI1NiIs...`)
4. ✅ Keep this copied for next step

### Step 3️⃣: Update HTML (2 minutes)

1. Open: `index.html` in any text editor
2. Press: **Ctrl+F** to search
3. Search for: `PLACEHOLDER`
4. You'll find this around line 1363:
   ```javascript
   const SUPABASE_ANON_KEY = 'eyJ...PLACEHOLDER';
   ```
5. Replace: `PLACEHOLDER` with your key from Step 2
6. Save: **Ctrl+S**
7. ✅ Done!

### Step 4️⃣: Test (30 seconds)

1. Double-click: `index.html` to open in browser
2. Look for: **"Your Rating"** column (should be 6th column)
3. Hover: Over any stars → Should turn gold ✨
4. Click: On any star → Should show "Saving..." then "Saved!"
5. Refresh: Press F5 → Your rating should still be there
6. ✅ Success!

## 🎉 That's It!

Your rating system is now live and ready to use!

## 🔍 Verify It's Working

### Check the Database:
1. Go to: https://supabase.com/dashboard/project/azdxbbkhbasjpbcqtchw/editor
2. Click: **"show_ratings"** table
3. You should see: Your test ratings appear in the table

### Check Browser Console:
1. Press: **F12** to open developer tools
2. Click: **"Console"** tab
3. You should see: No red errors
4. If you see errors: Check that API key was pasted correctly

## ❌ Troubleshooting

| Problem | Solution |
|---------|----------|
| Stars don't appear | Check that Supabase script loaded (F12 → Console) |
| "Error saving" message | Verify API key has no PLACEHOLDER text |
| Ratings don't persist | Check localStorage is enabled in browser |
| SQL won't run | Make sure you copied the entire file contents |
| Still not working | See detailed guide in `SUPABASE_SETUP.md` |

## 📊 What Happens When Users Rate

1. **User clicks star** → JavaScript captures the rating (1-5)
2. **Saves to Supabase** → Creates/updates record in `show_ratings` table
3. **Stores locally** → Remembers rating in browser's localStorage
4. **Shows feedback** → Displays "Saving..." → "Saved!" → "Your rating"
5. **Next visit** → Loads previous ratings from database

## 🔐 Privacy & Security

- ✅ No login required
- ✅ No email addresses collected
- ✅ No personal information stored
- ✅ Only stores: show ID + rating (1-5) + anonymous browser ID
- ✅ One rating per show per browser
- ✅ Row Level Security prevents abuse

## 📈 Next Steps (Optional)

After basic setup works, you can:

1. **Deploy to GitHub Pages** (already configured in your repo)
   ```bash
   git add index.html
   git commit -m "Add star rating system"
   git push
   ```

2. **Add community averages** - Show average rating from all users
3. **Add suggestions form** - Let users suggest new shows
4. **Add SEO metadata** - Help search engines find your site
5. **Add spam protection** - reCAPTCHA v3 integration

## 📚 More Info

- **Quick Reference**: `SETUP_INSTRUCTIONS.txt`
- **Detailed Guide**: `SUPABASE_SETUP.md`
- **Technical Summary**: `RATING_SYSTEM_SUMMARY.md`

## 🆘 Need Help?

1. Check browser console (F12) for error messages
2. Review `SUPABASE_SETUP.md` for detailed troubleshooting
3. Verify all 3 setup steps were completed
4. Try in incognito mode (rules out cache issues)

---

**Ready?** Start with Step 1️⃣ above! 🚀
