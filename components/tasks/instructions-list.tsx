/**
 * Renders newline-separated instructions as a clean numbered list, regardless of whether
 * the source text already has "1. " prefixes (seed content does; user-edited text might
 * not) — we strip any existing numbering and re-number so it never doubles up or drifts.
 */
export function InstructionsList({ text }: { text: string }) {
  const steps = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^\d+[.)]\s*/, ""));

  if (steps.length === 0) return null;

  return (
    <ol className="space-y-2">
      {steps.map((step, i) => (
        <li key={i} className="flex gap-2.5 text-sm text-foreground">
          <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-surface-muted text-[11px] font-semibold text-muted-foreground">
            {i + 1}
          </span>
          <span className="pt-0.5">{step}</span>
        </li>
      ))}
    </ol>
  );
}
