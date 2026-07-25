#!/usr/bin/env bash
# FUGUSAU — Combined build for a single Vercel deployment.
#
# Builds the public marketing site (public-site/) and the student portal
# (frontend/) separately, then merges their outputs into one directory:
#   combined-dist/           <- public site (root, what people land on)
#   combined-dist/portal/    <- student portal (under /portal/*)
#
# Each app is still built independently (own package.json, own Vite build) —
# nothing is code-merged. This just lays both outputs side by side in one
# static deployment so one Vercel domain can serve both.
#
# Vercel project settings needed for this to run (Project → Settings → General):
#   Root Directory:    (repo root — leave blank / ".")
#   Build Command:      bash combine-build.sh
#   Output Directory:   combined-dist
#   Install Command:    echo "handled inside combine-build.sh"
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT="$ROOT_DIR/combined-dist"

echo "── Building public site ──"
cd "$ROOT_DIR/public-site"
npm install
npm run build

echo "── Building student portal (base=/portal/) ──"
cd "$ROOT_DIR/frontend"
npm install
VITE_BASE_PATH=/portal/ npm run build

echo "── Combining outputs ──"
rm -rf "$OUT"
mkdir -p "$OUT"
cp -r "$ROOT_DIR/public-site/dist/." "$OUT/"
mkdir -p "$OUT/portal"
cp -r "$ROOT_DIR/frontend/dist/." "$OUT/portal/"

echo "── Writing combined robots.txt / sitemap.xml ──"
cat > "$OUT/robots.txt" << 'EOF'
User-agent: *
Allow: /
Disallow: /portal/dashboard
Disallow: /portal/courses
Disallow: /portal/exams
Disallow: /portal/results
Disallow: /portal/fees
Disallow: /portal/hostel
Disallow: /portal/forms
Disallow: /portal/library
Disallow: /portal/chat
Disallow: /portal/notifications
Disallow: /portal/credentials
Disallow: /portal/reports
Disallow: /portal/profile
Disallow: /portal/ward
Disallow: /portal/timetable
Disallow: /portal/attendance
Disallow: /portal/admin/
Allow: /portal/login
Allow: /portal/admission

Sitemap: https://REPLACE-WITH-YOUR-VERCEL-DOMAIN.vercel.app/sitemap.xml
EOF

echo "Build combined. Output: $OUT"
