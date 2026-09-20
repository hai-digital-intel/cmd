# SETUP.md

Detailed setup reference. For the fast path, see the [Windows Quick Start](README.md#windows-quick-start)
section of the README — this document covers what that script actually does and how to
recover when a step fails partway through.

## Requirements

- **Git** — https://git-scm.com/downloads
- **Node.js** LTS or newer — https://nodejs.org (built and tested against v24; anything ≥ v20
  should work since nothing here depends on Node-24-specific APIs)
- **npm** (ships with Node.js)

No database server, no Docker, no cloud account, no API key is required for the base app.

## What `npm run setup` does, step by step

`scripts/setup.mjs` runs five steps, in order, and every one of them is safe to re-run:

1. **Creates runtime directories** if missing: `data/`, `data/backups/`, `storage/uploads/`.
   Existing directories (and their contents) are left untouched.
2. **Copies `.env.example` to `.env`** if `.env` doesn't already exist. If you already have a
   `.env`, it's never overwritten — edit `DATABASE_URL` there directly if you need to point at
   a different SQLite file path.
3. **`prisma generate`** — regenerates the Prisma Client into `./generated/prisma` (gitignored;
   this has to happen after every `npm install` too, which is why it's also wired into
   `postinstall`).
4. **`prisma migrate deploy`** — applies any migrations in `prisma/migrations/` that haven't
   been applied yet. Unlike `prisma migrate dev`, this never prompts for a migration name and
   never resets data — it only ever adds, never destroys.
5. **`tsx prisma/seed.ts`** — seeds the seed script's starting data, but only if the `Company`
   table is empty. If you already have data, you'll see `Database already has data — skipping
   seed (safe re-run).` and nothing changes.

If any step fails, the script exits with that step's error printed and a non-zero exit code —
fix the underlying issue (see Troubleshooting in the README) and re-run `npm run setup`; it
will pick up from wherever it left off since every step is idempotent.

## Environment variables

| Variable | Default (`.env.example`) | Purpose |
|---|---|---|
| `DATABASE_URL` | `file:./data/hai-setup.db` | SQLite file path, resolved relative to the project root (where `prisma.config.ts` lives). |
| `OLLAMA_BASE_URL` | *(unset)* | Optional. If set, the Setup Copilot's `AIProvider` seam (`lib/ai/provider.ts`) uses a local Ollama server instead of the deterministic-only default. Not required for any feature to work. |
| `OLLAMA_MODEL` | `llama3.1` | Optional. Model name to request from Ollama, only read when `OLLAMA_BASE_URL` is set. |

There is no `NEXTAUTH_*`, no API key, and no secret to generate — see the Security notes in
the README for why.

## Manual setup (if you'd rather not use the script)

```bash
npm install
cp .env.example .env        # PowerShell: Copy-Item .env.example .env
npx prisma generate
npx prisma migrate deploy
npx tsx prisma/seed.ts
npm run dev
```

## Production deployment on the same machine

```bash
npm run build
npm start
```

`npm start` reads the same `.env` and `./data/hai-setup.db` as `npm run dev` — there's no
separate production database by default. If you want an isolated production dataset, point
`DATABASE_URL` at a different file before running `npm run setup` in that environment.

## Verifying an install worked

```bash
npm run typecheck   # should exit 0 with no output
npm run lint         # should exit 0 with no output
npm test              # should report all test files passed
npm run build          # should list every route as "ƒ (Dynamic)"
```

If `npm run build`'s route table shows any route as `○ (Static)` instead of `ƒ (Dynamic)`,
something removed that page's `export const dynamic = "force-dynamic"` — see
[ARCHITECTURE.md](ARCHITECTURE.md#rendering-mode-every-page-is-force-dynamic) for why that
matters here.
