#!/usr/bin/env bash
# =================================================================
# CatalystOS - Production Database Migration & Initialization Script
# =================================================================
set -e

echo "================================================================="
echo "  📦 CatalystOS — Database Migration Runner"
echo "================================================================="

# Load .env if present
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs -0 2>/dev/null || true)
fi

if [ -z "$DATABASE_URL" ]; then
  echo "❌ Error: DATABASE_URL is not set in environment or .env file."
  exit 1
fi

echo "📌 [1/3] Generating Prisma Client..."
npx prisma generate

echo "📌 [2/3] Applying schema migrations to database..."
npx prisma db push --accept-data-loss

echo "📌 [3/3] Database schema is up to date!"
echo "💡 Optional: Run 'npx tsx prisma/seed.ts' if you want to seed default company/user data."
echo "✅ Complete."
