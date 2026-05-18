// Boring grey skeleton block. Use this as a loading placeholder
// instead of the literal text "Loading…" — it reserves layout space
// so the page doesn't jump when data lands.
//
// Match the eventual content's shape:
//   <Skeleton className="h-9 w-24" />  for a temperature pill
//   <Skeleton className="h-4 w-3/4" /> for a one-line label
//   <Skeleton className="h-32 w-full" /> for a card body
export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      role="status"
      aria-busy="true"
      className={[
        "animate-pulse rounded-md bg-slate-200/80 dark:bg-slate-700/60",
        className,
      ].join(" ")}
    />
  );
}
