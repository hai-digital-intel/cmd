import { describe, it, expect } from "vitest";
import { validateUpload, MAX_UPLOAD_BYTES } from "@/lib/uploadPolicy";

describe("validateUpload", () => {
  it("accepts ordinary contract files", () => {
    expect(validateUpload({ name: "Shareholders Agreement v0.2.pdf", size: 3 * 1024 * 1024 })).toBeNull();
    expect(validateUpload({ name: "draft.docx", size: 200_000 })).toBeNull();
  });

  it("rejects files over the size limit but allows exactly the limit", () => {
    expect(validateUpload({ name: "big.pdf", size: MAX_UPLOAD_BYTES })).toBeNull();
    expect(validateUpload({ name: "big.pdf", size: MAX_UPLOAD_BYTES + 1 })).toMatch(/larger than/);
  });

  it("rejects executable and script extensions regardless of case", () => {
    expect(validateUpload({ name: "setup.exe", size: 10 })).toMatch(/can't be stored/);
    expect(validateUpload({ name: "RUN.PS1", size: 10 })).toMatch(/can't be stored/);
    expect(validateUpload({ name: "invoice.pdf.bat", size: 10 })).toMatch(/can't be stored/);
  });

  it("allows files with no extension", () => {
    expect(validateUpload({ name: "LICENCE", size: 10 })).toBeNull();
  });
});
