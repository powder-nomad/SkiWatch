import { lazy } from "react";
import type { ComponentType, LazyExoticComponent } from "react";

const RELOAD_FLAG = "skiwatch:chunk-reload";

// React.lazy(() => import("./X")) breaks when the user's tab has a
// stale index-*.js whose chunk hashes don't exist on the server any
// more (classic PWA + GitHub Pages problem: user opens SkiWatch,
// keeps the tab open across a deploy, then taps a nav link → the
// dynamic-import URL 404s). Symptom: nav silently never resolves.
//
// Mitigation: catch the chunk-fetch error and reload once. The
// session-scoped flag prevents a reload loop if the failure is real
// (network down, asset truly missing) — we only auto-reload the
// first time per tab.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
): LazyExoticComponent<T> {
  return lazy(() =>
    factory().catch((error: unknown) => {
      const message = String((error as { message?: string })?.message ?? error);
      const looksLikeChunkLoad =
        message.includes("Failed to fetch dynamically imported module") ||
        message.includes("Importing a module script failed") ||
        message.includes("error loading dynamically imported module");

      if (
        looksLikeChunkLoad &&
        typeof window !== "undefined" &&
        !window.sessionStorage.getItem(RELOAD_FLAG)
      ) {
        window.sessionStorage.setItem(RELOAD_FLAG, "1");
        window.location.reload();
        return new Promise<{ default: T }>(() => {});
      }
      throw error;
    }),
  );
}
