#!/bin/bash

# Deploy AlzheimersTv to GitHub Pages
# This script helps you set up the repository and deploy

echo "=================================="
echo "AlzheimersTv GitHub Pages Setup"
echo "=================================="
echo ""

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo "❌ Git is not installed. Please install Git first:"
    echo "   https://git-scm.com/downloads"
    exit 1
fi

# Check if already a git repo
if [ ! -d .git ]; then
    echo "📦 Initializing Git repository..."
    git init
    echo "✓ Git initialized"
else
    echo "✓ Git repository already exists"
fi

# Prompt for GitHub username
echo ""
echo "Please enter your GitHub username:"
read -r GITHUB_USERNAME

if [ -z "$GITHUB_USERNAME" ]; then
    echo "❌ GitHub username cannot be empty"
    exit 1
fi

# Prompt for repository name
echo ""
echo "Enter repository name (default: alzheimers-tv):"
read -r REPO_NAME
REPO_NAME=${REPO_NAME:-alzheimers-tv}

echo ""
echo "📋 Repository will be created at:"
echo "   https://github.com/$GITHUB_USERNAME/$REPO_NAME"
echo ""
echo "Your website will be available at:"
echo "   https://$GITHUB_USERNAME.github.io/$REPO_NAME/"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 1
fi

# Add all files
echo ""
echo "📁 Adding files to git..."
git add .

# Check if there are changes to commit
if git diff --cached --quiet; then
    echo "⚠️  No changes to commit. Files may already be committed."
else
    echo "💾 Creating initial commit..."
    git commit -m "Initial commit: AlzheimersTv website

- Static HTML generator for streaming availability
- Automatic weekly updates via GitHub Actions
- Optimized for older viewers
"
    echo "✓ Files committed"
fi

# Set main branch
echo ""
echo "🌿 Setting main branch..."
git branch -M main

# Add remote
echo ""
echo "🔗 Adding GitHub remote..."
REMOTE_URL="https://github.com/$GITHUB_USERNAME/$REPO_NAME.git"

if git remote get-url origin &> /dev/null; then
    echo "Remote 'origin' already exists. Updating URL..."
    git remote set-url origin "$REMOTE_URL"
else
    git remote add origin "$REMOTE_URL"
fi

echo "✓ Remote added: $REMOTE_URL"

echo ""
echo "=================================="
echo "Next Steps:"
echo "=================================="
echo ""
echo "1. Create the repository on GitHub:"
echo "   → Go to: https://github.com/new"
echo "   → Name: $REPO_NAME"
echo "   → Public or Private (your choice)"
echo "   → DON'T initialize with README"
echo "   → Click 'Create repository'"
echo ""
echo "2. Then run this command to push:"
echo "   git push -u origin main"
echo ""
echo "3. Set up GitHub Pages:"
echo "   → Go to: https://github.com/$GITHUB_USERNAME/$REPO_NAME/settings/pages"
echo "   → Source: Deploy from branch 'main' / '/(root)'"
echo "   → Click Save"
echo ""
echo "4. Add your API key as a secret:"
echo "   → Go to: https://github.com/$GITHUB_USERNAME/$REPO_NAME/settings/secrets/actions"
echo "   → New repository secret"
echo "   → Name: RAPID_API_KEY"
echo "   → Value: [Your RapidAPI key from config.json]"
echo ""
echo "5. Your site will be live at:"
echo "   https://$GITHUB_USERNAME.github.io/$REPO_NAME/"
echo ""
echo "=================================="
echo ""

# Offer to open GitHub
read -p "Open GitHub in browser now? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if command -v xdg-open &> /dev/null; then
        xdg-open "https://github.com/new"
    elif command -v open &> /dev/null; then
        open "https://github.com/new"
    elif command -v start &> /dev/null; then
        start "https://github.com/new"
    else
        echo "Please open this URL in your browser:"
        echo "https://github.com/new"
    fi
fi

echo ""
echo "✅ Setup complete!"
echo "📖 See QUICK_START_GITHUB.md for detailed instructions"
