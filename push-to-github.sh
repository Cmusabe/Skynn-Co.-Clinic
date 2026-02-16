#!/bin/sh
# Run after creating https://github.com/mcmusabe/Skynn-Co (empty repo)
set -e
cd "$(dirname "$0")"
git push -u origin main
echo "Done. Deploy on Railway: New Project → Deploy from GitHub → mcmusabe/Skynn-Co"
