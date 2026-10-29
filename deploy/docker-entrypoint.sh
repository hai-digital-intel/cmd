#!/bin/sh
# Container start-up: bring the database schema up to date, seed the starting plan on a brand-new
# database only (the seed script skips itself when data exists), then serve the app.
set -e

mkdir -p /app/data/backups /app/storage/uploads

echo "[hai] applying database migrations..."
./node_modules/.bin/prisma migrate deploy

echo "[hai] seeding starting plan (skipped automatically if the database already has data)..."
./node_modules/.bin/tsx prisma/seed.ts

echo "[hai] starting on :3000"
exec ./node_modules/.bin/next start -H 0.0.0.0 -p 3000
