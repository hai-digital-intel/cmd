# h.ai Setup Command Center

A private, local-first web app for tracking h.ai's initial company setup — from *"company
partially established"* to *"company operationally ready."* It is a dependency-aware
completion engine, not a checklist: it tells you what to do next, what's blocking you, and
why, instead of showing you everything that exists.

Once every launch gate is Ready, the project archives itself. It is deliberately **not** a
CRM, invoicing tool, or general project manager — see [PLAN.md](PLAN.md) for the product
boundaries this was built against.

## Why this exists

Setting up a company involves dozens of small, interdependent tasks scattered across legal,
banking, brand, tax, and commercial readiness — most of them invisible until something else
is already blocked on them. This app turns that into a single, calm view: **Your Next 3**,
a live readiness percentage, and a dependency graph that automatically unlocks downstream
work the moment a prerequisite finishes (it never marks anything done for you).

## Features

- **Today** — weighted readiness (`h.ai is 63% setup-ready`), a critical-path projection date,
  and "Your Next 3" — never more than three recommended actions at a time.
- **Setup** — every category → milestone → task, collapsed by default; an Inbox tab for
  quick-captured notes waiting to be triaged into real tasks.
- **Focus Mode** — one task on screen, with why it matters, its smallest next step, a
  checklist, an optional timer, and Done / Blocked / Waiting / Break it down / Add note.
- **Roadmap** — phase-by-phase progression plus an interactive dependency map (React Flow).
- **Blockers** — what's actually stopping progress, a "Waiting on others" parking lot so
  externally-blocked work doesn't clutter Your Next 3, and a "Chase Now" drafted follow-up.
- **Documents** — a local document vault with expiry/renewal tracking; files never leave
  the machine.
- **Costs** — one-time vs. recurring setup spend, never bookkeeping.
- **Readiness** — the weighted math behind the headline number, per category and per launch
  gate.
