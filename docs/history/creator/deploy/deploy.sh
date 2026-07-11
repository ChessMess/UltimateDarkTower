#!/usr/bin/env bash
#
# Publish the Creator + Player + landing page to GitHub Pages.
#
# Why local (not CI): this app depends on locally-built sibling repos
# (UltimateDarkTowerBoard, UltimateDarkTowerDisplay) via `file:` deps, so the
# full build only works on a machine that has the whole repo constellation
# checked out. This script builds locally and force-pushes the result to the
# `gh-pages` branch, which GitHub Pages serves.
#
# Usage:  ./deploy/deploy.sh    (run from anywhere inside the repo)
#
set -euo pipefail

# repo root = parent of this script's dir
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "==> Building both apps with GitHub Pages base paths (GH_PAGES=1)"
GH_PAGES=1 pnpm build

echo "==> Assembling site/"
rm -rf site
mkdir -p site
cp deploy/index.html site/index.html
cp -r apps/creator/dist site/creator
cp -r apps/player/dist site/player
touch site/.nojekyll   # tell Pages not to run Jekyll over the output

REMOTE_URL="$(git config --get remote.origin.url)"
SHA="$(git rev-parse --short HEAD)"

echo "==> Force-pushing site/ to gh-pages ($SHA)"
(
  cd site
  git init -q
  git checkout -qb gh-pages
  git add -A
  git -c user.email=deploy@local -c user.name="deploy bot" commit -qm "Deploy $SHA"
  git push -q -f "$REMOTE_URL" gh-pages
  rm -rf .git
)

echo "==> Done. Live at: https://chessmess.github.io/UltimateDarkTowerCreator/"
