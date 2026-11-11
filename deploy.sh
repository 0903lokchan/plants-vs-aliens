#!/usr/bin/env bash
# Build and publish dist/ to the gh-pages branch (GitHub Pages serves it).
set -e
npm run build
cd dist && touch .nojekyll && rm -rf .git && git init -q -b gh-pages && git add -A && git commit -qm "Deploy build" && \
  git push -f "$(cd .. && git remote get-url origin)" gh-pages && rm -rf .git
