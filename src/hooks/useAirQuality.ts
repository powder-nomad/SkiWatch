"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchWeatherApi } from "@/lib/api/weatherClient";

export type AirQualityDailyBulletin = {
  dataTime?: string;
  forecastDate?: string;
  gradeForResort?: string;
  summary?: {
    informCode?: string;
    informData?: string;
    informOverall?: string;
    informCause?: string;
    actionKnack?: string;
    images?: string[];
    regionGrades?: Record<string, string>;
  };
};

export type AirQualityWeeklyForecast = {
  label?: string;
  date?: string;
  gradeForResort?: string;
  reliability?: string;
  };

export type AirQualityWeeklyBulletin = {
  dataTime?: string;
  forecastDate?: string;
  summary?: {
    presentationDate?: string;
    outlook?: string;
    forecasts?: AirQualityWeeklyForecast[];
  };
};

export type AirQualityResult = {
  resort?: { slug: string; name: string };
  daily?: {
    pm10?: AirQualityDailyBulletin | null;
    pm25?: AirQualityDailyBulletin | null;
  };
  weekly?: AirQualityWeeklyBulletin | null;
};

type Status = "idle" | "loading" | "success" | "error";

type CachedEntry = {
  data: AirQualityResult;
  expiresAt: number;
};

const cache = new Map<string, CachedEntry>();

// Ridgecast v0.4.1 air-quality response shape (subset we use).
type RidgecastAirQuality = {
  place_slug: string;
  station?: string;
  observed_at?: string;
  fetched_at?: string;
  pm10_ugm3?: number | null;
  pm25_ugm3?: number | null;
  khai_value?: number | null;
  khai_grade?: number | null; // 1=Good, 2=Moderate, 3=Bad, 4=Very Bad (KR MoE)
};

// Map KHAI 1..4 to a localized grade key the existing AirQualityPanel
// matches via regex (`/(좋|good)/i`, `/(보통|moderate)/i`, etc.).
function khaiGradeLabel(grade?: number | null): string | undefined {
  switch (grade) {
    case 1:
      return "좋음 / Good";
    case 2:
      return "보통 / Moderate";
    case 3:
      return "나쁨 / Bad";
    case 4:
      return "매우 나쁨 / Very Bad";
    default:
      return undefined;
  }
}

// PM2.5 individual grade (KR MoE thresholds, µg/m³):
//   ≤15 Good · 16–35 Moderate · 36–75 Bad · >75 Very Bad.
function pm25Label(v?: number | null): string | undefined {
  if (v == null) return undefined;
  if (v <= 15) return "좋음 / Good";
  if (v <= 35) return "보통 / Moderate";
  if (v <= 75) return "나쁨 / Bad";
  return "매우 나쁨 / Very Bad";
}

// PM10 individual grade (KR MoE thresholds, µg/m³):
//   ≤30 Good · 31–80 Moderate · 81–150 Bad · >150 Very Bad.
function pm10Label(v?: number | null): string | undefined {
  if (v == null) return undefined;
  if (v <= 30) return "좋음 / Good";
  if (v <= 80) return "보통 / Moderate";
  if (v <= 150) return "나쁨 / Bad";
  return "매우 나쁨 / Very Bad";
}

function adaptResponse(slug: string, raw: RidgecastAirQuality): AirQualityResult {
  // Derive per-pollutant grades from concentration when present; fall back
  // to the KHAI composite grade so the badge still renders something
  // useful when only KHAI is published.
  const compositeLabel = khaiGradeLabel(raw.khai_grade);
  const pm25Grade = pm25Label(raw.pm25_ugm3) ?? compositeLabel;
  const pm10Grade = pm10Label(raw.pm10_ugm3) ?? compositeLabel;
  const dataTime = raw.observed_at ?? raw.fetched_at;
  return {
    resort: { slug, name: slug },
    daily: {
      pm25: pm25Grade ? { dataTime, gradeForResort: pm25Grade } : null,
      pm10: pm10Grade ? { dataTime, gradeForResort: pm10Grade } : null,
    },
    weekly: null,
  };
}

export function useAirQuality(resortSlug?: string, options?: { enabled?: boolean; cacheMs?: number }) {
  const enabled = options?.enabled ?? true;
  const cacheMs = options?.cacheMs ?? 10 * 60 * 1000;
  const [status, setStatus] = useState<Status>(resortSlug && enabled ? "loading" : "idle");
  const [data, setData] = useState<AirQualityResult>();
  const [error, setError] = useState<Error>();
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!resortSlug || !enabled) {
      setStatus("idle");
      setData(undefined);
      setError(undefined);
      return;
    }

    const cached = cache.get(resortSlug);
    if (cached && cached.expiresAt > Date.now()) {
      setData(cached.data);
      setStatus("success");
      return;
    }

    let cancelled = false;
    setStatus("loading");
    setError(undefined);

    fetchWeatherApi(`places/${resortSlug}/air-quality`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          const text = await response.text().catch(() => "");
          throw new Error(text || `Failed to load air quality (${response.status})`);
        }
        const raw = (await response.json()) as RidgecastAirQuality;
        return adaptResponse(resortSlug, raw);
      })
      .then((payload) => {
        if (cancelled) return;
        cache.set(resortSlug, { data: payload, expiresAt: Date.now() + cacheMs });
        setData(payload);
        setStatus("success");
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error("Failed to load air quality"));
        setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [resortSlug, enabled, cacheMs, nonce]);

  const reload = useCallback(() => {
    if (!resortSlug) return;
    cache.delete(resortSlug);
    setNonce((value) => value + 1);
  }, [resortSlug]);

  return { status, data, error, reload };
}
