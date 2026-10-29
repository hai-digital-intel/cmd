# PLAN.md — h.ai Setup Command Center

## 1. What this is

A local-first Next.js app that tracks the one-time company-setup process for h.ai
(Dubai Silicon Oasis / Dtec) from "partially established" to "operationally ready."
It is a dependency-aware completion engine, not a generic task manager, and is
explicitly designed to be archived once launch gates are READY.

## 2. Stack

- Next.js 16 (App Router, React Server Components + Server Actions), React 19, TypeScript 5.9 (strict)
- Tailwind CSS v4 (CSS-first `@theme`, no tailwind.config.js required)
- Hand-rolled shadcn-style primitives in `components/ui` (Radix primitives + `class-variance-authority` + `tailwind-merge`), since the interactive `shadcn` CLI cannot run in this non-interactive shell
- Prisma ORM 7 + SQLite (`./data/hai-setup.db`), classic engine (no driver adapter needed for SQLite)
- Zod 4 for validation, React Hook Form + `@hookform/resolvers` for forms
- Recharts for the few charts that earn their place (cost breakdown, readiness trend)
- `@xyflow/react` (the current package for what the brief calls "React Flow") for the dependency map
- Lucide for icons, `cmdk` for the command palette, `sonner` for toasts
- Vitest for business-logic + component tests

No external services, no auth provider, no cloud DB. Everything works offline after `npm install`.

## 3. Domain model (see DATA_MODEL.md for full field lists)

`Company → Category → Milestone → Task → ChecklistItem`, plus `TaskDependency` and
`MilestoneDependency` (explicit relational join tables, never comma-separated ID strings),
`Person` (stakeholders), `Document` + `Evidence`, `CostItem`, `Blocker`, `Note` (quick capture),
`LaunchGate` (one per Category, aggregates readiness), `Activity` (audit trail), `WeeklyReview`,
`Snapshot` (readiness-over-time, for timeline explainability), `PortfolioItem`, `Setting` (KV store).

Dependencies are modeled at both levels: `TaskDependency` for the task detail drawer's
"Dependencies / Unlocks" lists, and `MilestoneDependency` for the Setup Map / roadmap phases,
since 50+ task nodes would be unreadable on one canvas.

## 4. Business logic lives in `lib/services`, not components

- `readiness.ts` — weighted readiness (category.weight × milestone.weight × task.weight),
  NOT_APPLICABLE excluded from denominator, NEEDS_CONFIRMATION excluded from numerator.
  Produces overall / critical-path / per-category / per-gate readiness.
- `dependency.ts` — actionability: a task is "available" only if every task it depends on
  is DONE or NOT_APPLICABLE, and it isn't itself BLOCKED. Recomputes downstream eligibility
  when a prerequisite finishes; never auto-completes downstream work.
- `launchGates.ts` — a gate is READY only when every `requiredForLaunch` milestone in its
  categories has all its required tasks DONE/NOT_APPLICABLE; optional tasks never block a gate.
- `prioritization.ts` — deterministic scoring for "Your Next 3": critical-path membership,
  requiredForLaunch, downstream-unlock count, deadline proximity, effort (low-effort/high-unlock
  boost), heavy penalties for WAITING_EXTERNAL/BLOCKED (blocked tasks are excluded from Next 3
  unless resolving the blocker is itself the actionable step), manual override.
- `timeline.ts` — critical-path length estimate (longest chain of estimatedMinutes across
  dependency graph) → projected ready date, with an explanation string sourced from what's
  currently on the critical path.
- `cost.ts` — spent / committed / planned / recurring-monthly aggregation, currency-agnostic
  (AED is a `Setting`, not a hardcoded constant).
- `backup.ts` — JSON export/import with a schema `version` field; restore validates the version
  and refuses silently-incompatible data; auto-backs-up before a destructive restore.

Every one of these is a pure function over plain data (no Prisma types leaking into scoring
logic) so Vitest can exercise them without a database.

## 5. Routes

`/` (Today), `/setup`, `/setup/[categorySlug]`, `/tasks/[id]`, `/roadmap`, `/roadmap/map`,
`/blockers`, `/documents`, `/costs`, `/readiness`, `/activity`, `/settings`, `/focus`,
plus API routes only where a Server Action doesn't fit (file streaming for uploads/downloads,
backup export/import as file transfer).

## 6. Key design choices

- Server Components read directly from `lib/services` + Prisma; mutations are Server Actions
  that revalidate the affected routes — no separate REST layer to keep in sync.
