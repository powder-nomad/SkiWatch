"use client";

import { useCallback, useEffect, useState } from "react";
import { buildWeatherApiUrl, withWeatherApiHeaders } from "@/lib/api/weatherClient";
import {
  RIDGECAST_PRECIP_TYPE_MAP,
  RIDGECAST_SKY_MAP,
  ridgecastCondition,
  ridgecastDateTimeParts,
} from "@/lib/weather/forecast";

type HistoryMode = "now" | "forecast";

export type WeatherHistorySlot = {
  date: string;
  time: string;
  temperature?: number;
  precipitationType?: number;
  precipitationProbability?: number;
  precipitation?: number;
  precipitationRain?: number;
  precipitationSnow?: number;
  humidity?: number;
  sky?: number;
  windSpeed?: number;
  condition?: string;
  mode: HistoryMode;
};

export type WeatherHistoryMetrics = {
  precipitationTotal?: number;
  snowTotal?: number;
  rainTotal?: number;
  maxWindSpeed?: number;
};

export type WeatherHistoryResult = {
  mode: HistoryMode;
  hours: number;
  metrics?: WeatherHistoryMetrics;
  slots: WeatherHistorySlot[];
};

type WeatherHistoryState = {
  status: "idle" | "loading" | "success" | "error";
  data?: WeatherHistoryResult;
  error?: Error;
  reload: () => void;
};

type CachedEntry = {
  data: WeatherHistoryResult;
  expiresAt: number;
};

type Options = {
  hours?: number;
  mode?: HistoryMode;
  enabled?: boolean;
  cacheMs?: number;
};

const cache = new Map<string, CachedEntry>();
const SNOW_MM_PER_CM = 10;

function makeKey(slug: string, mode: HistoryMode, hours: number) {
  return `${slug}:${mode}:${hours}`;
}

type RidgecastObservationEntry = {
  observed_at?: string;
  temp_c?: number | null;
  humidity_pct?: number | null;
  wind_mps?: number | null;
  wind_gust_mps?: number | null;
  precip_mm_1h?: number | null;
  precip_type?: string | null;
  snow_cm_1h?: number | null;
  weather?: string | null;
};

async function fetchHistory(slug: string, mode: HistoryMode, hours: number): Promise<WeatherHistoryResult> {
  // Ridgecast v1 paginates observations newest-first via `limit`; SkiWatch's
  // `hours` window maps 1:1 since rows are hourly. Capped at the server's max.
  const limit = Math.min(Math.max(hours, 1), 500);
  const url = buildWeatherApiUrl(`places/${slug}/observations?limit=${limit}`);
  const response = await fetch(url, withWeatherApiHeaders({ cache: "no-store" }));
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || `Failed to load weather history (${response.status})`);
  }
  const json = await response.json();
  const entries: RidgecastObservationEntry[] = Array.isArray(json.observations) ? json.observations : [];

  const slots: WeatherHistorySlot[] = entries.map((entry) => {
    const { date, time } = ridgecastDateTimeParts(entry.observed_at ?? undefined);
    const precipType = entry.precip_type ? RIDGECAST_PRECIP_TYPE_MAP[entry.precip_type] : undefined;
    const precipMm = entry.precip_mm_1h ?? undefined;
    const snowCm = entry.snow_cm_1h ?? undefined;
    // Ridgecast tracks rain and snow separately on the same row. Derive
    // rain accumulation by subtracting snow's water-equivalent — keeps
    // WeatherWidget's existing "rain vs snow" breakdown working without
    // needing a server change.
    const precipRain =
      precipMm !== undefined && snowCm !== undefined
        ? Math.max(0, precipMm - snowCm * SNOW_MM_PER_CM)
        : undefined;
    return {
      date,
      time,
      temperature: entry.temp_c ?? undefined,
      precipitationType: precipType,
      precipitationProbability: undefined, // observations are realized, not probabilistic
      precipitation: precipMm,
      precipitationRain: precipRain,
      precipitationSnow: snowCm,
      humidity: entry.humidity_pct ?? undefined,
      sky: entry.weather ? RIDGECAST_SKY_MAP[entry.weather] : undefined,
      windSpeed: entry.wind_mps ?? undefined,
      condition: ridgecastCondition(entry.weather ?? undefined),
      mode,
    };
  });

  // Compute window metrics on the fly. Ridgecast doesn't return an
  // aggregate block — the rider indices it does carry aren't equivalent.
  let precipitationTotal = 0;
  let snowTotal = 0;
  let maxWindSpeed = 0;
  for (const s of slots) {
    if (typeof s.precipitation === "number") precipitationTotal += s.precipitation;
    if (typeof s.precipitationSnow === "number") snowTotal += s.precipitationSnow;
    if (typeof s.windSpeed === "number" && s.windSpeed > maxWindSpeed) maxWindSpeed = s.windSpeed;
  }
  const rainTotal = Math.max(0, precipitationTotal - snowTotal * SNOW_MM_PER_CM);

  return {
    mode,
    hours,
    metrics: { precipitationTotal, snowTotal, rainTotal, maxWindSpeed },
    // Newest-first → oldest-first for chart-friendliness (consumers expect
    // chronological order). Server returns desc; reverse keeps O(n).
    slots: slots.reverse(),
  };
}

export function useWeatherHistory(resortSlug?: string, options?: Options): WeatherHistoryState {
  const hours = options?.hours ?? 48;
  const mode = options?.mode ?? "now";
  const enabled = options?.enabled ?? true;
  const cacheMs = options?.cacheMs ?? 5 * 60 * 1000;
  const [status, setStatus] = useState<WeatherHistoryState["status"]>(resortSlug && enabled ? "loading" : "idle");
  const [data, setData] = useState<WeatherHistoryResult>();
  const [error, setError] = useState<Error>();
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!resortSlug || !enabled) {
      setStatus("idle");
      setData(undefined);
      setError(undefined);
      return;
    }

    const key = makeKey(resortSlug, mode, hours);
    const cached = cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      setData(cached.data);
      setStatus("success");
      return;
    }

    let cancelled = false;
    setStatus("loading");
    setError(undefined);

    fetchHistory(resortSlug, mode, hours)
      .then((result) => {
        if (cancelled) return;
        cache.set(key, { data: result, expiresAt: Date.now() + cacheMs });
        setData(result);
        setStatus("success");
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error("Failed to load history"));
        setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [resortSlug, mode, hours, enabled, cacheMs, nonce]);

  const reload = useCallback(() => {
    if (!resortSlug) return;
    cache.delete(makeKey(resortSlug, mode, hours));
    setNonce((value) => value + 1);
  }, [resortSlug, mode, hours]);

  return {
    status,
    data,
    error,
    reload,
  };
}
