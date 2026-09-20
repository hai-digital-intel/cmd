# DATA_MODEL.md

Full schema: [`prisma/schema.prisma`](prisma/schema.prisma). This is a narrative summary —
if the two ever disagree, the schema file is authoritative.

## Hierarchy

```
Company ──< Ownership >── Person
Category ──< Milestone ──< Task ──< ChecklistItem
                │                │
                │                ├──< Evidence >── Document
                │                ├──< TaskDependency >── Task (self-referential)
                │                ├──< CostItem
                │                ├──< BlockerTask >── Blocker
                │                └──< Activity
                └──< MilestoneDependency >── Milestone (self-referential)

Category ──> LaunchGate (many categories can share one gate)
Note (quick capture, optionally converts into a Task)
PortfolioItem, WeeklyReview, Snapshot, Setting — standalone
```

Dependencies are always explicit join tables (`TaskDependency`, `MilestoneDependency`,
`BlockerTask`, `Ownership`) — never a comma-separated list of IDs in a text column.

## Entities

### Company
Single row in practice (single-tenant). `archived` + `archivedAt` implement the
setup → archived transition (section 52/53 of the brief) without a schema migration.

### Person
A stakeholder — not necessarily a login. `type` is one of `PersonType`
(FOUNDER, SHAREHOLDER, ACCOUNTANT, LAWYER, BANK, AUTHORITY, SUPPLIER, CONTRACTOR, OTHER).
`isInternal` distinguishes Haya/Mohammad from external parties like "Accountant (TBD)" —
internal people can't be deleted from the Settings UI.

### Ownership
Join table between `Company` and `Person`: `percent` + `role` (e.g. "Founder", "Shareholder").

### Category
A top-level setup area (Corporate & Legal, Banking & Finance, ...). Carries a `weight` used in
readiness math and an optional `launchGateId` — multiple categories can roll up into one gate
(e.g. Commercial Readiness + Portfolio & Proof both feed the "Commercial" gate).

### Milestone
Belongs to a `Category`. `requiredForLaunch` marks it as gating (see `computeGateStatus`).
`phase` (a `Phase` enum: FOUNDATION, LEGAL_FINANCE, BRAND_DIGITAL,
COMMERCIAL_INFRASTRUCTURE, OPERATIONAL_READINESS, LAUNCH_READY) drives the Roadmap page's
grouping. `MilestoneDependency` rows model milestone-level prerequisites for the Roadmap and
Setup Map — kept separate from task-level `TaskDependency` because a 100+ node task graph
would be unreadable on one canvas; the map renders one node per milestone.

### Task
The unit of work. Key fields beyond the obvious (`title`, `description`, `status`):

- `status` — `TaskStatus` enum: NOT_STARTED, NEXT, IN_PROGRESS, WAITING_EXTERNAL, BLOCKED,
  NEEDS_REVIEW, DONE, NOT_APPLICABLE, NEEDS_CONFIRMATION.
- `verificationLevel` — `VerificationLevel` enum: REQUIRED, RECOMMENDED, OPTIONAL,
  NEEDS_VERIFICATION, NOT_APPLICABLE. Distinct from `status`: a task can be `NOT_STARTED` and
  `OPTIONAL` at the same time. `OPTIONAL` and `NOT_APPLICABLE` tasks never block milestone
  completion (see `computeMilestoneCompletion`).
- `weight` — this task's own contribution before multiplying by milestone/category weight.
- `requiredForLaunch` — feeds the critical-path closure and the prioritization score; distinct
  from the milestone-level `requiredForLaunch` used for gate completion.
- `priorityOverride` — a founder-set manual priority that dominates the scoring formula.
- `evidenceRequired` — gates the "Complete with evidence" flow in the task detail page.
- `waitingOn` / `externalWaitUntil` / `blockedReason` — free-text + date context for
  WAITING_EXTERNAL / BLOCKED states, surfaced in Blockers → "Waiting on others" and the
  timeline projection.
- `overrideReason` — set when a task is marked done via the evidence-override path.

### TaskDependency / MilestoneDependency
`(taskId/milestoneId, dependsOnId)` pairs, unique per pair. A task/milestone is "the
dependent," `dependsOnId` is "the prerequisite." Cycle-checked at write time
(`wouldCreateCycle` in `lib/services/dependency.ts`) before a new edge is added.

### ChecklistItem
Sub-steps within a task ("Get Mohammad's signature", etc.) — used by both the task detail page
and Focus Mode's "smallest next step" prompt (the first unchecked item).

### Document / Evidence
`Document` is the vault entry (name, category, version, expiry tracking, either a local
`filePath` — a generated filename under `storage/uploads/` — or an `externalUrl`).
`Evidence` links a `Task` to proof of completion: a `Document`, a bare `url`, or a free-text
`note`. A task can have evidence without being `evidenceRequired`, and vice versa isn't
enforced at the database level — the UI is what nudges evidence-gated completion.

### CostItem
Setup spend only. `type` (ONE_TIME/RECURRING) × `status` (PLANNED/COMMITTED/PAID/UNKNOWN) ×
optional `frequency` (monthly/quarterly/annual) for recurring items — see
`lib/services/cost.ts` for how these combine into the Costs page summary. `currency` defaults
to "AED" but is per-row, not hardcoded.

### Blocker / BlockerTask
A `Blocker` is a structured, ongoing obstacle (as opposed to a task simply being `BLOCKED`).
`waitingOnPersonId` or free-text `waitingOnText` identifies who it's on; `nextFollowUp` drives
the Blockers page sort order. `BlockerTask` links it to the task(s) it's actually holding up —
creating a blocker with related tasks also flips those tasks to `BLOCKED`.

### Note
A quick-capture inbox item (`status`: INBOX → CONVERTED or ARCHIVED). `convertedTaskId` points
at the `Task` it became, if any. Deliberately has almost no structure at capture time — all the
categorization happens at conversion, matching the "get it out of your head first" UX goal.

### LaunchGate
One row per gate (legal, finance, tax_compliance, governance, brand, digital, commercial,
operations, security). Status isn't stored — it's always computed live from its categories'
milestones via `computeGateStatus`, so it can never drift out of sync with the underlying tasks.

### Activity
An append-only human-readable log (`summary` is a full sentence, e.g. "Marked 'Finalize
shareholder agreement' as Done."). `metadata` holds JSON-encoded extra detail when useful
(e.g. an override reason). This is what powers the Activity page and per-task activity history.

### WeeklyReview / Snapshot
`Snapshot` records point-in-time readiness (`overallReadiness`, `criticalPathReadiness`,
per-category JSON, `projectedReadyDate`) — the raw material for explaining *why* a projected
date moved between two points in time (`explainDateShift` in `lib/services/timeline.ts`).
`WeeklyReview` is a lightweight rollup for the five-minute weekly-review workflow.

### PortfolioItem
Demo/case-study tracking (`stage`: CONCEPT → PROTOTYPE → DEMO_READY → CASE_STUDY_READY →
PUBLISHED). Deliberately has no relation to real client data.

### Setting
A generic `key`/JSON-`value` store for app-level config that doesn't warrant its own table:
`currency`, `companyArchived`, `minutesPerDay` (used by the timeline projection's effort → days
conversion) today; safe to add more without a migration.

## Portability

Every model uses `String @id @default(cuid())` and standard scalar types — nothing SQLite-
specific leaks into application code (no raw SQL, no SQLite-only column types). Moving to
PostgreSQL/Supabase later is a matter of changing `provider` in the `datasource` block and
`prisma.config.ts`, swapping the driver adapter in `lib/db/client.ts`, and re-running
`prisma migrate deploy` against the new database.
