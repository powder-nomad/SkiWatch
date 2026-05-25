import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import bundledResorts from "@/data/data";
import type { Resort } from "@/data/Util";
import { createResortIndex, type ResortIndex } from "@/lib/resortIndex";
import {
  DEFAULT_OPEN_SKI_DATA_BASE,
  loadResortsFromOpenSkiData,
} from "@/lib/openSkiData";
import type { LoadError } from "@/lib/openSkiData/types";

// 'loading' — initial fetch in flight (bundled data shown as placeholder)
// 'ready' — remote fetch succeeded with no errors
// 'partial' — remote fetch returned resorts AND collected some per-place errors
// 'bundled-fallback' — remote fetch failed; we're showing bundled-only data
// 'error' — bundled data also unavailable (theoretically impossible since
//   it's a static import — kept for completeness)
export type LoadStatus = "loading" | "ready" | "partial" | "bundled-fallback" | "error";

type ResortDataContextValue = {
  resorts: Resort[];
  resortIndex: ResortIndex;
  source: "bundled" | "remote";
  status: LoadStatus;
  errors: LoadError[];
  retry: () => void;
};

const ResortDataContext = createContext<ResortDataContextValue | null>(null);

export function ResortDataProvider({ children }: { children: ReactNode }) {
  const [resorts, setResorts] = useState<Resort[]>(bundledResorts);
  const [source, setSource] = useState<"bundled" | "remote">("bundled");
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [errors, setErrors] = useState<LoadError[]>([]);
  // Bumping this state value re-runs the load effect — manual retry.
  const [retryToken, setRetryToken] = useState(0);

  // `VITE_RESORT_DATA_URL` is the open-ski-data BASE URL (the loader
  // walks ${base}/registry/...). Legacy single-JSON URLs are no longer
  // supported — point it at any mirror that follows open-ski-data's
  // registry layout.
  const baseUrl =
    (import.meta.env.VITE_RESORT_DATA_URL as string | undefined)?.trim() ||
    DEFAULT_OPEN_SKI_DATA_BASE;

  useEffect(() => {
    if (!baseUrl) {
      setStatus("bundled-fallback");
      return;
    }

    const controller = new AbortController();
    setStatus("loading");

    const loadRemoteResorts = async () => {
      try {
        const { resorts: nextResorts, errors: loadErrors } = await loadResortsFromOpenSkiData(
          baseUrl,
          controller.signal
        );

        if (controller.signal.aborted) return;

        // Log each error so ops/devs see what failed even if the user
        // dismisses the banner. Grouped so the console doesn't get noisy.
        if (loadErrors.length > 0) {
          // eslint-disable-next-line no-console
          console.groupCollapsed(
            `[openSkiData] ${loadErrors.length} fetch error(s) while loading resort data`
          );
          for (const e of loadErrors) {
            // eslint-disable-next-line no-console
            console.warn(`[${e.scope}]${e.placeSlug ? ` ${e.placeSlug}` : ""} ${e.message}`, e.url);
          }
          // eslint-disable-next-line no-console
          console.groupEnd();
        }

        if (!nextResorts || nextResorts.length === 0) {
          // Total miss — fall back to the bundled dataset so the app
          // still works, but the banner will tell the user it's degraded.
          setResorts(bundledResorts);
          setSource("bundled");
          setErrors(loadErrors);
          setStatus("bundled-fallback");
          return;
        }

        setResorts(nextResorts);
        setSource("remote");
        setErrors(loadErrors);
        setStatus(loadErrors.length > 0 ? "partial" : "ready");
      } catch (error) {
        if (controller.signal.aborted) return;
        // Only AbortError is thrown by tryFetchJson; anything else here
        // is a true unexpected throw. Treat as a full failure.
        setResorts(bundledResorts);
        setSource("bundled");
        setErrors([
          {
            scope: "registry",
            url: baseUrl,
            message: `unexpected loader error: ${(error as Error).message}`,
          },
        ]);
        setStatus("bundled-fallback");
      }
    };

    loadRemoteResorts();
    return () => controller.abort();
  }, [baseUrl, retryToken]);

  const retry = useCallback(() => {
    setRetryToken((n) => n + 1);
  }, []);

  const value = useMemo<ResortDataContextValue>(() => {
    return {
      resorts,
      resortIndex: createResortIndex(resorts),
      source,
      status,
      errors,
      retry,
    };
  }, [resorts, source, status, errors, retry]);

  return <ResortDataContext.Provider value={value}>{children}</ResortDataContext.Provider>;
}

export function useResortData() {
  const context = useContext(ResortDataContext);
  if (!context) {
    throw new Error("useResortData must be used within ResortDataProvider");
  }
  return context;
}

export function useResortIndex() {
  return useResortData().resortIndex;
}

// Narrow hook for consumers that just want the load state.
export function useResortLoadStatus() {
  const { status, errors, retry, source } = useResortData();
  return { status, errors, retry, source };
}