- File uploads land in `storage/uploads/<uuid>__<sanitized-original-name>`; the DB stores that
  relative path plus original name. Filenames are generated server-side (uuid) to prevent path
  traversal; the original name is never used as a filesystem path.
- "Your Next 3" is a home-page component, not a page — it deliberately shows nothing else by
  default (progressive disclosure is a hard requirement, not a nice-to-have).
- AI is an interface (`lib/ai/provider.ts`) with a `NullAIProvider` default. The Copilot panel
  works entirely off deterministic queries against the Prisma data; if no provider is configured
  it says so and keeps working.
- Archive is a `Setting` flag (`companyArchived`), not a schema migration — flips the UI into a
  read-mostly historical view without deleting anything.

## 7. Phases (executed in order, committing after each stable milestone)

0. Scaffold, schema, design tokens (this phase)
1. Prisma + seed + app shell/nav + Category/Milestone/Task CRUD
2. Today dashboard, readiness engine, dependency engine, launch gates
3. Focus Mode, Quick Capture, Blockers, Waiting, 15-minute wins
4. Documents + evidence + local storage, Costs
5. Roadmap, critical path, dependency map, timeline projections
6. Activity log, weekly review, command palette
7. Backup/restore/export, Archive mode
8. Copilot (deterministic) + AI provider abstraction
9. Tests, accessibility/responsive pass, build verification, docs

## 8. Assumptions (flagged, not fabricated)

Anything about actual completion state (bank account open? VAT required? shareholder
agreement signed?) is seeded as `NEEDS_CONFIRMATION` / `NEEDS_VERIFICATION`, never assumed true.
Only facts explicitly given in the brief (service licence received, ownership 50/50, DSO/Dtec,
haiconsulting.ae, services list) are seeded as fact.

## 9. Risks

- Tailwind v4's automatic content scanning needs the app router files to actually exist before
  first build; mitigated by scaffolding all routes before the first `npm run build`.
- Prisma 7 SQLite: using the classic `provider = "sqlite"` engine rather than a driver adapter —
  if `prisma generate` demands an adapter this plan falls back to `@prisma/adapter-better-sqlite3`.
- `@xyflow/react` styling needs its CSS imported once in the root layout or nodes render unstyled.

## 10. Document Governance Upgrade

Turns `/documents` from a flat file vault into a real register: what documents h.ai needs,
what state each is in, who must review/sign it, and what it blocks. Inspected first: the
existing `Document` model (flat, `status: String`, no versioning/signatures/review workflow),
`launchGates.ts`'s `computeGateStatus` (task-only), `readiness.ts` (task-only), the Blocker/
CostItem models (already have `relatedTaskId`-style optional FKs — the pattern this upgrade
reuses), and `backup.ts` (a fixed table list + sequential `createMany`, which the new tables
have to fit into without introducing a circular FK at restore time).

**Data-model changes** (see DATA_MODEL.md for full field lists):
- `Document` gains real enums (`DocumentPriority`, `DocumentRequirementLevel`,
  `DocumentSourceType`, `DocumentLifecycleStatus`, `ProfessionalReviewType`,
  `DocumentApplicabilityStatus`) in place of the old free-text `status`, plus
  `requiredForLaunch` + `launchGateId` (direct, not via category — a document can gate
  something without its category being launch-critical), `triggerCondition`,
  `requiresProfessionalReview`/`professionalReviewType`/`reviewerName`, `requiresSignature`,
  `relatedMilestoneId` upgraded from a bare string to a real relation, and date fields split
  by meaning (`reviewDueDate` = periodic review, `expiryDate` = hard expiry — never conflated).
- New `DocumentVersion` (one row per revision; `isCurrent: Boolean` flag rather than a
  `currentVersionId` pointer on `Document`, specifically to avoid a circular FK between
  `Document` and `DocumentVersion` that would complicate both normal writes and backup/restore
  ordering — Document keeps denormalized `filePath`/`mimeType`/etc. mirroring whichever version
  `isCurrent`, so the existing file-serving route needs no changes).
- New `DocumentSignatory` (`documentId` + `personId` + `signed` + `signedDate`); signature
  status (NOT_REQUIRED/NOT_READY/READY/PARTIALLY_SIGNED/SIGNED) is **computed**, never stored,
  matching how `LaunchGate.status` already works elsewhere in this codebase — one fewer place
  for state to drift out of sync.
