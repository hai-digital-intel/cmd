export default function Loading() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <div className="h-7 w-64 animate-pulse rounded-md bg-surface-muted" />
      <div className="h-20 w-full animate-pulse rounded-xl bg-surface-muted" />
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="h-40 animate-pulse rounded-xl bg-surface-muted" />
        <div className="h-40 animate-pulse rounded-xl bg-surface-muted" />
        <div className="h-40 animate-pulse rounded-xl bg-surface-muted" />
      </div>
    </div>
  );
}
