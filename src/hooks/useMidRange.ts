"use client";

import { useCallback, useEffect, useState } from "react";
import { buildWeatherApiUrl, withWeatherApiHeaders } from "@/lib/api/weatherClient";

export type MidRangeDayPart = {
  weather?: string;
  precipitationChance?: number;
};

export type MidRangeDay = {
  dayOffset: number;
  date?: string;
  am?: MidRangeDayPart;
  pm?: MidRangeDayPart;
  allDay?: MidRangeDayPart;
  min?: number;
  minLow?: number;
  minHigh?: number;
  max?: number;
  maxLow?: number;
  maxHigh?: number;
};

export type MidRangeSummary = {
  baseDate?: string;
  baseTime?: string;
  tmFc?: string;
  regId?: string;
  days: MidRangeDay[];
};

export type MidRangeOverview = {
  stnId?: string;
  tmFc?: string;
  forecast: string;
};

export type MidRangeResult = {
  overview?: MidRangeOverview;
  land?: MidRangeSummary;
  temperature?: MidRangeSummary;
  shortTerm?: MidRangeSummary;
  tmFc?: string;
};

type MidRangeState = {
  status: "idle" | "loading" | "success" | "error";
  data?: MidRangeResult;
  error?: Error;
  reload: () => void;
};

type CachedEntry = {
  data: MidRangeResult;
  expiresAt: number;
  tmFc?: string;
};

const cache = new Map<string, CachedEntry>();
const inflight = new Map<string, Promise<MidRangeResult | undefined>>();

type RidgecastDailySummary = {
  date?: string;
  temp_min_c?: number | null;
  temp_max_c?: number | null;
  precip_total_mm?: number | null;
  snow_total_cm?: number | null;
  wind_max_mps?: number | null;
  weather_dominant?: string | null;
};

type RidgecastPeriodSummary = {
  date?: string;
  period?: "am" | "pm" | "overnight";
  valid_start?: string;
  valid_end?: string;
  temp_min_c?: number | null;
  temp_max_c?: number | null;
  precip_total_mm?: number | null;
  snow_total_cm?: number | null;
  weather_dominant?: string | null;
};

type RidgecastForecastPayload = {
  now?: string;
  issued?: { kma?: string | null; open_meteo?: string | null; jma?: string | null };
  summary?: {
    daily?: RidgecastDailySummary[];
    periods?: RidgecastPeriodSummary[];
  };
};

async function fetchMidRange(slug: string): Promise<MidRangeResult> {
  // 10-day horizon + AM/PM rollups give us what KMA's midrange used to.
  // `snow_events` is omitted — WeatherExplorer doesn't currently consume it.
  const url = buildWeatherApiUrl(`places/${slug}/forecast?horizon=10d&summary=daily,periods`);
  const response = await fetch(url, withWeatherApiHeaders({ cache: "no-store" }));
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || `Failed to load mid-range forecast (${response.status})`);
  }
  return normalize(await response.json());
}

function dayOffsetFor(now: Date, isoDate: string | undefined): number | undefined {
  if (!isoDate) return undefined;
  // SummaryDaily.date is local YYYY-MM-DD; compute calendar-day offset from now.
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return undefined;
  const target = Date.UTC(y, m - 1, d);
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((target - today) / (24 * 60 * 60 * 1000));
}

function probFromPrecipMm(precipMm: number | null | undefined): number | undefined {
  // Ridgecast's daily/period rollups don't carry pop directly. WeatherExplorer
  // only uses precipitationChance to decide an icon — coerce "non-zero accumulation"
  // into a chance band so the UI doesn't show flat zeros on rainy days.
  if (precipMm === undefined || precipMm === null) return undefined;
  if (precipMm <= 0) return 0;
  if (precipMm < 1) return 30;
  if (precipMm < 5) return 60;
  return 90;
}

function buildPart(entry: {
  weather_dominant?: string | null;
  precip_total_mm?: number | null;
}): MidRangeDayPart {
  return {
    weather: entry.weather_dominant ?? undefined,
    precipitationChance: probFromPrecipMm(entry.precip_total_mm),
  };
}

