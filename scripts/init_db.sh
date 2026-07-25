#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# FUGUSAU Portal — Database initialisation script
# Run once from the `backend/` directory after `pip install -r requirements.txt`
# and setting up your .env file.
#
# Usage:
#   cd backend
#   chmod +x ../scripts/init_db.sh
#   ../scripts/init_db.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

MANAGE="python manage.py"

echo "  Generating migrations for all apps…"

APPS=(
  users
  students
  courses
  exams
  fees
  library
  chat
  notifications
  hostel
  admissions
  credentials
  reports
  security
)

for APP in "${APPS[@]}"; do
  echo "   makemigrations: $APP"
  $MANAGE makemigrations "$APP" --no-input
done

# Catch any leftover auto-detected changes across all apps
$MANAGE makemigrations --no-input

echo ""
echo "  Applying migrations…"
$MANAGE migrate --no-input

echo ""
echo "  Collecting static files…"
$MANAGE collectstatic --no-input --clear

echo ""
echo "  Database initialised.  Create a superuser with:"
echo "    python manage.py createsuperuser"
