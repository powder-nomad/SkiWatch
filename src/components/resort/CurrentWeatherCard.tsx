"use client";

import { useState } from "react";
import { FiRefreshCcw, FiWind } from "react-icons/fi";
import { useWeather, WeatherFetchError } from "@/hooks/useWeather";
import { conditionLabel } from "@/lib/weather/forecast";
import { strings } from "@/lib/i18n/strings";
import { useI18n } from "@/lib/i18n/context";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorWithRetry } from "@/components/ui/ErrorWithRetry";
import { formatRelative } from "@/lib/time/relative";
import { useNow } from "@/lib/time/useNow";
import { AirQualityPanel } from "./AirQualityPanel";

type CurrentWeatherCardProps = {
  resortSlug: string;
  variant?: "hero" | "standard";
};

export function CurrentWeatherCard({ resortSlug, variant = "standard" }: CurrentWeatherCardProps) {
  const { t, locale } = useI18n();
  const { status, data, error, reload } = useWeather(resortSlug, { mode: "now" });
  const [aqRefresh, setAqRefresh] = useState(0);
  const summary = data?.summary;
  // Tick once a minute so "Updated 2 min ago" stays current without
  // forcing the whole tree to re-render at 1 Hz.
  const now = useNow(60_000);

  const containerClass =
    variant === "hero"
      ? "flex h-full flex-col justify-between rounded-2xl border border-slate-200/70 bg-gradient-to-br from-slate-50 to-white p-4 shadow-sm dark:border-slate-700/70 dark:from-slate-900 dark:to-slate-950"
      : "rounded-2xl border border-slate-200/80 bg-gradient-to-br from-sky-50 to-white p-4 shadow-sm dark:border-slate-800/60 dark:from-slate-900 dark:to-slate-950";

  return (
    <div className={containerClass}>
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        {summary?.observedAt ? (
          <p className="text-[11px]" title={summary.observedAt}>
            {t(strings.resortPage.observedAt)}{" "}
            {formatRelative(summary.observedAt, locale, now)}
          </p>
        ) : (
          <p className="uppercase tracking-wide">{t(strings.resortPage.currentConditions)}</p>
        )}
        <button
          type="button"
          onClick={() => {
            reload();
            setAqRefresh((value) => value + 1);
          }}
          className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <FiRefreshCcw className="h-3 w-3" aria-hidden />
          {t(strings.resortPage.refresh)}
        </button>
      </div>

      {status === "loading" && !summary ? (
        <div className="mt-3 flex items-center gap-3">
          <Skeleton className="h-9 w-20" />
          <div className="flex-1 grid grid-cols-2 gap-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-3/5" />
          </div>
        </div>
      ) : summary ? (
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-slate-600 dark:text-slate-300 sm:flex sm:flex-wrap sm:items-center sm:gap-4">
          <div className="flex items-center gap-2">
            <p className="text-3xl font-semibold text-slate-900 dark:text-white">{formatNumber(summary.temperature, "°C")}</p>
            <div className="inline-flex items-center gap-1 text-sm text-slate-600 dark:text-slate-300">
              <span className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                {t(strings.resortPage.conditions[summary.condition])}
              </span>
            </div>
          </div>
          <div className="flex-1 grid grid-cols-2 gap-3">
            {summary.humidity !== undefined && (
              <div className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                <span>{t(strings.resortPage.humidity)}</span>
                <span className="font-semibold">{summary.humidity}%</span>
              </div>
            )}
            {summary.windSpeed !== undefined && (
              <div className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                {/* <FiWind className="h-4 w-4" aria-hidden /> */}
                <span>{t(strings.resortPage.wind)}</span>
                <span className="font-semibold">{formatNumber(summary.windSpeed)} m/s</span>
              </div>
            )}
            {summary.precipitationText && (
              <div className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">{summary.precipitationText}</div>
            )}
            <div className="col-span-2">
              <AirQualityPanel resortSlug={resortSlug} variant="compact" refreshToken={aqRefresh} />
            </div>
          </div>
        </div>
      ) : (
        <ErrorWithRetry
          className="mt-2"
          message={
            error instanceof WeatherFetchError && error.status === 503
              ? t(strings.resortPage.weatherUpdating)
              : error?.message ?? t(strings.resortPage.weatherError)
          }
          retryLabel={t(strings.resortPage.refresh)}
          onRetry={() => {
            reload();
            setAqRefresh((value) => value + 1);
          }}
        />
      )}
    </div>
  );
}

function formatNumber(value: number | undefined, suffix = "") {
  if (value === undefined || value === null) return "—";
  const display = Number.isInteger(value) ? `${value}` : value.toFixed(1);
  return suffix ? `${display}${suffix}` : display;
}
