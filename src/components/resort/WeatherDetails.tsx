"use client";

import { FiSun, FiCloud, FiCloudRain, FiCloudSnow, FiCloudDrizzle, FiWind } from "react-icons/fi";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useWeather, WeatherFetchError } from "@/hooks/useWeather";
import { WeatherCondition, formatKstSlot } from "@/lib/weather/forecast";
import { strings } from "@/lib/i18n/strings";
import { useI18n } from "@/lib/i18n/context";
import { CurrentWeatherCard } from "./CurrentWeatherCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorWithRetry } from "@/components/ui/ErrorWithRetry";

type WeatherDetailsProps = {
  resortSlug: string;
  showFullLink?: boolean;
};

function iconForCondition(condition: WeatherCondition) {
  switch (condition) {
    case "clear":
      return FiSun;
    case "snow":
      return FiCloudSnow;
    case "rain":
      return FiCloudRain;
    case "mixed":
      return FiCloudDrizzle;
    case "cloudy":
    case "overcast":
      return FiCloud;
    default:
      return FiCloud;
  }
}

const FORECAST_PAGE_SIZE = 6;
const SNOW_MM_PER_CM = 10;

export function WeatherDetails({ resortSlug, showFullLink = true }: WeatherDetailsProps) {
  const { t } = useI18n();
  const {
    status: forecastStatus,
    data: forecastData,
    error: forecastError,
    reload: reloadForecast,
  } = useWeather(resortSlug, { mode: "forecast" });
  const {
    status: currentStatus,
    data: currentData,
    error: currentError,
    reload: reloadCurrent,
  } = useWeather(resortSlug, { mode: "now" });
  const [forecastPage, setForecastPage] = useState(0);

  const summary = currentData?.summary ?? forecastData?.summary;
  const hourlySlots = forecastData?.hourly ?? [];
  const hourlySlotCount = hourlySlots.length;
  const firstHourlyKey = hourlySlots[0]?.key;
  const totalForecastPages = Math.max(1, Math.ceil(hourlySlotCount / FORECAST_PAGE_SIZE));

  useEffect(() => {
    setForecastPage(0);
  }, [hourlySlotCount, firstHourlyKey]);

  useEffect(() => {
    if (forecastPage > totalForecastPages - 1) {
      setForecastPage(totalForecastPages - 1);
    }
  }, [forecastPage, totalForecastPages]);

  const currentForecastPage = Math.min(forecastPage, totalForecastPages - 1);
  const pagedForecastSlots = hourlySlots.slice(
    currentForecastPage * FORECAST_PAGE_SIZE,
    currentForecastPage * FORECAST_PAGE_SIZE + FORECAST_PAGE_SIZE
  );
  const SummaryIcon = iconForCondition(summary?.condition ?? "unknown");

  return (
    <div className="space-y-4">
      <CurrentWeatherCard resortSlug={resortSlug} variant="standard" />

      <>
        <div className="flex items-center justify-between px-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <span>{t(strings.resortPage.nearTermForecast)}</span>
          {showFullLink && (
            <Link
              to={`/resorts/${resortSlug}/weather`}
              className="inline-flex items-center gap-1 rounded-full border border-sky-200 px-3 py-1 text-[11px] font-semibold text-sky-700 hover:bg-sky-50 dark:border-sky-700 dark:text-sky-200 dark:hover:bg-sky-900/40"
            >
              {t(strings.resortPage.viewFullWeather)}
            </Link>
          )}
        </div>
        {forecastStatus === "idle" || forecastStatus === "loading" ? (
          <div className="space-y-2 rounded-xl border border-slate-200/70 bg-white/90 p-4 shadow-sm dark:border-slate-800/70 dark:bg-slate-900/70">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : forecastStatus === "error" || !forecastData ? (
          <ErrorWithRetry
            message={
              forecastError instanceof WeatherFetchError && forecastError.status === 503
                ? t(strings.resortPage.weatherUpdating)
                : forecastError?.message ?? t(strings.resortPage.weatherError)
            }
            retryLabel={t(strings.resortPage.retry)}
            onRetry={reloadForecast}
          />
        ) : (
          <>
            <div className="rounded-xl border border-slate-200/70 bg-white/90 shadow-sm dark:border-slate-800/70 dark:bg-slate-900/70 overflow-x-auto">
              <table className="min-w-full table-fixed text-sm">
                <thead className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="w-32 px-3 py-2 text-left">{t(strings.resortPage.time)}</th>
                    <th className="w-12 px-3 py-2 text-left"> </th>
                    <th className="w-24 px-3 py-2 text-left">{t(strings.resortPage.temperature)}</th>
                    <th className="w-24 px-3 py-2 text-left">{t(strings.resortPage.precipAmount)}</th>
                    <th className="w-24 px-3 py-2 text-left">{t(strings.resortPage.humidity)}</th>
                    <th className="w-32 px-3 py-2 text-left">{t(strings.resortPage.wind)}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {pagedForecastSlots.map((slot) => (
                    <tr key={slot.key}>
                      <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{formatForecastDateTime(slot)}</td>
                      <td className="px-3 py-2 text-slate-700 dark:text-slate-200">
                        <ConditionIcon condition={slot.condition} />
                      </td>
                      <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{formatNumber(slot.temperature, "°C")}</td>
                      <td className="px-3 py-2 text-slate-700 dark:text-slate-200">
                        {formatPrecip(slot, t)}
                      </td>
                      <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{slot.humidity !== undefined ? `${slot.humidity}%` : "—"}</td>
                      <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{slot.windSpeed !== undefined ? `${formatNumber(slot.windSpeed)} m/s` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalForecastPages > 1 && (
              <div className="mt-3 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                <button
                  type="button"
                  onClick={() => setForecastPage((value) => Math.max(0, value - 1))}
                  disabled={currentForecastPage === 0}
                  className="inline-flex items-center gap-1 rounded-full border border-slate-300/70 px-3 py-1 font-semibold disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-200"
                >
                  {t(strings.resortPage.forecastPrevPage)}
                </button>
                <span className="font-semibold">
                  {t(strings.resortPage.forecastPageLabel)} {currentForecastPage + 1} / {totalForecastPages}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setForecastPage((value) => Math.min(totalForecastPages - 1, value + 1))
                  }
                  disabled={currentForecastPage >= totalForecastPages - 1}
                  className="inline-flex items-center gap-1 rounded-full border border-slate-300/70 px-3 py-1 font-semibold disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-200"
                >
                  {t(strings.resortPage.forecastNextPage)}
                </button>
              </div>
            )}
          </>
        )}
      </>
    </div>
  );
}

function formatNumber(value: number | undefined, suffix = "") {
  if (value === undefined || value === null) return suffix ? `—` : "—";
  const display = Number.isInteger(value) ? `${value}` : value.toFixed(1);
  return suffix ? `${display}${suffix}` : display;
}

function formatPrecip(
  slot: {
    precipitation?: number;
    precipitationRain?: number;
    precipitationSnow?: number;
    precipitationProbability?: number;
    precipitationType?: number;
  },
  t: (text: any) => string
) {
  const parts: string[] = [];
  if (slot.precipitationSnow !== undefined) {
    parts.push(`${t(strings.resortPage.snow)} ${formatNumber(slot.precipitationSnow)} cm`);
  }
  if (slot.precipitationRain !== undefined) {
    parts.push(`${t(strings.resortPage.rain)} ${formatNumber(slot.precipitationRain)} mm`);
  }
  if (parts.length > 0) {
    const allZero = (slot.precipitationSnow ?? 0) === 0 && (slot.precipitationRain ?? 0) === 0;
    if (allZero) return "—";
    return parts.join(" · ");
  }
  if (slot.precipitation !== undefined) {
    if (slot.precipitationType === 3 || slot.precipitationType === 7) {
      if (slot.precipitationSnow !== undefined) {
        return `${t(strings.resortPage.snow)} ${formatNumber(slot.precipitationSnow)} cm`;
      }
      return slot.precipitation === 0 ? "—" : `${t(strings.resortPage.snow)} ${formatNumber(slot.precipitation / SNOW_MM_PER_CM)} cm`;
    }
    if (slot.precipitationType && slot.precipitationType > 0) {
      return slot.precipitation === 0 ? "—" : `${t(strings.resortPage.rain)} ${formatNumber(slot.precipitation)} mm`;
    }
    if (slot.precipitation === 0) return "—";
    return `${formatNumber(slot.precipitation)} mm`;
  }
  if (slot.precipitationProbability !== undefined) {
    return `${slot.precipitationProbability}%`;
  }
  return "—";
}

function formatForecastDateTime(slot: { date?: string; time?: string }) {
  if (!slot.date || slot.date.length !== 8 || !slot.time || slot.time.length < 4) {
    return formatKstSlot(slot as any);
  }
  const month = Number(slot.date.slice(4, 6));
  const day = Number(slot.date.slice(6, 8));
  const hour = slot.time.slice(0, 2);
  const minute = slot.time.slice(2, 4);
  return `${month}/${day} ${hour}:${minute}`;
}

function ConditionIcon({ condition }: { condition: WeatherCondition }) {
  const Icon = iconForCondition(condition);
  return <Icon className="h-4 w-4 text-slate-500 dark:text-slate-300" aria-label={condition} />;
}
