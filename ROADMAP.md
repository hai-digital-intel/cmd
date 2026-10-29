# ROADMAP.md

This is the *project's own* development roadmap — not to be confused with the in-app
`/roadmap` feature, which tracks h.ai's company setup progress.

## Shipped (this build)

Phases 0–9 from [PLAN.md](PLAN.md) are complete: scaffold, schema, Today dashboard with "Your
Next 3," Setup/Focus Mode/Quick Capture, Blockers/Documents/Costs, Roadmap + dependency map,
Activity log + Command palette, Backup/Restore + Archive, the deterministic Setup Copilot, and
a Vitest suite over the scoring/business-logic layer. `npm run build` produces a clean
production build with every route rendering live data.

A later upgrade (PLAN.md section 10) turned Documents into a register + governance + vault
system: 20 document folders, a curated Launch Pack, professional-review and signature workflows
with linked blockers, append-only versions, launch-gate/readiness integration, renewals,
CSV/JSON exports, Ctrl+K document search, and integration tests over the real server actions.

## Logical next improvements, roughly in priority order

1. **Weekly review workflow (UI)** — the `WeeklyReview` model and `summarizeWeek` copilot
   query exist, but there's no dedicated page walking through "what changed, what slipped,
   what's the new projected date" as a five-minute guided flow (brief section 38). Worth
   building once there's a few weeks of real activity history to summarize.
2. **Snapshot recording on a schedule** — `Snapshot` rows are readable by
   `explainDateShift`, but nothing writes one automatically yet. A daily/weekly cron-style
   snapshot (even just "on every visit to `/roadmap`, if none exists for today") would make the
   "projected readiness moved from X to Y because Z" explainability fully automatic instead of
   needing two manually-triggered exports to compare.
3. **Playwright smoke suite** — see [ARCHITECTURE.md](ARCHITECTURE.md#testing-strategy) for
   why this was judged out of scope for this iteration; the acceptance-scenario flows were all
   hand-verified instead. A minimal suite (seed → load Today → complete a task → assert
   readiness moved) would catch full-stack regressions the unit tests can't.
4. **Milestone-level manual reordering / drag-and-drop** in the Setup page — right now,
   category and milestone order is fixed by `sortOrder` at creation time with no UI to change
   it later.
5. **Configurable launch gates** — gates and their category membership are seeded, not
   editable from Settings yet (brief section 51 says "allow these gates to be configurable").
   Low risk to add: a small admin table UI over the existing `LaunchGate`/`Category.launchGateId`
   relation.
6. **Contractor/collaborator access model** — `Person.isInternal` and `PersonType` exist, but
   there's no actual access-provisioning workflow beyond documenting it as a task (this was
   explicitly out of scope per brief section 47: "not every stakeholder needs login access...
   this is initially single-user software").
7. **PDF export of a document or the readiness summary** — useful for sending a bank or lawyer
   a snapshot without giving them access to the app itself.
8. **Currency conversion** — `CostItem.currency` is per-row and the Costs page flags mixed
   currencies rather than converting them; a real conversion (even a manually-entered daily
   rate) would let multi-currency setup spend roll up into one true total.

### Document governance follow-ups

Deliberately left out of the first pass of the document upgrade (all additive):

- **Weekly Review integration**: surface "documents sent for review more than N days ago" and
  "signatures outstanding" in the weekly review once that page exists (item 1 above).
- **Cost to document linking UI**: `CostItem.relatedDocumentId` exists; add a picker on the cost
  form and a "linked costs" total on the document page.
- **Guided drafting outlines**: structured section outlines/checklists for documents h.ai can
  draft itself (always labelled "draft for professional review"; no auto-generated legal text).
- **Fuller register + more filters**: import more of the long-list as individual rows when they
  become relevant, and add filters for owner, reviewer type, "no file", and review-due.
- **Folder-structured ZIP export**: the 20 numbered folders exist as taxonomy and CSV columns;
  a ZIP laid out as `01 Corporate/...` is not built (the physical upload folder intentionally
  stays flat for storage safety).
- **Global search beyond documents**: Ctrl+K searches documents; tasks, milestones and blockers
  are not indexed yet.
- **External signers and reminders**: signatories who aren't `Person` rows, and follow-up
  reminders on the signature queue.

## Explicitly not planned

Per the product brief's hard boundaries (see [PLAN.md](PLAN.md) §"What this is"): this will
not grow into a CRM, invoicing/accounting system, employee management tool, or generic project
manager. Once every launch gate is Ready, the intended path is **Archive**, not "keep adding
features" — see Settings → Archive.
