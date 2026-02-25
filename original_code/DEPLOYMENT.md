# Deployment Guide

This document covers multiple hosting options for your AlzheimersTv website, from easiest/cheapest to more advanced.

---

## Option 1: GitHub Pages (FREE ⭐ Recommended)

**Cost:** $0/month
**Difficulty:** Easy
**Auto-updates:** Yes with GitHub Actions
**Custom domain:** Yes (free)

### Advantages:
- Completely free
- Automatic HTTPS
- Built-in CDN (fast worldwide)
- Version control included
- Automated weekly updates via GitHub Actions

### Setup Steps:

#### 1. Create GitHub Repository

```bash
cd /mnt/c/Users/barlo/AlzheimersTv

# Initialize git if not already done
git init
git add .
git commit -m "Initial commit"

# Create repo on GitHub (https://github.com/new), then:
git remote add origin https://github.com/YOUR_USERNAME/alzheimers-tv.git
git branch -M main
git push -u origin main
```

#### 2. Add API Key as Secret

1. Go to your repository on GitHub
2. Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Name: `RAPID_API_KEY`
5. Value: Your RapidAPI key
6. Click "Add secret"

#### 3. Enable GitHub Pages

1. Repository Settings → Pages
2. Source: "Deploy from a branch"
3. Branch: `main` / `/(root)`
4. Save

Your site will be live at: `https://YOUR_USERNAME.github.io/alzheimers-tv/`

#### 4. Test Manual Update

Go to Actions tab → "Update Streaming Data Weekly" → "Run workflow"

#### 5. (Optional) Add Custom Domain

1. Buy a domain (e.g., from Namecheap, $10-15/year)
2. In your DNS settings, add:
   - Type: `CNAME`
   - Name: `www`
   - Value: `YOUR_USERNAME.github.io`
3. In GitHub Pages settings, add your custom domain

**Weekly Updates:** Automatic every Sunday at 2 AM UTC via GitHub Actions

---

## Option 2: Netlify (FREE with generous limits)

**Cost:** $0/month (free tier: 100GB bandwidth)
**Difficulty:** Very Easy
**Auto-updates:** Yes
**Custom domain:** Yes (free)

### Advantages:
- Easier than GitHub Pages
- Better build system
- Form handling (if you add contact forms)
- Deploy previews

### Setup Steps:

#### 1. Install Netlify CLI

```bash
npm install -g netlify-cli
netlify login
```

#### 2. Create netlify.toml Configuration

Create this file in your project root:

```toml
[build]
  command = "npm run build && npm run dev"
  publish = "."

[build.environment]
  NODE_VERSION = "20"

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
```

#### 3. Deploy

```bash
cd /mnt/c/Users/barlo/AlzheimersTv
netlify init
# Follow prompts to create new site
```

#### 4. Set Environment Variable

```bash
netlify env:set RAPID_API_KEY "your-api-key-here"
```

#### 5. Enable Build Hooks for Weekly Updates

1. Go to Site settings → Build & deploy → Build hooks
2. Create a new build hook named "Weekly Update"
3. Copy the webhook URL

#### 6. Set up Automated Weekly Builds

