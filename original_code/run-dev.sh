#!/bin/bash

# Ensure we're using the correct Node version via NVM
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Use Node 20
nvm use 20 > /dev/null 2>&1

# Run the build and execute
npm run build && node dist/index.js
