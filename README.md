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
- **Documents** — a document register and governance system, not just a file vault: what must
  exist, who must review/sign it, and what it's holding up. See
  [Document governance](#document-governance) below. Files never leave the machine.
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

## Document governance

`/documents` is one nav item with six tabs:

| Tab | Answers |
| --- | --- |
| **Register** | What documents should exist? Grouped into 20 folders; search + category/priority filters. |
| **Launch Pack** | What must exist before h.ai can legally, commercially and securely take a client? A *curated* list, not simply "every P0". |
| **Professional Review** | What needs a lawyer/accountant/etc., grouped by reviewer: ready to send, awaiting reviewer, changes required. |
| **Signatures** | Who still has to sign what. A workflow tracker (who signed, when), **not** a digital-signature system. |
| **Renewals** | Expiry, review-due and renewal-reminder dates, kept as separate things, soonest first. |
| **Vault** | Which documents have a file or link attached. |

Click any document for its detail page: why it matters, current state, the next action for
where it sits in its lifecycle, signatories, version history (every version's file is kept;
adding a version never overwrites the previous one) and its activity trail.

**The review workflow**: Start drafting, Mark draft complete, *Mark sent for review* (this
creates a linked "Waiting on the lawyer" blocker, at most one per document, which also keeps it
out of "Your Next 3"), *Review approved* (resolves the blocker; the document becomes Ready for
Signature, or Active if it needs no signature), each signatory marked signed, then *Activate*.
Nothing becomes Active or Signed by itself, and nothing in this app approves a document on a
professional's behalf.

**How documents affect readiness**: only **Active** or **Signed** counts as done. A finished
draft, or an approved-but-unsigned agreement, is progress but not completion. Not-applicable
and trigger-dependent documents (e.g. an employee handbook before the first hire, or SaaS terms
before a SaaS product exists) never reduce readiness until their trigger applies, and
"needs confirmation/verification" never counts as done. Documents marked *required for launch*
and attached to a **launch gate** hold that gate back from READY. Weighting follows priority
(P0 much more than P2), so it is never a raw document count. The Documents header shows
launch-document health (Ready / At risk / Blocked) with Launch Pack X/Y.

**Adding requirements**: use *Add document* (pick the folder, priority, requirement level,
whether it needs professional review/signature, and, if it's required for launch, which launch
gate it blocks). To change the seeded starting register, edit the `DOCS` array in
`prisma/seedDocuments.ts` (one line per document) and re-seed a fresh database
(`npm run reset:demo`, which **deletes all local data** and asks you to confirm first; take a
backup from Settings beforehand).

**The seeded register is a curated sample (185 documents), not the full long-list.** It has the
whole Launch Pack plus individually-chosen items from every other folder. Almost everything
starts as Not Started / Draft Required / Needs Confirmation; only the trade licence and service
catalogue start Active, because the existing setup plan already records those as done. The
status of every other document, including whether a given tax registration applies, is for you
and your advisers to confirm; this app doesn't assume it.

**Exports**: the *Export* menu downloads the register, Launch Pack status, review queue,
signature queue or renewal schedule as CSV or JSON (spreadsheet-formula-safe).

**Uploads**: up to 25 MB; program/script file types (.exe, .bat, .ps1, .js, ...) are refused.
Files are stored under server-generated names and always served as downloads (PDFs, images and
plain text may display inline, in a sandbox). **Backups** include document versions and
signatories, and the full ZIP backup includes the uploaded files.

> Documents flagged with the shield icon are internal drafts. Nothing here is legal, tax or
> professional advice, and a self-written or AI-assisted draft is not reviewed or approved
> until a qualified professional has actually done so.

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
database. `tests/integration/documentWorkflow.test.ts` additionally runs the real document
server actions against a throwaway SQLite file built from the project's migrations (review,
blocker, approval, signatures, active; versions never overwrite files). One component test
(`tests/components/status-badge.test.tsx`) exercises rendered output. Every page and interactive flow described in the acceptance scenario was additionally
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
- Document governance is a tracker, not a signing platform or legal advisor: signatures are
  recorded by a person clicking "signed", and professional approval is only ever what a person
  records. The seeded register is a curated sample (see above) and must be reviewed by your own
  lawyer/accountant before being relied on.
- Document search in Ctrl+K covers documents only (not tasks/blockers yet); the register's
  filters are search + category + priority (the queue tabs cover review/signature/renewal
  views). Costs can reference a document in the schema, but there's no UI to link them yet.
- The projected-ready-date estimate is a simple critical-path-effort model, not a scheduling
  engine — treat it as a rough signal, not a promise (the UI says so too).
- Currency conversion isn't implemented; mixed-currency cost entries are flagged, not summed
  precisely.
- `npm audit` reports vulnerabilities in `mysql2`/`deepmerge-ts`, both transitive dependencies
  of the Prisma CLI's multi-database tooling — this app only ever talks to SQLite and never
  exercises that code path. Downgrading Prisma to "fix" it would undo the Prisma 7 driver-
  adapter setup this project deliberately uses; left as-is and documented here instead.