function normalize(payload: any): MidRangeResult {
  const data = payload as RidgecastForecastPayload;
  const now = data.now ? new Date(data.now) : new Date();
  const tmFc = data.issued?.kma ?? data.issued?.open_meteo ?? data.issued?.jma ?? undefined;
  const daily = Array.isArray(data.summary?.daily) ? (data.summary?.daily ?? []) : [];
  const periods = Array.isArray(data.summary?.periods) ? (data.summary?.periods ?? []) : [];

  // Index periods by date → {am, pm}
  const periodsByDate = new Map<string, { am?: MidRangeDayPart; pm?: MidRangeDayPart }>();
  for (const p of periods) {
    if (!p.date || (p.period !== "am" && p.period !== "pm")) continue;
    const slot = periodsByDate.get(p.date) ?? {};
    slot[p.period] = buildPart(p);
    periodsByDate.set(p.date, slot);
  }

  const days: MidRangeDay[] = daily.map((d) => {
    const offset = dayOffsetFor(now, d.date ?? undefined) ?? 0;
    const periodParts = d.date ? periodsByDate.get(d.date) : undefined;
    return {
      dayOffset: offset,
      date: d.date ?? undefined,
      am: periodParts?.am,
      pm: periodParts?.pm,
      allDay: periodParts ? undefined : buildPart(d),
      min: d.temp_min_c ?? undefined,
      max: d.temp_max_c ?? undefined,
    };
  });

  return {
    overview: tmFc ? { tmFc, forecast: "" } : undefined,
    // SkiWatch's land/temperature/shortTerm split is a KMA legacy. Ridgecast
    // emits a single rollup, so we publish the same days under each bucket
    // and let WeatherExplorer pick whichever it consumes.
    land: { tmFc, days },
    temperature: { tmFc, days },
    tmFc,
  };
}


export function useMidRange(resortSlug?: string): MidRangeState {
  const [status, setStatus] = useState<MidRangeState["status"]>(resortSlug ? "loading" : "idle");
  const [data, setData] = useState<MidRangeResult>();
  const [error, setError] = useState<Error>();
  const [nonce, setNonce] = useState(0);

  const fetchAndUpdate = useCallback(async (): Promise<MidRangeResult | undefined> => {
    if (!resortSlug) return undefined;
    const key = resortSlug;
    if (inflight.has(key)) {
      return inflight.get(key);
    }
    const promise = fetchMidRange(resortSlug)
      .then((result) => {
        cache.set(key, {
          data: result,
          expiresAt: Date.now() + 60 * 60 * 1000,
          tmFc: result.tmFc,
        });
        setData(result);
        setStatus("success");
        setError(undefined);
        return result;
      })
      .catch((err) => {
        setError(err instanceof Error ? err : new Error("Failed to load mid-range forecast"));
        setStatus("error");
        throw err;
      })
      .finally(() => {
        inflight.delete(key);
      });
    inflight.set(key, promise);
    return promise;
  }, [resortSlug]);

  useEffect(() => {
    if (!resortSlug) {
      setStatus("idle");
      setData(undefined);
      setError(undefined);
      return;
    }

    const cached = cache.get(resortSlug);
    if (cached && cached.expiresAt > Date.now()) {
      setData(cached.data);
      setStatus("success");
      setError(undefined);
      // Revalidate in background in case a new tmFc is available.
      fetchAndUpdate()
        .then((result) => {
          if (!result) return;
          if (cached.tmFc && result.tmFc && cached.tmFc === result.tmFc) {
            return;
          }
          setData(result);
        })
        .catch(() => {
          /* keep cached data */
        });
      return;
    }

    let cancelled = false;
    setStatus("loading");
    setError(undefined);

    fetchAndUpdate().catch(() => {
      if (cancelled) return;
      setStatus("error");
    });

    return () => {
      cancelled = true;
    };
  }, [resortSlug, nonce, fetchAndUpdate]);

  const reload = useCallback(() => {
    if (!resortSlug) return;
    cache.delete(resortSlug);
    inflight.delete(resortSlug);
    setNonce((value) => value + 1);
  }, [resortSlug]);

  return {
    status,
    data,
    error,
    reload,
  };
}