- `Blocker.relatedDocumentId` and `CostItem.relatedDocumentId` (both nullable, both following
  the exact `relatedTaskId` pattern those models already use) — a blocker or cost can now point
  at a document instead of/alongside a task.
- The existing free-text `Document.category` is repurposed to hold one of 20 fixed folder keys
  (`lib/documentTaxonomy.ts`) mirroring the brief's logical folder structure — this is a
  **different taxonomy** from the setup `Category` model (which organizes tasks for readiness),
  so `categoryId` stays as an optional cross-link to a setup Category, not a replacement.

**Readiness/launch-gate integration**: `computeGateStatus` (`lib/services/launchGates.ts`)
gets a new optional 4th parameter, `documents: ScoredDocument[] = []` — additive and backward
compatible, so every existing test keeps passing unchanged. A document blocks a gate only if
`requiredForLaunch`, pointed at that gate, not OPTIONAL/NOT_APPLICABLE/TRIGGER_DEPENDENT, and
not yet ACTIVE/SIGNED. A new `lib/services/documentGovernance.ts` holds the document-specific
pure functions (countable/complete/weight-by-priority) exactly parallel to `readiness.ts`'s
task functions, with its own `computeDocumentReadiness` shown as its own stat rather than
blended into the existing task-only overall percentage — blending two different weight scales
(task effectiveWeight vs. document priority weight) would silently distort a number three other
pages already depend on and are already tested against. Documents affecting "is h.ai ready"
happens through the gate mechanism instead, which already feeds `isCompanyReady`.

**Migration strategy**: this is pre-launch software with no real end-user data yet — the only
`Document` rows that can exist anywhere are ones created during my own testing in this session,
already since removed. Per the same judgment call made earlier for the `Task.instructions`
column (see git history), the schema changes are applied via a fresh Prisma migration and the
database is reseeded rather than hand-migrating a handful of demo string values through an
enum change. This is called out here and in the final report rather than assumed silently; a
real deployment with genuine uploaded documents would need a one-off data-migration script
mapping the old free-text `status` values to `DocumentLifecycleStatus` before running this
migration, which is straightforward but intentionally not built since nothing exists to migrate.

**Seed strategy**: the brief's full document list runs to several hundred named items across 20
categories. Seeding every single bullet verbatim would produce a shallow, low-quality register
(many near-duplicates, several categories not yet relevant to a two-person consultancy) and
directly conflicts with the brief's own "avoid overwhelming," "not enterprise document
management software" constraints. Instead: the full curated Launch Pack list (brief §32, ~75
items) is seeded close to verbatim since it has a concrete acceptance test, plus a meaningful,
individually-considered sample from every remaining category (AI delivery templates, sales/
commercial, brand, contractors, vendors, partnerships, enterprise procurement, future SaaS —
the last several correctly seeded `TRIGGER_DEPENDENT` since none of those triggers have fired).
Nothing is marked `ACTIVE`/`SIGNED`/reviewed unless the existing seed already established that
fact (the trade licence, ownership records); everything else is `DRAFT_REQUIRED`,
`NEEDS_CONFIRMATION`, or `TRIGGER_DEPENDENT` as appropriate — never fabricated as complete.

**Backward compatibility**: `/api/documents/[id]/file` (upload safety, MIME allowlisting) and
`lib/storage.ts` are untouched — new fields are additive, and the file-serving contract
(`Document.filePath`/`mimeType` always reflect the current file) is preserved by design.

### Delivered vs. deferred (as built)

**Delivered**: the schema/migration, pure governance engine, launch-gate integration, curated
185-document seed, workflow server actions (review, linked blocker, approval, signatures,
activation, append-only versions), the six-tab Documents page and detail page, a launch-gate
picker, renewals, CSV/JSON exports, Ctrl+K document search, an upload policy (25 MB cap,
executable types refused, 30 MB Server Action limit), backup/restore coverage for the new
tables, and unit plus database-backed integration tests.

**Deferred** (listed in ROADMAP.md): weekly-review integration, cost-to-document linking UI,
guided drafting outlines, owner/reviewer/"no file"/review-due filters, a folder-structured ZIP
export, search beyond documents, and importing the rest of the brief's long-list of documents.

**Corrections made along the way** (so the record is honest): an early seed gave every document
a `version` of "1.0"/"0.1" with no version history behind it; it is now `null` until a file
exists. The "Registered Office / Workspace Agreement" was briefly seeded Active on the strength
of a done *address* task and is now Needs Confirmation.