Use a free service like [cron-job.org](https://cron-job.org):
1. Sign up for free
2. Create a new cron job
3. URL: Your Netlify build hook URL
4. Schedule: Every Sunday, 2:00 AM
5. Method: POST

**Your site will be:** `https://YOUR_SITE_NAME.netlify.app`

---

## Option 3: AWS S3 + CloudFront (Very cheap, ~$1-2/month)

**Cost:** ~$0.50-2/month
**Difficulty:** Medium
**Auto-updates:** Requires Lambda or GitHub Actions
**Custom domain:** Yes (requires Route 53 ~$0.50/month)

### Advantages:
- Extremely reliable
- Global CDN
- Scales to millions of visitors
- More control

### Setup Steps:

#### 1. Create S3 Bucket

```bash
aws s3 mb s3://alzheimers-tv-website
aws s3 website s3://alzheimers-tv-website --index-document index.html
```

#### 2. Set Bucket Policy for Public Access

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "PublicReadGetObject",
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::alzheimers-tv-website/*"
  }]
}
```

#### 3. Upload Files

```bash
cd /mnt/c/Users/barlo/AlzheimersTv
npm run dev
aws s3 sync . s3://alzheimers-tv-website \
  --exclude "node_modules/*" \
  --exclude "src/*" \
  --exclude ".git/*" \
  --exclude "*.ts" \
  --exclude "*.json"
```

#### 4. Create CloudFront Distribution (for HTTPS and CDN)

```bash
# Via AWS Console:
# CloudFront → Create Distribution
# Origin domain: Select your S3 bucket
# Enable: Redirect HTTP to HTTPS
# Default root object: index.html
```

#### 5. Automate Weekly Updates with Lambda

Create a Lambda function that:
1. Spins up a temporary EC2 instance or uses Lambda with Node.js
2. Runs `npm run dev`
3. Syncs to S3
4. Set CloudWatch Events rule to trigger weekly

**Simpler approach:** Use GitHub Actions to deploy to S3:

```yaml
# .github/workflows/deploy-to-s3.yml
name: Deploy to S3

on:
  schedule:
    - cron: '0 2 * * 0'
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run dev
        env:
          RAPID_API_KEY: ${{ secrets.RAPID_API_KEY }}
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      - run: |
          aws s3 sync . s3://alzheimers-tv-website \
            --delete \
            --exclude "node_modules/*" \
            --exclude "src/*" \
            --exclude ".git/*"
```

---

## Option 4: Vercel (FREE with limits)

**Cost:** $0/month (100GB bandwidth)
**Difficulty:** Very Easy
**Auto-updates:** Yes
**Custom domain:** Yes (free)

### Setup Steps:

```bash
npm i -g vercel
cd /mnt/c/Users/barlo/AlzheimersTv
vercel
```

Follow prompts, then:
```bash
vercel env add RAPID_API_KEY
```

Same weekly automation as Netlify (build hooks + cron-job.org).

---

## Option 5: Traditional Web Hosting (Shared hosting)

**Cost:** $3-10/month
**Difficulty:** Easy
**Providers:** Bluehost, HostGator, SiteGround

### Setup:
1. Sign up for hosting
2. Upload files via FTP
3. Set up a cron job (via cPanel) to run weekly update script

---

## Recommended Solution

**For most users:** GitHub Pages with GitHub Actions (Option 1)

**Why:**
- ✅ Completely free
- ✅ Automatic weekly updates
- ✅ Version control built-in
- ✅ No server management
- ✅ Automatic HTTPS
- ✅ Global CDN

**Next best:** Netlify (Option 2) - even easier than GitHub Pages

---

## Weekly Update Script (for any hosting)

If using manual hosting (not GitHub Actions), create this script:

**update.sh:**
```bash
#!/bin/bash
cd /path/to/AlzheimersTv
git pull
npm run dev
# Upload to your hosting (FTP, rsync, etc.)
```

Then add to crontab:
```bash
crontab -e
# Add: 0 2 * * 0 /path/to/update.sh
```

---

## Custom Domain Setup (Any Option)

1. **Buy domain** from Namecheap, Google Domains, etc. (~$10-15/year)
2. **Update DNS:**
   - For GitHub Pages: CNAME to `username.github.io`
   - For Netlify/Vercel: Follow their DNS instructions
   - For AWS: Use Route 53 or CNAME to CloudFront
3. **Enable HTTPS** (usually automatic)

---

## Monitoring and Maintenance

### GitHub Actions Email Notifications

Add to your workflow:
```yaml
- name: Send notification on failure
  if: failure()
  uses: dawidd6/action-send-mail@v3
  with:
    server_address: smtp.gmail.com
    server_port: 465
    username: ${{ secrets.MAIL_USERNAME }}
    password: ${{ secrets.MAIL_PASSWORD }}
    subject: AlzheimersTv Update Failed
    to: your@email.com
    from: GitHub Actions
    body: Weekly update failed. Check Actions tab.
```

### Check Site Status

Use [UptimeRobot](https://uptimerobot.com) (free) to:
- Monitor site uptime
- Get email alerts if site goes down
- Track response times

---

## Cost Comparison

| Option | Monthly Cost | Setup Time | Auto-Updates |
|--------|--------------|------------|--------------|
| GitHub Pages | $0 | 30 min | Yes |
| Netlify | $0 | 20 min | Yes |
| Vercel | $0 | 15 min | Yes |
| AWS S3+CloudFront | $1-2 | 60 min | Yes (with Actions) |
| Shared Hosting | $3-10 | 45 min | Manual/Cron |

---

## Need Help?

- GitHub Pages: https://docs.github.com/pages
- Netlify: https://docs.netlify.com
- AWS S3: https://docs.aws.amazon.com/s3/
- Vercel: https://vercel.com/docs
