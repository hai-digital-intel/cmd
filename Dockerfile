# syntax=docker/dockerfile:1
#
# Single-stage on purpose: the container must be able to run `prisma migrate deploy` and the
# idempotent seed at start-up, and both need devDependencies (prisma CLI, tsx). Pruning them would
# save image size but break first-boot setup. The full (non-slim) Node image carries the compiler
# toolchain better-sqlite3 falls back to if no prebuilt binary matches.
FROM node:24-bookworm

WORKDIR /app

# prisma.config.ts reads DATABASE_URL via env(), and the `postinstall` hook (prisma generate)
# runs during `npm ci`, so it has to exist at build time. Same relative path the app uses locally.
ENV DATABASE_URL="file:./data/hai-setup.db" \
    NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci
# Fail the build now, with a clear message, rather than crash-looping at runtime: npm 12+ skips
# dependency install scripts unless approved, which would leave better-sqlite3 without its
# native binary. The Node 24 image's bundled npm runs them, so this should always pass.
RUN test -f node_modules/better-sqlite3/build/Release/better_sqlite3.node \
 || (echo "ERROR: better-sqlite3 native binary missing - npm skipped its install script" >&2; exit 1)

COPY . .
RUN npm run build

# The entrypoint may arrive with CRLF if built from a Windows checkout; strip it defensively.
RUN sed -i 's/\r$//' deploy/docker-entrypoint.sh \
 && chmod +x deploy/docker-entrypoint.sh \
 && mkdir -p data/backups storage/uploads \
 && chown -R node:node /app/.next /app/data /app/storage

ENV NODE_ENV=production
USER node
EXPOSE 3000

# data/ (SQLite + backups) and storage/ (uploaded documents) are meant to be mounted volumes.
VOLUME ["/app/data", "/app/storage"]
ENTRYPOINT ["./deploy/docker-entrypoint.sh"]
