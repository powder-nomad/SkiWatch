"use client";

import { useCallback, useEffect, useState } from "react";
import { buildWeatherApiUrl, withWeatherApiHeaders } from "@/lib/api/weatherClient";
import {
  parseRidgecastForecast,
  parseRidgecastWeather,
  WeatherResult,
} from "@/lib/weather/forecast";

type WeatherStatus = "idle" | "loading" | "success" | "error";

type WeatherOptions = {
  mode?: "forecast" | "now";
  enabled?: boolean;
  timeoutMs?: number;
};

type WeatherState = {
  status: WeatherStatus;
  data?: WeatherResult;
  error?: Error;
  reload: () => void;
};

export class WeatherFetchError extends Error {
  status?: number;
  payload?: unknown;

  constructor(message: string, options?: { status?: number; payload?: unknown }) {
    super(message);
    this.name = "WeatherFetchError";
    this.status = options?.status;
    this.payload = options?.payload;
  }
}

type CachedEntry = {
  data: WeatherResult;
  expiresAt: number;
};

const cache = new Map<string, CachedEntry>();
const inflight = new Map<string, Promise<WeatherResult>>();
const MAX_CONCURRENT = 3;
let activeFetches = 0;
const waitQueue: Array<() => void> = [];

function acquireSlot() {
  if (activeFetches < MAX_CONCURRENT) {
    activeFetches += 1;
    return Promise.resolve(() => releaseSlot());
  }
  return new Promise<() => void>((resolve) => {
    waitQueue.push(() => {
      activeFetches += 1;
      resolve(() => releaseSlot());
    });
  });
}

function releaseSlot() {
  activeFetches = Math.max(0, activeFetches - 1);
  const next = waitQueue.shift();
  if (next) {
    next();
  }
}

async function fetchWithTimeout(url: string, timeoutMs: number, init?: RequestInit) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal, ...init });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

function makeKey(slug: string, mode: "forecast" | "now") {
  return `${slug}:${mode}`;
}

function getNextSlotExpiration(now: Date = new Date()) {
  const next = new Date(now);
  const minutes = next.getMinutes();
  if (minutes < 15) {
    next.setMinutes(15, 0, 0);
  } else if (minutes < 45) {
    next.setMinutes(45, 0, 0);
  } else {
    next.setHours(next.getHours() + 1, 15, 0, 0);
  }

  if (next.getTime() <= now.getTime()) {
    next.setTime(now.getTime() + 30 * 60 * 1000);
  }
  return next.getTime();
}

function getCachedResult(key: string) {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt > Date.now()) {
    return entry.data;
  }
  cache.delete(key);
  return undefined;
}

async function fetchWeather(slug: string, mode: "forecast" | "now", timeoutMs: number) {
  const key = makeKey(slug, mode);
  const cached = getCachedResult(key);
  if (cached) {
    return cached;
  }
  if (inflight.has(key)) {
    return inflight.get(key)!;
  }

  // Ridgecast v2 routes — no query params, the server handles station/grid
  // mapping from the place_slug.
  const path = mode === "now" ? `places/${slug}/weather` : `places/${slug}/forecast`;
  const url = buildWeatherApiUrl(path);

  const promise = acquireSlot()
    .then(async (release) => {
      try {
        const response = await fetchWithTimeout(url, timeoutMs, withWeatherApiHeaders());
        if (!response.ok) {
          const text = await response.text();
          let payload: unknown = text;
          try {
            payload = text ? JSON.parse(text) : null;
          } catch {
            /* plain text */
          }
          const extractedMessage =
            typeof payload === "object" && payload && "detail" in payload
              ? String((payload as { detail?: string }).detail)
              : typeof payload === "object" && payload && "error" in payload
                ? String((payload as { error?: string }).error)
                : text;
          throw new WeatherFetchError(
            extractedMessage || `Weather request failed (${response.status})`,
            { status: response.status, payload }
          );
        }
        const json = await response.json();
        const parsed: WeatherResult =
          mode === "now" ? parseRidgecastWeather(json) : parseRidgecastForecast(json);

        cache.set(key, { data: parsed, expiresAt: getNextSlotExpiration() });
        return parsed;
      } finally {
        release();
        inflight.delete(key);
      }
    })
    .catch((error) => {
      inflight.delete(key);
      throw error;
    });

  inflight.set(key, promise);
  return promise;
}

export function useWeather(resortSlug?: string, options?: WeatherOptions): WeatherState {
  const mode = options?.mode ?? "forecast";
  const enabled = options?.enabled ?? true;
  const timeoutMs = options?.timeoutMs ?? 8000;
  const [status, setStatus] = useState<WeatherStatus>(resortSlug && enabled ? "loading" : "idle");
  const [data, setData] = useState<WeatherResult | undefined>();
  const [error, setError] = useState<Error | undefined>();
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!resortSlug || !enabled) {
      setStatus("idle");
      setData(undefined);
      setError(undefined);
      return;
    }

    let cancelled = false;
    setStatus("loading");
    setError(undefined);

    fetchWeather(resortSlug, mode, timeoutMs)
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setStatus("success");
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error("Failed to load weather"));
        setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [resortSlug, mode, enabled, timeoutMs, nonce]);

  const reload = useCallback(() => {
    if (!resortSlug) return;
    const key = makeKey(resortSlug, mode);
    cache.delete(key);
    inflight.delete(key);
    setNonce((value) => value + 1);
  }, [resortSlug, mode]);

  return {
    status,
    data,
    error,
    reload,
  };
}
