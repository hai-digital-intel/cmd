import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBadge } from "@/components/status-badge";

describe("StatusBadge", () => {
  it("renders the human-readable label for a status", () => {
    render(<StatusBadge status="NEEDS_CONFIRMATION" />);
    expect(screen.getByText("Needs confirmation")).toBeInTheDocument();
  });

  it("renders a distinct label for DONE vs BLOCKED", () => {
    const { rerender } = render(<StatusBadge status="DONE" />);
    expect(screen.getByText("Done")).toBeInTheDocument();
    rerender(<StatusBadge status="BLOCKED" />);
    expect(screen.getByText("Blocked")).toBeInTheDocument();
  });
});
