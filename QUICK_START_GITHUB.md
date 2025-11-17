# Quick Start: Deploy to GitHub Pages (5 minutes)

This is the fastest way to get your site live for FREE with automatic weekly updates.

## Prerequisites

- A GitHub account (free at https://github.com/signup)
- Git installed on your computer

## Step 1: Create GitHub Repository (2 minutes)

```bash
cd /mnt/c/Users/barlo/AlzheimersTv

# Initialize git if needed
git init

# Add all files
git add .
git commit -m "Initial commit: AlzheimersTv website"
```

Now go to https://github.com/new and:
1. Name: `alzheimers-tv` (or any name you like)
2. Description: "Streaming movies and TV shows for older viewers"
3. Public or Private (your choice)
4. Don't initialize with README (we already have files)
5. Click "Create repository"

Then push your code:
```bash
# Replace YOUR_USERNAME with your GitHub username
git remote add origin https://github.com/YOUR_USERNAME/alzheimers-tv.git
git branch -M main
git push -u origin main
```

## Step 2: Add Your API Key as Secret (1 minute)

1. Go to your repository on GitHub
2. Click **Settings** (top menu)
3. Scroll down to **Secrets and variables** → **Actions**
4. Click **New repository secret**
5. Name: `RAPID_API_KEY`
6. Value: Paste your RapidAPI key (from config.json)
7. Click **Add secret**

## Step 3: Enable GitHub Pages (1 minute)

1. Still in Settings, scroll to **Pages** (in the sidebar)
2. Under "Build and deployment":
   - Source: **Deploy from a branch**
   - Branch: **main** / **/(root)**
3. Click **Save**

## Step 4: Test It! (1 minute)

1. Go to the **Actions** tab in your repository
2. You should see "Update Streaming Data Weekly" workflow
3. Click it, then click **Run workflow** → **Run workflow**
4. Wait 2-3 minutes for it to complete (you'll see a green checkmark)

## Your Site is Live! 🎉

Your website URL: `https://YOUR_USERNAME.github.io/alzheimers-tv/`

## What Happens Now?

- ✅ Your site updates automatically **every Sunday at 2 AM UTC**
- ✅ GitHub Actions runs `npm run dev` to fetch new data
- ✅ Changes are committed and deployed automatically
- ✅ You can manually trigger updates anytime from the Actions tab

## (Optional) Add a Custom Domain

If you want `www.yourdomain.com` instead of the GitHub URL:

1. Buy a domain (Namecheap, Google Domains, etc. - ~$12/year)
2. In your domain's DNS settings, add a CNAME record:
   - Type: `CNAME`
   - Name: `www`
   - Value: `YOUR_USERNAME.github.io`
3. Back in GitHub Pages settings:
   - Custom domain: `www.yourdomain.com`
   - Check "Enforce HTTPS"

## Manual Update Anytime

To update the site before the weekly schedule:

**Option 1: Via GitHub (no code needed)**
1. Go to Actions tab
2. Click "Update Streaming Data Weekly"
3. Click "Run workflow"

**Option 2: Via Command Line**
```bash
cd /mnt/c/Users/barlo/AlzheimersTv
npm run dev
git add index.html details/ movies.csv tvshows.csv
git commit -m "Manual update: streaming data"
git push
```

Site updates in ~1 minute after push!

## Troubleshooting

### "Workflow doesn't run"
- Check that you added the `RAPID_API_KEY` secret
- Check Actions tab for error messages

### "Site shows old data"
- Clear your browser cache (Ctrl+Shift+R)
- Wait 1-2 minutes for GitHub Pages to rebuild

### "API rate limit error in Actions"
- Normal! The workflow will use cached data
- Wait 24 hours and run again

### "404 Not Found"
- Make sure `index.html` is in the root directory
- Check GitHub Pages settings are correct

## View Logs

Go to Actions tab → Click on a workflow run → Click on the job to see detailed logs

## Disable Auto-Updates

Edit `.github/workflows/update-weekly.yml` and comment out the schedule section:

```yaml
# schedule:
#   - cron: '0 2 * * 0'
```

Then commit and push.

## Cost Breakdown

- GitHub hosting: **$0/month**
- GitHub Actions: **2,000 minutes/month free** (each run ~2-3 minutes)
- Bandwidth: **1GB/month free** (more than enough for this site)
- Storage: **500MB free** (your site is ~5MB)

**Total: $0/month** ✅

You can host this site forever for free!

## Need More Help?

- GitHub Pages Docs: https://docs.github.com/pages
- GitHub Actions Docs: https://docs.github.com/actions
- Open an issue in your repository for help
