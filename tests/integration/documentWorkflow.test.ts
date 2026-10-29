// @vitest-environment node
/**
 * Runs the real document server actions against a throwaway SQLite database built from the
 * project's own migrations — the same workflow the brief's acceptance scenario walks through
 * (draft → professional review → blocker → approval → signatures → active). Only Next's cache
 * invalidation and the on-disk file storage are faked.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { createRequire } from "node:module";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("server-only", () => ({}));

const stored: string[] = [];
const deleted: string[] = [];
let uploadCounter = 0;
vi.mock("@/lib/storage", () => ({
  saveUpload: async (file: File) => {
    const relativePath = `fake-${++uploadCounter}-${file.name}`;
    stored.push(relativePath);
    return { relativePath, originalFileName: file.name, fileSizeBytes: file.size, mimeType: file.type || "application/pdf" };
  },
  deleteUpload: async (relativePath: string) => {
    deleted.push(relativePath);
  },
}));

type SqliteDb = { exec(sql: string): void; close(): void };
const Database = createRequire(import.meta.url)("better-sqlite3") as new (file: string) => SqliteDb;

let tmpDir: string;
let prisma: typeof import("@/lib/db/client").prisma;
let actions: typeof import("@/lib/actions/documents");
let haya: { id: string };
let mohammad: { id: string };

const pdf = (name: string, size = 100) => new File([new Uint8Array(size)], name, { type: "application/pdf" });

beforeAll(async () => {
  tmpDir = mkdtempSync(path.join(tmpdir(), "hai-doc-test-"));
  const dbFile = path.join(tmpDir, "test.db");

  const db = new Database(dbFile);
  const migrationsDir = path.resolve(__dirname, "../../prisma/migrations");
  for (const dir of readdirSync(migrationsDir).sort()) {
    const sqlPath = path.join(migrationsDir, dir, "migration.sql");
    try {
      db.exec(readFileSync(sqlPath, "utf8"));
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
    }
  }
  db.close();

  process.env.DATABASE_URL = `file:${dbFile}`;
  ({ prisma } = await import("@/lib/db/client"));
  actions = await import("@/lib/actions/documents");

  haya = await prisma.person.create({ data: { name: "Haya", type: "FOUNDER", isInternal: true } });
  mohammad = await prisma.person.create({ data: { name: "Mohammad", type: "FOUNDER", isInternal: true } });
});

afterAll(async () => {
  await prisma.$disconnect();
  rmSync(tmpDir, { recursive: true, force: true });
});

describe("document workflow (integration)", () => {
  it("walks the brief's acceptance scenario: draft → review → blocker → approval → signatures → active", async () => {
    const id = await actions.createDocument({
      name: "Shareholders Agreement",
      category: "GOVERNANCE",
      priority: "P0",
      requiredForLaunch: true,
      requiresProfessionalReview: true,
      professionalReviewType: "LAWYER",
      requiresSignature: true,
    });
    await actions.addSignatory(id, haya.id);
    await actions.addSignatory(id, mohammad.id);

    let doc = await prisma.document.findUniqueOrThrow({ where: { id } });
    expect(doc.lifecycleStatus).toBe("NOT_STARTED");
    expect(doc.version).toBeNull();

    await actions.setLifecycleStatus(id, "DRAFT_COMPLETE");
    await actions.sendForProfessionalReview(id);
    await actions.sendForProfessionalReview(id); // idempotent: must not stack a second blocker

    doc = await prisma.document.findUniqueOrThrow({ where: { id } });
    expect(doc.lifecycleStatus).toBe("UNDER_PROFESSIONAL_REVIEW");
    expect(doc.reviewSentDate).not.toBeNull();
    const openBlockers = await prisma.blocker.findMany({ where: { relatedDocumentId: id, status: "OPEN" } });
    expect(openBlockers).toHaveLength(1);
    expect(openBlockers[0]!.type).toBe("LEGAL");

    await actions.approveProfessionalReview(id, "Looks good");
    doc = await prisma.document.findUniqueOrThrow({ where: { id } });
    expect(doc.lifecycleStatus).toBe("READY_FOR_SIGNATURE");
    expect(doc.approvedDate).not.toBeNull();
    expect(await prisma.blocker.count({ where: { relatedDocumentId: id, status: "OPEN" } })).toBe(0);
    expect(await prisma.blocker.count({ where: { relatedDocumentId: id, status: "RESOLVED" } })).toBe(1);

    await actions.setSignatureStatus(id, haya.id, true);
    expect((await prisma.document.findUniqueOrThrow({ where: { id } })).lifecycleStatus).toBe("PARTIALLY_SIGNED");

    await actions.setSignatureStatus(id, mohammad.id, true);
    doc = await prisma.document.findUniqueOrThrow({ where: { id } });
    expect(doc.lifecycleStatus).toBe("SIGNED");
    expect(doc.signedDate).not.toBeNull();

    await actions.activateDocument(id);
    doc = await prisma.document.findUniqueOrThrow({ where: { id } });
    expect(doc.lifecycleStatus).toBe("ACTIVE");
    expect(doc.effectiveDate).not.toBeNull();

    const log = await prisma.activity.findMany({ where: { entityType: "Document", entityId: id } });
    const actionsLogged = log.map((a) => a.action);
    for (const expected of ["sent_for_review", "review_approved", "signature_added", "activated"]) {
      expect(actionsLogged).toContain(expected);
    }
  });

  it("does not drag an early-stage document into PARTIALLY_SIGNED when someone signs prematurely", async () => {
    const id = await actions.createDocument({ name: "Early draft", category: "GOVERNANCE", requiresSignature: true });
    await actions.addSignatory(id, haya.id);
    await actions.addSignatory(id, mohammad.id);
    await actions.setLifecycleStatus(id, "DRAFTING");

    await actions.setSignatureStatus(id, haya.id, true);

    expect((await prisma.document.findUniqueOrThrow({ where: { id } })).lifecycleStatus).toBe("DRAFTING");
  });

  it("requested changes send the document back for rework and keep the blocker open until approval", async () => {
    const id = await actions.createDocument({ name: "NDA", category: "CLIENT_CONTRACTS", requiresProfessionalReview: true, professionalReviewType: "LAWYER" });
    await actions.setLifecycleStatus(id, "DRAFT_COMPLETE");
    await actions.sendForProfessionalReview(id);
    await actions.markReviewChangesRequired(id, "Tighten clause 4");

    const doc = await prisma.document.findUniqueOrThrow({ where: { id } });
    expect(doc.lifecycleStatus).toBe("CHANGES_REQUIRED");
    expect(doc.reviewOutcomeNotes).toBe("Tighten clause 4");
    expect(await prisma.blocker.count({ where: { relatedDocumentId: id, status: "OPEN" } })).toBe(1);

    await actions.sendForProfessionalReview(id);
    expect(await prisma.blocker.count({ where: { relatedDocumentId: id } })).toBe(1);
  });

  it("approval of a document without signatures goes straight to ACTIVE", async () => {
    const id = await actions.createDocument({ name: "Privacy Policy", category: "PRIVACY", requiresProfessionalReview: true, professionalReviewType: "PRIVACY_SPECIALIST" });
    await actions.setLifecycleStatus(id, "DRAFT_COMPLETE");
    await actions.sendForProfessionalReview(id);
    await actions.approveProfessionalReview(id);

    const doc = await prisma.document.findUniqueOrThrow({ where: { id } });
    expect(doc.lifecycleStatus).toBe("ACTIVE");
    expect(doc.effectiveDate).not.toBeNull();
  });

  it("adding a version never overwrites or deletes the previous version's file", async () => {
    const id = await actions.createDocument({ name: "MSA", category: "CLIENT_CONTRACTS", file: pdf("msa-v1.pdf") });
    const deletedBefore = deleted.length;

    await actions.addDocumentVersion(id, { versionLabel: "v0.2", statusLabel: "Sent to lawyer", file: pdf("msa-v2.pdf") });

    const versions = await prisma.documentVersion.findMany({ where: { documentId: id }, orderBy: { createdAt: "asc" } });
    expect(versions.map((v) => v.versionLabel)).toEqual(["v1.0", "v0.2"]);
    expect(versions.map((v) => v.isCurrent)).toEqual([false, true]);
    expect(versions[0]!.filePath).not.toBe(versions[1]!.filePath);
    expect(deleted.length).toBe(deletedBefore);

    const doc = await prisma.document.findUniqueOrThrow({ where: { id } });
    expect(doc.filePath).toBe(versions[1]!.filePath);
    expect(doc.version).toBe("v0.2");
  });

  it("a version added without a new file keeps pointing at the existing file", async () => {
    const id = await actions.createDocument({ name: "SOW", category: "CLIENT_CONTRACTS", file: pdf("sow.pdf") });
    const original = (await prisma.document.findUniqueOrThrow({ where: { id } })).filePath;

    await actions.addDocumentVersion(id, { versionLabel: "v1.1", statusLabel: "Metadata only" });

    const current = await prisma.documentVersion.findFirstOrThrow({ where: { documentId: id, isCurrent: true } });
    expect(current.filePath).toBe(original);
  });

  it("deleting a document removes every version's file and cascades its rows", async () => {
    const id = await actions.createDocument({ name: "To delete", category: "CORPORATE", file: pdf("d1.pdf") });
    await actions.addDocumentVersion(id, { versionLabel: "v2", statusLabel: "Revised", file: pdf("d2.pdf") });
    await actions.addSignatory(id, haya.id);
    const paths = (await prisma.documentVersion.findMany({ where: { documentId: id } })).map((v) => v.filePath!);

    await actions.deleteDocument(id);

    for (const p of paths) expect(deleted).toContain(p);
    expect(await prisma.document.count({ where: { id } })).toBe(0);
    expect(await prisma.documentVersion.count({ where: { documentId: id } })).toBe(0);
    expect(await prisma.documentSignatory.count({ where: { documentId: id } })).toBe(0);
  });

  it("a launch gate can be attached when creating a document and cleared on edit", async () => {
    const gate = await prisma.launchGate.create({ data: { key: "governance-test", name: "Governance" } });
    const id = await actions.createDocument({ name: "Gated doc", category: "GOVERNANCE", requiredForLaunch: true, launchGateId: gate.id });
    expect((await prisma.document.findUniqueOrThrow({ where: { id } })).launchGateId).toBe(gate.id);

    await actions.updateDocumentFields(id, { launchGateId: null });
    expect((await prisma.document.findUniqueOrThrow({ where: { id } })).launchGateId).toBeNull();
  });

  it("survives a backup export and restore, including versions, signatories and linked blockers", async () => {
    const backup = await import("@/lib/backup");
    const id = await actions.createDocument({
      name: "Backup subject",
      category: "GOVERNANCE",
      requiresProfessionalReview: true,
      professionalReviewType: "LAWYER",
      file: pdf("b1.pdf"),
    });
    await actions.addSignatory(id, haya.id);
    await actions.setSignatureStatus(id, haya.id, true);
    await actions.addDocumentVersion(id, { versionLabel: "v2", statusLabel: "Revised", file: pdf("b2.pdf") });
    await actions.setLifecycleStatus(id, "DRAFT_COMPLETE");
    await actions.sendForProfessionalReview(id);

    const counts = async () => ({
      documents: await prisma.document.count(),
      versions: await prisma.documentVersion.count(),
      signatories: await prisma.documentSignatory.count(),
      docBlockers: await prisma.blocker.count({ where: { relatedDocumentId: { not: null } } }),
    });
    const before = await counts();

    // Round-trip through JSON exactly as the real backup file does (Dates become strings).
    const exported = JSON.parse(JSON.stringify(await backup.exportBackupData())) as Awaited<ReturnType<typeof backup.exportBackupData>>;
    await backup.restoreFromBackupData(exported.data);

    expect(await counts()).toEqual(before);
    const restored = await prisma.document.findUniqueOrThrow({
      where: { id },
      include: { versions: true, signatories: true },
    });
    expect(restored.lifecycleStatus).toBe("UNDER_PROFESSIONAL_REVIEW");
    expect(restored.versions.filter((v) => v.isCurrent).map((v) => v.versionLabel)).toEqual(["v2"]);
    expect(restored.signatories[0]!.signed).toBe(true);
    expect(restored.signatories[0]!.signedDate).toBeInstanceOf(Date);
  });

  it("adding the same signatory twice is a no-op, not an error", async () => {
    const id = await actions.createDocument({ name: "Dup signatory", category: "GOVERNANCE" });
    await actions.addSignatory(id, haya.id);
    await actions.addSignatory(id, haya.id);
    expect(await prisma.documentSignatory.count({ where: { documentId: id } })).toBe(1);
  });
});
