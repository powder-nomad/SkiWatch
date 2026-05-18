import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import bundledResorts from "@/data/data";
import type { Resort } from "@/data/Util";
import { createResortIndex, type ResortIndex } from "@/lib/resortIndex";
import {
  DEFAULT_OPEN_SKI_DATA_BASE,
  loadResortsFromOpenSkiData,
} from "@/lib/openSkiData";

type ResortDataContextValue = {
  resorts: Resort[];
  resortIndex: ResortIndex;
  source: "bundled" | "remote";
};

const ResortDataContext = createContext<ResortDataContextValue | null>(null);

export function ResortDataProvider({ children }: { children: ReactNode }) {
  const [resorts, setResorts] = useState<Resort[]>(bundledResorts);
  const [source, setSource] = useState<"bundled" | "remote">("bundled");
  // `VITE_RESORT_DATA_URL` is now the open-ski-data BASE URL (the loader
  // walks ${base}/registry/...). Legacy single-JSON URLs are no longer
  // supported — if you need a different data source, point it at any
  // mirror that follows open-ski-data's registry layout.
  const baseUrl =
    (import.meta.env.VITE_RESORT_DATA_URL as string | undefined)?.trim() ||
    DEFAULT_OPEN_SKI_DATA_BASE;

  useEffect(() => {
    if (!baseUrl) {
      return;
    }

    const controller = new AbortController();

    const loadRemoteResorts = async () => {
      try {
        const nextResorts = await loadResortsFromOpenSkiData(baseUrl, controller.signal);
        if (!nextResorts || nextResorts.length === 0) {
          throw new Error("Remote resort data did not include any resorts");
        }
        setResorts(nextResorts);
        setSource("remote");
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        setResorts(bundledResorts);
        setSource("bundled");
      }
    };

    loadRemoteResorts();

    return () => controller.abort();
  }, [baseUrl]);

  const value = useMemo<ResortDataContextValue>(() => {
    return {
      resorts,
      resortIndex: createResortIndex(resorts),
      source,
    };
  }, [resorts, source]);

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
