import { useEffect, useState } from "react";

// Returns Date.now() and re-renders the calling component every
// `intervalMs`. Use to drive relative-time labels ("2 min ago") so
// they refresh on a coarse cadence without forcing a 1 Hz tree update.
//
// Default 60 s is enough for "X min ago" granularity; pass a smaller
// value if you need second-level accuracy.
export function useNow(intervalMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