- **Activity** — a human-readable audit trail of everything that changed.
- **Setup Copilot** — deterministic Q&A over your actual data ("What's blocking launch?",
  "What requires Mohammad?"). Works with zero configuration; an optional local Ollama
  connection can be added later (see [Future migration options](#future-migration-options)).
- **Command palette** (`Ctrl+K`) and **Quick Capture** (`C`) for low-friction input.
- **Backup & restore** — JSON export/import with schema-version checking, plus a full
  ZIP backup (database + uploaded files) from the command line.

## Architecture

Next.js 16 (App Router) + TypeScript, Tailwind CSS v4, Prisma 7 + SQLite, and a
`lib/services/*` layer of pure, dependency-free scoring functions (readiness, prioritization,
dependency resolution, launch gates, timeline projection) that Vitest exercises directly with
plain object literals — no database required to test the business logic. See
[ARCHITECTURE.md](ARCHITECTURE.md) for the full breakdown and [DATA_MODEL.md](DATA_MODEL.md)
for the schema.

No external services. No cloud database. No required API keys. Everything works completely
offline once `npm install` has finished.

## Windows Quick Start

**Required first:**
- [Git](https://git-scm.com/downloads)
- [Node.js LTS](https://nodejs.org) (v20 or newer — this was built and tested on v24)
- npm (comes with Node.js)

Open **PowerShell** in the folder where you want the project, then:

```bash
git clone <repository-url>
cd hai-setup-command-center
npm install
npm run setup
npm run dev
```

Then open **http://localhost:3000**.

`npm run setup` creates the local SQLite database and seeds it with h.ai's starting setup
plan. It's safe to run more than once — it never overwrites existing data.

## Available commands

| Command | What it does |
|---|---|
| `npm run setup` | Creates runtime folders, applies DB migrations, seeds initial data if empty. Safe to re-run. |
| `npm run dev` | Starts the app at http://localhost:3000 with hot reload. |
| `npm run build` | Production build. |
| `npm start` | Runs the production build (`npm run build` first). |
| `npm run lint` | ESLint. |
| `npm run typecheck` | TypeScript, no emit. |
| `npm test` | Runs the Vitest suite once. |
| `npm run test:watch` | Vitest in watch mode. |
| `npm run db:migrate` | Creates a new migration from schema changes (interactive, dev only). |
| `npm run db:migrate:deploy` | Applies existing migrations without prompting (what `setup` uses). |
| `npm run db:seed` | Re-runs the seed script (no-ops if data already exists). |
| `npm run db:studio` | Opens Prisma Studio to browse the database visually. |
| `npm run backup` | Writes a full ZIP backup (database + `storage/uploads`) to `data/backups/`. |
| `npm run restore -- path/to/backup.json` | Restores a JSON export from Settings → Export. Always backs up current data first. |
| `npm run reset:demo` | **Destructive.** Wipes local data and reseeds the demo plan. Requires typing `yes`, or pass `--yes`. |

## Data storage

- **Database**: `./data/hai-setup.db` (SQLite). Never committed to git.
- **Uploaded files**: `./storage/uploads/` — original filenames are kept only as metadata;
  files themselves are stored under generated names to prevent path-traversal issues. Never
  committed to git.
- **Backups**: `./data/backups/` — both your manual exports and the automatic safety backup
  written before every restore.

### Moving the installation to another PC

1. Copy the whole project folder (or re-clone the repo and copy `data/` and `storage/` from
   the old machine).
2. On the new machine: `npm install`, then `npm run setup` (it will see the existing database
   and skip seeding).
3. `npm run dev` (or `npm run build && npm start`).

Alternatively, use `npm run backup` on the old machine, copy the resulting ZIP, unzip it, and
place `hai-setup.db` into `./data/` and the `uploads/` folder into `./storage/` on the new
machine after a fresh `npm run setup`.

## Backups and restore, in more detail

- **Settings → Export JSON backup** downloads a complete, portable snapshot of every table
  (schema-versioned). **Settings → Restore from backup** uploads one back — it always writes
  an automatic safety copy of whatever is currently in the database to `data/backups/` first,
  and asks for explicit confirmation before replacing anything.
- `npm run backup` is the command-line equivalent of a *full* backup: it zips the raw SQLite
  file together with every uploaded document into `data/backups/hai-full-backup-<date>.zip`.
  To restore a ZIP, stop the app, unzip it, and copy `hai-setup.db` back into `./data/` and
  `uploads/` back into `./storage/`.
- `npm run restore -- path/to/backup.json` is the command-line equivalent of the in-app JSON
  restore, for when you'd rather not start the dev server first.

## Testing

```bash
npm test
```

Business logic (readiness scoring, launch-gate evaluation, dependency unlocking,
prioritization, cost aggregation, timeline projection, the dependency-map layout algorithm)
is tested as pure functions in `tests/services/*`, independent of Prisma or a running
database. One component test (`tests/components/status-badge.test.tsx`) exercises rendered
output. Every page and interactive flow described in the acceptance scenario was additionally
verified by hand in a real browser against the seeded dataset — see
[ARCHITECTURE.md](ARCHITECTURE.md#testing-strategy) for why a browser-driven Playwright suite
wasn't added on top of that for this iteration.

## Troubleshooting

- **`prisma generate` or `migrate` fails on Windows** — make sure no other process (an editor,
  Prisma Studio, a previous `npm run dev`) is holding the SQLite file open, then retry.
- **Port 3000 already in use** — stop whatever else is running there, or run
  `npx next dev -p 3001` directly.
- **Restore says "schema version isn't compatible"** — the backup was made by a newer/older
  version of this app than the one running the restore; upgrade/downgrade first.
- **A blank/broken page after pulling new code** — run `npm install` again (dependencies or
  the Prisma schema may have changed) and `npm run setup`.

## Security notes

This is single-user, local-only software with no authentication layer by design — its
security depends on your Windows account and device security, the same as any other desktop
app that reads local files. Do not expose the dev/production server to your network or the
internet without adding your own authentication in front of it first.

## Future migration options

- **PostgreSQL/Supabase**: the schema was kept portable — change `provider` in
  `prisma/schema.prisma` and `prisma.config.ts`'s `datasource.url`, swap the driver adapter in
  `lib/db/client.ts` (e.g. `@prisma/adapter-pg`), and re-run migrations.
- **Local AI (Ollama)**: set `OLLAMA_BASE_URL` (and optionally `OLLAMA_MODEL`) in `.env` —
  `lib/ai/provider.ts` already has the seam wired up. Nothing else changes; the app is fully
  functional without it.

## Known limitations

- Single-user by design; no accounts, roles, or permissions.
- The projected-ready-date estimate is a simple critical-path-effort model, not a scheduling
  engine — treat it as a rough signal, not a promise (the UI says so too).
- Currency conversion isn't implemented; mixed-currency cost entries are flagged, not summed
  precisely.
- `npm audit` reports vulnerabilities in `mysql2`/`deepmerge-ts`, both transitive dependencies
  of the Prisma CLI's multi-database tooling — this app only ever talks to SQLite and never
  exercises that code path. Downgrading Prisma to "fix" it would undo the Prisma 7 driver-
  adapter setup this project deliberately uses; left as-is and documented here instead.
