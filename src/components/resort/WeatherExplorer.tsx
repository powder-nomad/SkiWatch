"use client";

import { useState } from "react";
import { Link } from "react-router-dom";
import { FiArrowLeft, FiRefreshCcw } from "react-icons/fi";
import { WiDaySunny, WiDayCloudy, WiCloud, WiCloudy, WiRain, WiSnow, WiSleet, WiFog } from "react-icons/wi";
import type { IconType } from "react-icons";
import { useWeather } from "@/hooks/useWeather";
import { useWeatherHistory, type WeatherHistorySlot } from "@/hooks/useWeatherHistory";
import { useMidRange, type MidRangeDayPart, type MidRangeResult } from "@/hooks/useMidRange";
import { strings, formatTemplate } from "@/lib/i18n/strings";
import { useI18n } from "@/lib/i18n/context";
import { LocalizedText, getLocalizedText, type Locale } from "@/lib/i18n/locales";
import { type ForecastSlot } from "@/lib/weather/forecast";
import { formatNumber, cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorWithRetry } from "@/components/ui/ErrorWithRetry";

const SNOW_MM_PER_CM = 10;

type WeatherExplorerProps = {
  resortSlug: string;
  resortName: LocalizedText;
  showStandaloneHeader?: boolean;
};

export function WeatherExplorer({ resortSlug, resortName, showStandaloneHeader = true }: WeatherExplorerProps) {
  const { t, locale } = useI18n();
  const title = t(resortName);
  const history = useWeatherHistory(resortSlug, { hours: 48, mode: "now" });
  const forecast = useWeather(resortSlug, { mode: "forecast" });
  const midRange = useMidRange(resortSlug);
  const forecastBaseDate = forecast.data?.hourly?.[0]?.date;
  const historySlots = getRecentHistorySlots(history.data?.slots ?? []);
  const hourlySlots = forecast.data?.hourly ?? [];
  const upcoming48Slots = hourlySlots.slice(0, 48);
  const upcomingDigest = summarizeUpcoming48(upcoming48Slots);
  const historyTempRange = getTemperatureRange(history.data?.slots ?? []);
  const extendedDays = buildExtendedDays(midRange.data, forecast.data?.hourly ?? [], forecastBaseDate, locale)
    .filter((day) => day.dayOffset >= 1 && day.dayOffset <= 7);
  const segmentStats = buildSegmentStatsFromHourly(hourlySlots);
  const pastSixSlots = historySlots.slice(0, 6);
  const pastSixDisplay = [...pastSixSlots].reverse();
  const nextSixSlots = hourlySlots.slice(0, 6);
  const pastSixSeries = buildMiniSeriesFromHistory(pastSixDisplay, locale);
  const nextSixSeries = buildMiniSeriesFromForecast(nextSixSlots, locale);
  const sharedSixHourRange = getSharedTemperatureRange(pastSixSeries, nextSixSeries);

  return (
    <div className="space-y-8">
      {showStandaloneHeader && (
        <header className="space-y-3">
          <Link
            to={`/resorts/${resortSlug}`}
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300"
          >
            <FiArrowLeft className="h-4 w-4" aria-hidden />
            {t(strings.resortPage.backToResort)}
          </Link>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">{t(strings.resortPage.fullWeather)}</p>
            <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">{title}</h1>
          </div>
        </header>
      )}

      <section id="trend" className="rounded-2xl border border-slate-200/70 bg-white/90 p-5 shadow-sm dark:border-slate-800/70 dark:bg-slate-900/70">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{t(strings.resortPage.extendedForecast)}</p>
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{t(strings.resortPage.dailyTrend)}</h2>
          </div>
          <button
            type="button"
            onClick={midRange.reload}
            className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <FiRefreshCcw className="h-3.5 w-3.5" aria-hidden />
            {t(strings.resortPage.refresh)}
          </button>
        </div>
        {midRange.status === "loading" ? (
          <Skeleton className="mt-3 h-24 w-full" />
        ) : extendedDays.length < 2 ? (
          <ErrorWithRetry
            className="mt-3"
            message={midRange.error?.message ?? t(strings.resortPage.weatherError)}
            retryLabel={t(strings.resortPage.refresh)}
            onRetry={midRange.reload}
          />
        ) : (
          <>
            <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-start">
              <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300 w-full lg:w-32 lg:flex-none">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-6 rounded-full bg-[#f87171]" />
                  {t(strings.resortPage.maxTempLabel)}
                </span>
                <span className="flex items-center gap-2">
                  <span className="h-2 w-6 rounded-full bg-[#38bdf8]" />
                  {t(strings.resortPage.minTempLabel)}
                </span>
                <span className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded bg-gradient-to-b from-sky-300 to-sky-100" />
                  {t(strings.resortPage.rainChance)}
                </span>
                <span className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded bg-gradient-to-b from-purple-300 to-purple-100" />
                  {t(strings.resortPage.snowChance)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <TemperatureTrendChart
                  days={extendedDays}
                  locale={locale}
                  titleLabel={t(strings.resortPage.temperatureTrend)}
                  labels={{
                    max: t(strings.resortPage.maxTempLabel),
                    min: t(strings.resortPage.minTempLabel),
                    rain: t(strings.resortPage.rainChance),
                    snow: t(strings.resortPage.snowChance),
                  }}
                />
              </div>
            </div>
            <DailyStatTable
              days={extendedDays}
              locale={locale}
              segmentStats={segmentStats}
              labels={{
                condition: t(strings.resortPage.condition),
                precipChance: t(strings.resortPage.precipChance),
                precipTotal: t(strings.resortPage.precipitationTotal),
                wind: t(strings.resortPage.maxWind),
              }}
            />
          </>
        )}
      </section>

      <section id="six-hour" className="grid gap-6 lg:grid-cols-2">
        <SixHourChart
          title={t(strings.resortPage.past6h)}
          status={history.status}
          error={history.error?.message}
          points={pastSixSeries}
          onReload={history.reload}
          temperatureRange={sharedSixHourRange}
          labels={{
            refresh: t(strings.resortPage.refresh),
            loading: t(strings.resortPage.weatherLoading),
            error: t(strings.resortPage.weatherError),
            limited: t(strings.resortPage.limitedHourlyTemps),
          }}
        />
        <SixHourChart
          title={t(strings.resortPage.next6h)}
          status={forecast.status}
          error={forecast.error?.message}
          points={nextSixSeries}
          onReload={forecast.reload}
          temperatureRange={sharedSixHourRange}
          labels={{
            refresh: t(strings.resortPage.refresh),
            loading: t(strings.resortPage.weatherLoading),
            error: t(strings.resortPage.weatherError),
            limited: t(strings.resortPage.limitedHourlyTemps),
          }}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div id="past-48" className="space-y-3 rounded-2xl border border-slate-200/70 bg-white/90 p-5 shadow-sm dark:border-slate-800/70 dark:bg-slate-900/70">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
              {t(strings.resortPage.past48h)} · {t(strings.resortPage.historyMetrics)}
            </h2>
            <button
              type="button"
              onClick={history.reload}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <FiRefreshCcw className="h-3.5 w-3.5" aria-hidden />
              {t(strings.resortPage.refresh)}
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <MetricCard
              label={t(strings.resortPage.temperature)}
              value={`${formatNumber(historyTempRange?.min, "°C")} / ${formatNumber(historyTempRange?.max, "°C")}`}
              loading={history.status === "loading"}
            />
            <MetricCard
              label={t(strings.resortPage.snowTotal)}
              value={formatMetric(history.data?.metrics?.snowTotal, "cm")}
              loading={history.status === "loading"}
            />
            <MetricCard
              label={t(strings.resortPage.rainTotal)}
              value={formatMetric(history.data?.metrics?.rainTotal, "mm")}
              loading={history.status === "loading"}
            />
            <MetricCard
              label={t(strings.resortPage.maxWind)}
              value={history.data?.metrics?.maxWindSpeed !== undefined ? `${formatNumber(history.data.metrics.maxWindSpeed)} m/s` : "—"}
              loading={history.status === "loading"}
            />
          </div>
        </div>

        <div id="upcoming-48" className="space-y-4 rounded-2xl border border-slate-200/70 bg-white/90 p-5 shadow-sm dark:border-slate-800/70 dark:bg-slate-900/70">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{t(strings.resortPage.upcoming48Digest)}</h2>
            <button
              type="button"
              onClick={forecast.reload}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <FiRefreshCcw className="h-3.5 w-3.5" aria-hidden />
              {t(strings.resortPage.refresh)}
            </button>
          </div>
          {forecast.status === "loading" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : forecast.error || upcoming48Slots.length === 0 || !upcomingDigest ? (
            <ErrorWithRetry
              message={forecast.error?.message ?? t(strings.resortPage.weatherError)}
              retryLabel={t(strings.resortPage.refresh)}
              onRetry={forecast.reload}
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <MetricCard
                label={t(strings.resortPage.temperature)}
                value={`${formatNumber(upcomingDigest.minTemp, "°C")} / ${formatNumber(upcomingDigest.maxTemp, "°C")}`}
                loading={false}
              />
              <MetricCard
                label={t(strings.resortPage.snowTotal)}
                value={formatMetric(upcomingDigest.snowTotal, "cm")}
                loading={false}
              />
              <MetricCard
                label={t(strings.resortPage.rainTotal)}
                value={formatMetric(upcomingDigest.rainTotal, "mm")}
                loading={false}
              />
              <MetricCard
                label={t(strings.resortPage.maxWind)}
                value={upcomingDigest.maxWind !== undefined ? `${formatNumber(upcomingDigest.maxWind)} m/s` : "—"}
                loading={false}
              />
            </div>
          )}
        </div>
      </section>

      <section id="hourly" className="space-y-3 rounded-2xl border border-slate-200/70 bg-white/90 p-5 shadow-sm dark:border-slate-800/70 dark:bg-slate-900/70">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{t(strings.resortPage.hourlyDetails)}</h2>
          <span className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{t(strings.resortPage.upcoming48Digest)}</span>
        </div>
        {forecast.status === "loading" ? (
          <div className="space-y-2">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
          </div>
        ) : forecast.error || hourlySlots.length === 0 ? (
          <ErrorWithRetry
            message={forecast.error?.message ?? t(strings.resortPage.weatherError)}
            retryLabel={t(strings.resortPage.refresh)}
            onRetry={forecast.reload}
          />
        ) : (
          (() => {
            // Hide columns where every displayed row is empty. JMA forecast
            // slots only carry weather codes + (extended-only) POP, so the
            // KMA-shaped Temp/Precip/Humidity/Wind columns would all read
            // "—" across every row — wider empty space than information.
            const showTemp = hourlySlots.some((s) => s.temperature !== undefined);
            const showPrecip = hourlySlots.some((s) =>
              s.precipitation !== undefined
              || s.precipitationRain !== undefined
              || s.precipitationSnow !== undefined
              || s.precipitationProbability !== undefined,
            );
            const showHumidity = hourlySlots.some((s) => s.humidity !== undefined);
            const showWind = hourlySlots.some((s) => s.windSpeed !== undefined);
            return (
              <div className="max-h-96 overflow-y-auto">
                <table className="min-w-full table-fixed text-sm">
                  <thead className="sticky top-0 bg-white text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                    <tr>
                      <th className="w-32 px-4 py-2 text-left">{t(strings.resortPage.time)}</th>
                      <th className="w-32 px-4 py-2 text-left">{t(strings.resortPage.condition)}</th>
                      {showTemp && (
                        <th className="w-24 px-4 py-2 text-left">{t(strings.resortPage.temperature)}</th>
                      )}
                      {showPrecip && (
                        <th className="w-32 px-4 py-2 text-left">{t(strings.resortPage.precipAmount)}</th>
                      )}
                      {showHumidity && (
                        <th className="w-28 px-4 py-2 text-left">{t(strings.resortPage.humidity)}</th>
                      )}
                      {showWind && (
                        <th className="w-28 px-4 py-2 text-left">{t(strings.resortPage.wind)}</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {hourlySlots.map((slot) => (
                      <tr key={slot.key}>
                        <td className="px-4 py-2 text-slate-700 dark:text-slate-200">{formatForecastTimestamp(slot, locale)}</td>
                        <td className="px-4 py-2 text-slate-700 dark:text-slate-200">
                          <ConditionIcon
                            part={{
                              weather: t(strings.resortPage.conditions[slot.condition]),
                              precipitationChance: slot.precipitationProbability,
                            }}
                          />
                        </td>
                        {showTemp && (
                          <td className="px-4 py-2 text-slate-700 dark:text-slate-200">{formatNumber(slot.temperature, "°C")}</td>
                        )}
                        {showPrecip && (
                          <td className="px-4 py-2 text-slate-700 dark:text-slate-200">
                            {formatPrecipParts(slot, t)}
                          </td>
                        )}
                        {showHumidity && (
                          <td className="px-4 py-2 text-slate-700 dark:text-slate-200">{slot.humidity !== undefined ? `${slot.humidity}%` : "—"}</td>
                        )}
                        {showWind && (
                          <td className="px-4 py-2 text-slate-700 dark:text-slate-200">{slot.windSpeed !== undefined ? `${formatNumber(slot.windSpeed)} m/s` : "—"}</td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })()
        )}
      </section>
    </div>
  );
}

function MetricCard({ label, value, loading }: { label: string; value: string; loading: boolean }) {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white/90 p-4 shadow-sm dark:border-slate-800/70 dark:bg-slate-900/70">
      <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">{loading ? "…" : value}</p>
    </div>
  );
}

function formatMetric(value: number | undefined, unit: string) {
  if (value === undefined) return "—";
  return `${formatNumber(value)} ${unit}`;
}

type PrecipDisplaySlot = {
  precipitation?: number;
  precipitationRain?: number;
  precipitationSnow?: number;
  precipitationProbability?: number;
  precipitationType?: number;
};

function isSnowType(slot: PrecipDisplaySlot) {
  return slot.precipitationType === 3 || slot.precipitationType === 7;
}

function formatPrecipParts(slot: PrecipDisplaySlot, t: (text: any) => string) {
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
    if (isSnowType(slot)) {
      return slot.precipitation === 0 ? "—" : `${formatNumber(slot.precipitation)} cm`;
    }
    if (slot.precipitation === 0) return "—";
    return `${formatNumber(slot.precipitation)} mm`;
  }
  if (slot.precipitationProbability !== undefined) {
    return `${formatNumber(slot.precipitationProbability)}%`;
  }
  return "—";
}

function summarizeUpcoming48(slots: ForecastSlot[]) {
  if (!slots.length) {
    return undefined;
  }
  let precipitationTotal = 0;
  let snowTotal = 0;
  let rainTotal = 0;
  let minTemp: number | undefined;
  let maxTemp: number | undefined;
  let maxWind: number | undefined;
  let precipitationProbability: number | undefined;
  let humidityTotal = 0;
  let humidityCount = 0;

  slots.forEach((slot) => {
    if (slot.precipitationSnow !== undefined || slot.precipitationRain !== undefined) {
      if (slot.precipitationSnow !== undefined) {
        const value = Math.max(0, slot.precipitationSnow);
        snowTotal += value;
        precipitationTotal += value * SNOW_MM_PER_CM;
      }
      if (slot.precipitationRain !== undefined) {
        const value = Math.max(0, slot.precipitationRain);
        rainTotal += value;
        precipitationTotal += value;
      }
    } else if (slot.precipitation !== undefined) {
      const value = Math.max(0, slot.precipitation);
      if (slot.precipitationType === 3 || slot.precipitationType === 7) {
        snowTotal += value / SNOW_MM_PER_CM;
        precipitationTotal += value;
      } else {
        rainTotal += value;
        precipitationTotal += value;
      }
    }
    if (slot.temperature !== undefined) {
      minTemp = minTemp === undefined ? slot.temperature : Math.min(minTemp, slot.temperature);
      maxTemp = maxTemp === undefined ? slot.temperature : Math.max(maxTemp, slot.temperature);
    }
    if (slot.windSpeed !== undefined) {
      maxWind = maxWind === undefined ? slot.windSpeed : Math.max(maxWind, slot.windSpeed);
    }
    if (slot.precipitationProbability !== undefined) {
      precipitationProbability =
        precipitationProbability === undefined
          ? slot.precipitationProbability
          : Math.max(precipitationProbability, slot.precipitationProbability);
    }
    if (slot.humidity !== undefined) {
      humidityTotal += slot.humidity;
      humidityCount += 1;
    }
  });

  return {
    precipitationTotal,
    snowTotal,
    rainTotal,
    minTemp,
    maxTemp,
    maxWind,
    precipitationProbability,
    averageHumidity: humidityCount > 0 ? humidityTotal / humidityCount : undefined,
  };
}

function formatHistoryTimestamp(slot: WeatherHistorySlot, locale: Locale) {
  if (!slot.date || !slot.time) return "—";
  const iso = `${slot.date.slice(0, 4)}-${slot.date.slice(4, 6)}-${slot.date.slice(6, 8)}T${slot.time.slice(0, 2)}:${slot.time.slice(2, 4)}:00+09:00`;
  const d = new Date(iso);
  return `${formatMonthDay(d, locale)} ${slot.time.slice(0, 2)}:${slot.time.slice(2, 4)}`;
}

function formatForecastTimestamp(slot: ForecastSlot, locale: Locale) {
  if (!slot.date || !slot.time) {
    return "—";
  }
  const date = new Date(`${slot.date.slice(0, 4)}-${slot.date.slice(4, 6)}-${slot.date.slice(6, 8)}T00:00:00+09:00`);
  const hour = slot.time.slice(0, 2);
  const minute = slot.time.slice(2, 4);
  return `${formatMonthDay(date, locale)} ${hour}:${minute}`;
}

function getTemperatureRange(slots: Array<{ temperature?: number }>) {
  const temps = slots
    .map((slot) => slot.temperature)
    .filter((value): value is number => value !== undefined);
  if (!temps.length) return undefined;
  return {
    min: Math.min(...temps),
    max: Math.max(...temps),
  };
}

function getRecentHistorySlots(slots: WeatherHistorySlot[]) {
  return [...slots]
    .sort((a, b) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`))
    .slice(0, 24);
}

function buildExtendedDays(
  data: MidRangeResult | undefined,
  hourlySlots: ForecastSlot[] = [],
  forecastBaseDate?: string,
  locale: Locale = "ko"
) {
  const baseDate = data?.shortTerm?.baseDate ?? data?.land?.baseDate ?? data?.temperature?.baseDate ?? forecastBaseDate;
  const dayMap = new Map<number, {
    dayOffset: number;
    displayLabel: string;
    dateLabel?: string;
    isoDate?: string;
    am?: MidRangeDayPart;
    pm?: MidRangeDayPart;
    allDay?: MidRangeDayPart;
    min?: number;
    max?: number;
  }>();

  const ensureEntry = (offset: number) => {
    if (!dayMap.has(offset)) {
      dayMap.set(offset, {
        dayOffset: offset,
        displayLabel: formatTemplate(strings.resortPage.dayOffset, locale, { offset }),
        dateLabel: undefined,
        isoDate: undefined,
      });
    }
    return dayMap.get(offset)!;
  };

  data?.shortTerm?.days.forEach((day) => {
    const entry = ensureEntry(day.dayOffset);
    entry.dateLabel = formatShortDate(day.date, locale) ?? entry.dateLabel;
    entry.isoDate = day.date ?? entry.isoDate;
    entry.am = day.am ?? entry.am;
    entry.pm = day.pm ?? entry.pm;
    entry.min = day.min ?? entry.min;
    entry.max = day.max ?? entry.max;
  });

  data?.land?.days.forEach((day) => {
    const entry = ensureEntry(day.dayOffset);
    entry.dateLabel = entry.dateLabel ?? formatOffsetDate(baseDate, day.dayOffset, locale);
    entry.isoDate = entry.isoDate ?? formatOffsetIsoDate(baseDate, day.dayOffset);
    if (day.am) entry.am = day.am;
    if (day.pm) entry.pm = day.pm;
    if (day.allDay) entry.allDay = day.allDay;
  });
  data?.temperature?.days.forEach((day) => {
    const entry = ensureEntry(day.dayOffset);
    entry.dateLabel = entry.dateLabel ?? formatOffsetDate(baseDate, day.dayOffset, locale);
    entry.isoDate = entry.isoDate ?? formatOffsetIsoDate(baseDate, day.dayOffset);
    entry.min = day.min ?? entry.min;
    entry.max = day.max ?? entry.max;
  });

  // Fill gaps using hourly forecast when mid-range is missing (e.g., dayOffset 4).
  if (baseDate && baseDate.length === 8) {
    const base = parseDate(baseDate);
    if (base) {
      const byDate = new Map<string, ForecastSlot[]>();
      hourlySlots.forEach((slot) => {
        if (!slot.date || slot.temperature === undefined) return;
        const slotsForDate = byDate.get(slot.date) ?? [];
        slotsForDate.push(slot);
        byDate.set(slot.date, slotsForDate);
      });

      byDate.forEach((slots, date) => {
        const slotDate = parseDate(date);
        if (!slotDate) return;
        const offset = Math.round((slotDate.getTime() - base.getTime()) / (24 * 60 * 60 * 1000));
        // Only backfill near-term gaps (up to 4 days out).
        if (offset < 1 || offset > 4) return;
        const entry = ensureEntry(offset);
        entry.dateLabel = entry.dateLabel ?? formatShortDate(date, locale) ?? entry.dateLabel;
        entry.isoDate = entry.isoDate ?? date;
        const temps = slots
          .map((s) => s.temperature)
          .filter((v): v is number => v !== undefined);
        if (entry.min === undefined && temps.length) entry.min = Math.min(...temps);
        if (entry.max === undefined && temps.length) entry.max = Math.max(...temps);

        // Derive simple AM/PM parts from hourly slots to show precip and wind on the daily table.
        const amSlots = slots.filter((s) => s.time && Number(s.time.slice(0, 2)) < 12);
        const pmSlots = slots.filter((s) => s.time && Number(s.time.slice(0, 2)) >= 12);
        const derivePart = (subset: ForecastSlot[]): MidRangeDayPart | undefined => {
          if (!subset.length) return undefined;
          const precipChance = Math.max(
            ...subset
              .map((s) => s.precipitationProbability)
              .filter((v): v is number => v !== undefined),
            0
          );
          const condition = pickCondition(subset);
          return {
            weather: condition?.label,
            precipitationChance: precipChance > 0 ? precipChance : undefined,
          };
        };
        entry.am = entry.am ?? derivePart(amSlots);
        entry.pm = entry.pm ?? derivePart(pmSlots);
        if (!entry.am && !entry.pm && slots.length) {
          entry.allDay = entry.allDay ?? derivePart(slots);
        }
      });
    }
  }

  return Array.from(dayMap.values())
    .sort((a, b) => a.dayOffset - b.dayOffset)
    .map((day) => ({
      ...day,
      dateLabel: day.dateLabel ?? formatOffsetDate(baseDate, day.dayOffset, locale),
      isoDate: day.isoDate ?? formatOffsetIsoDate(baseDate, day.dayOffset),
    }));
}

function TemperatureTrendChart({
  days,
  locale,
  titleLabel,
  labels,
}: {
  days: Array<{ dayOffset: number; dateLabel?: string; min?: number; max?: number; am?: MidRangeDayPart; pm?: MidRangeDayPart; allDay?: MidRangeDayPart }>;
  locale: Locale;
  titleLabel: string;
  labels: { max: string; min: string; rain: string; snow: string };
}) {
  const entries = days.filter((day) => day.min !== undefined || day.max !== undefined);
  const [hover, setHover] = useState<{ x: number; y: number; label: string; value: number; type: "min" | "max" } | null>(null);
  if (entries.length < 2) {
    return null;
  }
  const temps = entries.flatMap((day) => [day.min, day.max].filter((v): v is number => v !== undefined));
  const minTemp = Math.min(...temps);
  const maxTemp = Math.max(...temps);
  const height = 260;
  const width = Math.max(520, entries.length * 120);
  const padding = 32;
  const innerHeight = height - padding * 2;
  const innerWidth = width - padding * 2;
  const toY = (value: number) => height - padding - ((value - minTemp) / Math.max(1, maxTemp - minTemp)) * innerHeight;
  const toX = (index: number) => padding + (innerWidth / Math.max(1, entries.length - 1)) * index;
  const zeroLineY = Math.min(height - padding, Math.max(padding, toY(0)));

  const maxPath = buildPath(entries.map((day, index) => (day.max !== undefined ? { x: toX(index), y: toY(day.max) } : null)));
  const minPath = buildPath(entries.map((day, index) => (day.min !== undefined ? { x: toX(index), y: toY(day.min) } : null)));

  return (
    <div className="relative" aria-label={titleLabel}>
      <div className="overflow-hidden">
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          role="presentation"
          preserveAspectRatio="xMidYMid meet"
          onMouseLeave={() => setHover(null)}
        >
          <defs>
            <linearGradient id="rainGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.1" />
            </linearGradient>
            <linearGradient id="snowGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#c084fc" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#c084fc" stopOpacity="0.1" />
            </linearGradient>
          </defs>
          {entries.map((day, index) => {
            const precip = detectPrecip(day);
            if (!precip) return null;
            const barWidth = 30;
            const barHeight = 40;
            const barX = toX(index) - barWidth / 2;
            const barY = height - barHeight - 8;
            return <rect key={`${day.dayOffset}-bar`} x={barX} y={barY} width={barWidth} height={barHeight} fill={precip === "snow" ? "url(#snowGradient)" : "url(#rainGradient)"} opacity={0.6} />;
          })}
          {maxPath && <path d={maxPath} fill="none" stroke="#f87171" strokeWidth={2} />}
          {minPath && <path d={minPath} fill="none" stroke="#38bdf8" strokeWidth={2} strokeDasharray="4 4" />}
          <line x1={padding} x2={width - padding} y1={zeroLineY} y2={zeroLineY} stroke="#cbd5f5" strokeWidth={1} strokeDasharray="4 4" />
          {entries.map((day, index) => (
            <g key={day.dayOffset}>
              {day.max !== undefined && (
                <circle
                  cx={toX(index)}
                  cy={toY(day.max)}
                  r={5}
                  fill="#f87171"
                  stroke="#fff"
                  strokeWidth={1}
                  onMouseEnter={() =>
                    setHover({
                      x: toX(index),
                      y: toY(day.max!),
                      label: day.dateLabel ?? formatTemplate(strings.resortPage.dayOffset, locale, { offset: day.dayOffset }),
                      value: day.max!,
                      type: "max",
                    })
                  }
                />
              )}
              {day.min !== undefined && (
                <circle
                  cx={toX(index)}
                  cy={toY(day.min)}
                  r={5}
                  fill="#38bdf8"
                  stroke="#fff"
                  strokeWidth={1}
                  onMouseEnter={() =>
                    setHover({
                      x: toX(index),
                      y: toY(day.min!),
                      label: day.dateLabel ?? formatTemplate(strings.resortPage.dayOffset, locale, { offset: day.dayOffset }),
                      value: day.min!,
                      type: "min",
                    })
                  }
                />
              )}
              <text x={toX(index)} y={height - 6} textAnchor="middle" className="fill-slate-500 text-[11px]">
                {day.dateLabel}
              </text>
            </g>
          ))}
        </svg>
      </div>
      {hover && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-3 rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-xs text-slate-700 shadow-md dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          style={{
            left: `${(hover.x / width) * 100}%`,
            top: `${(hover.y / height) * 100}%`,
          }}
        >
          <p className="font-semibold">{hover.label}</p>
          <p>
            {hover.type === "max" ? labels.max : labels.min} · {formatNumber(hover.value)}°C
          </p>
        </div>
      )}
    </div>
  );
}

function buildPath(points: Array<{ x: number; y: number } | null>) {
  let path = "";
  let started = false;
  points.forEach((point) => {
    if (!point) {
      started = false;
      return;
    }
    if (!started) {
      path += `M${point.x} ${point.y}`;
      started = true;
    } else {
      path += `L${point.x} ${point.y}`;
    }
  });
  return path || null;
}

function detectPrecip(day: { am?: MidRangeDayPart; pm?: MidRangeDayPart; allDay?: MidRangeDayPart }) {
  const text = [day.allDay?.weather, day.am?.weather, day.pm?.weather].filter(Boolean).join(" ").toLowerCase();
  if (!text) return undefined;
  if (text.includes("snow") || text.includes("눈") || text.includes("雪")) return "snow";
  if (text.includes("rain") || text.includes("비") || text.includes("雨")) return "rain";
  return undefined;
}

function pickCondition(slots: ForecastSlot[]) {
  if (!slots.length) return undefined;
  const counts = new Map<string, { label: string; condition: string; count: number }>();
  slots.forEach((slot) => {
    const key = slot.condition ?? "unknown";
    const label = slot.condition ?? "unknown";
    const entry = counts.get(key) ?? { label, condition: key, count: 0 };
    entry.count += 1;
    counts.set(key, entry);
  });
  let best: { label: string; condition: string; count: number } | undefined;
  counts.forEach((entry) => {
    if (!best || entry.count > best.count) {
      best = entry;
    }
  });
  return best;
}

type DaySegment = {
  key: string;
  label: string;
  part?: MidRangeDayPart;
};

type SegmentStats = {
  precipTotal?: number;
  maxWind?: number;
  precipProbability?: number;
};

type DailyStatTableProps = {
  days: ReturnType<typeof buildExtendedDays>;
  locale: Locale;
  labels: { condition: string; precipChance: string; precipTotal: string; wind: string };
  segmentStats?: Record<string, Record<string, SegmentStats>>;
};

function DailyStatTable({ days, locale, labels, segmentStats }: DailyStatTableProps) {
  if (!days.length) return null;

  const columns = days.map((day) => ({
    day,
    segments: buildDaySegments(day, locale),
  }));

  return (
    <div className="mt-6 overflow-x-auto">
      <table className="min-w-full table-fixed text-sm">
        <thead className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
          <tr>
            <th rowSpan={2} className="w-32 px-3 py-2 text-left" />
            {columns.map(({ day, segments }) => (
              <th key={day.dayOffset} colSpan={segments.length} className="px-3 py-2 text-left">
                {day.dateLabel}
              </th>
            ))}
          </tr>
          <tr>
            {columns.map(({ day, segments }) =>
              segments.map((segment) => (
                <th key={`${day.dayOffset}-${segment.key}`} className="px-3 py-1 text-center text-[11px] font-semibold">
                  {segment.label}
                </th>
              ))
            )}
          </tr>
        </thead>
        <tbody className="text-slate-700 dark:text-slate-200">
          <tr className="border-t border-slate-100 dark:border-slate-800">
            <td className="px-3 py-2 font-semibold text-slate-500 dark:text-slate-400">{labels.condition}</td>
            {columns.map(({ day, segments }) =>
              segments.map((segment) => (
                <td key={`${day.dayOffset}-${segment.key}-condition`} className="px-3 py-3 text-center">
                  <ConditionIcon part={segment.part} />
                </td>
              ))
            )}
          </tr>
          <tr className="border-t border-slate-100 dark:border-slate-800">
            <td className="px-3 py-2 font-semibold text-slate-500 dark:text-slate-400">{labels.precipChance}</td>
            {columns.map(({ day, segments }) =>
              segments.map((segment) => (
                <td key={`${day.dayOffset}-${segment.key}-prob`} className="px-3 py-2 text-center">
                  {formatSegmentPrecipChance(
                    segment.part,
                    getSegmentStats(segmentStats, day.isoDate, segment.key)?.precipProbability
                  )}
                </td>
              ))
            )}
          </tr>
          <tr className="border-t border-slate-100 dark:border-slate-800">
            <td className="px-3 py-2 font-semibold text-slate-500 dark:text-slate-400">{labels.precipTotal}</td>
            {columns.map(({ day, segments }) =>
              segments.map((segment) => (
                <td key={`${day.dayOffset}-${segment.key}-total`} className="px-3 py-2 text-center">
                  {formatPrecipTotal(getSegmentStats(segmentStats, day.isoDate, segment.key)?.precipTotal)}
                </td>
              ))
            )}
          </tr>
          <tr className="border-t border-slate-100 dark:border-slate-800">
            <td className="px-3 py-2 font-semibold text-slate-500 dark:text-slate-400">{labels.wind}</td>
            {columns.map(({ day, segments }) =>
              segments.map((segment) => (
                <td key={`${day.dayOffset}-${segment.key}-wind`} className="px-3 py-2 text-center">
                  {formatDailyStat(getSegmentStats(segmentStats, day.isoDate, segment.key)?.maxWind, " m/s")}
                </td>
              ))
            )}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function formatOffsetDate(baseDate: string | undefined, offset: number, locale: Locale) {
  if (!baseDate || baseDate.length !== 8) return formatTemplate(strings.resortPage.dayOffset, locale, { offset });
  const date = new Date(
    Number(baseDate.slice(0, 4)),
    Number(baseDate.slice(4, 6)) - 1,
    Number(baseDate.slice(6, 8))
  );
  date.setDate(date.getDate() + offset);
  return formatMonthDay(date, locale);
}

function formatOffsetIsoDate(baseDate: string | undefined, offset: number) {
  if (!baseDate || baseDate.length !== 8) return undefined;
  const date = new Date(
    Number(baseDate.slice(0, 4)),
    Number(baseDate.slice(4, 6)) - 1,
    Number(baseDate.slice(6, 8))
  );
  date.setDate(date.getDate() + offset);
  const year = date.getFullYear().toString().padStart(4, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return `${year}${month}${day}`;
}

function formatShortDate(value: string | undefined, locale: Locale) {
  if (!value || value.length !== 8) return undefined;
  const date = new Date(`${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T00:00:00+09:00`);
  return formatMonthDay(date, locale);
}

function parseDate(value?: string) {
  if (!value || value.length !== 8) return undefined;
  return new Date(`${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T00:00:00+09:00`);
}

function buildDaySegments(day: ReturnType<typeof buildExtendedDays>[number], locale: Locale): DaySegment[] {
  const segments: DaySegment[] = [];
  const hasAmPm = day.am || day.pm;
  if (hasAmPm) {
    if (day.am) {
      segments.push({ key: "am", label: getLocalizedText(strings.resortPage.periodAm, locale), part: day.am });
    }
    if (day.pm) {
      segments.push({ key: "pm", label: getLocalizedText(strings.resortPage.periodPm, locale), part: day.pm });
    }
  } else if (day.allDay) {
    segments.push({ key: "all", label: getLocalizedText(strings.resortPage.allDay, locale), part: day.allDay });
  } else {
    segments.push({ key: "day", label: "—" });
  }
  return segments;
}

type MiniSeriesPoint = {
  label: string;
  temperature?: number;
  precipitation?: number;
  precipitationUnit?: "mm" | "cm" | "%";
};

type MiniSeriesPrecip = {
  value?: number;
  unit?: "mm" | "cm" | "%";
};

function derivePrecipitationDisplay(args: {
  rain?: number;
  snow?: number;
  total?: number;
  probability?: number;
  precipitationType?: number;
}): MiniSeriesPrecip {
  const hasRain = args.rain !== undefined;
  const hasSnow = args.snow !== undefined;
  if (hasRain || hasSnow) {
    const rainValue = Math.max(0, args.rain ?? 0);
    const snowValue = Math.max(0, args.snow ?? 0);
    if (hasRain && hasSnow) {
      return { value: rainValue + snowValue * SNOW_MM_PER_CM, unit: "mm" };
    }
    if (hasSnow) return { value: snowValue, unit: "cm" };
    return { value: rainValue, unit: "mm" };
  }
  if (args.total !== undefined) {
    if (args.precipitationType === 3 || args.precipitationType === 7) {
      return { value: args.total / SNOW_MM_PER_CM, unit: "cm" };
    }
    return { value: args.total, unit: "mm" };
  }
  if (args.probability !== undefined) {
    return { value: args.probability, unit: "%" };
  }
  return { value: undefined, unit: undefined };
}

function buildMiniSeriesFromHistory(slots: WeatherHistorySlot[], locale: Locale): MiniSeriesPoint[] {
  return slots.map((slot) => {
    const precip = derivePrecipitationDisplay({
      rain: slot.precipitationRain,
      snow: slot.precipitationSnow,
      total: slot.precipitation,
      precipitationType: slot.precipitationType,
    });
    return {
      label: formatHistoryTimestamp(slot, locale),
      temperature: slot.temperature,
      precipitation: precip.value,
      precipitationUnit: precip.unit,
    };
  });
}

function buildMiniSeriesFromForecast(slots: ForecastSlot[], locale: Locale): MiniSeriesPoint[] {
  return slots.map((slot) => {
    const precip = derivePrecipitationDisplay({
      rain: slot.precipitationRain,
      snow: slot.precipitationSnow,
      total: slot.precipitation,
      probability: slot.precipitationProbability,
      precipitationType: slot.precipitationType,
    });
    return {
      label: formatForecastTimestamp(slot, locale),
      temperature: slot.temperature,
      precipitation: precip.value,
      precipitationUnit: precip.unit,
    };
  });
}

function getSharedTemperatureRange(...series: MiniSeriesPoint[][]) {
  const temps = series
    .flatMap((group) => group.map((point) => point.temperature))
    .filter((value): value is number => value !== undefined);
  if (!temps.length) {
    return undefined;
  }
  const min = Math.min(...temps, 0);
  const max = Math.max(...temps, 0);
  // Avoid zero-height ranges.
  if (min === max) {
    return { min: min - 1, max: max + 1 };
  }
  return { min, max };
}

function buildSegmentStatsFromHourly(slots: ForecastSlot[]) {
  type MutableStat = {
    precipTotal?: number;
    maxWind?: number;
    precipProbSum?: number;
    precipProbCount?: number;
  };
  const map = new Map<string, Map<string, MutableStat>>();

  const ensure = (date: string, key: string) => {
    const byDate = map.get(date) ?? new Map<string, MutableStat>();
    if (!map.has(date)) {
      map.set(date, byDate);
    }
    const entry = byDate.get(key) ?? { precipTotal: 0, maxWind: undefined, precipProbSum: 0, precipProbCount: 0 };
    if (!byDate.has(key)) {
      byDate.set(key, entry);
    }
    return entry;
  };

  slots.forEach((slot) => {
    if (!slot.date) return;
    const date = slot.date;
    const keys = [getTimeSegmentKey(slot.time), "all"];
    keys.forEach((key) => {
      const entry = ensure(date, key);
      if (slot.precipitationSnow !== undefined || slot.precipitationRain !== undefined) {
        const snow = Math.max(0, slot.precipitationSnow ?? 0);
        const rain = Math.max(0, slot.precipitationRain ?? 0);
        entry.precipTotal = (entry.precipTotal ?? 0) + rain + snow * SNOW_MM_PER_CM;
      } else if (slot.precipitation !== undefined) {
        const value = Math.max(0, slot.precipitation);
        entry.precipTotal =
          (entry.precipTotal ?? 0) +
          (slot.precipitationType === 3 || slot.precipitationType === 7 ? value : value);
      }
      if (slot.windSpeed !== undefined) {
        entry.maxWind = entry.maxWind === undefined ? slot.windSpeed : Math.max(entry.maxWind, slot.windSpeed);
      }
      if (slot.precipitationProbability !== undefined) {
        entry.precipProbSum = (entry.precipProbSum ?? 0) + slot.precipitationProbability;
        entry.precipProbCount = (entry.precipProbCount ?? 0) + 1;
      }
    });
  });

  const summary: Record<string, Record<string, SegmentStats>> = {};
  map.forEach((segments, date) => {
    summary[date] = {};
    segments.forEach((value, key) => {
      summary[date][key] = {
        precipTotal: value.precipTotal,
        maxWind: value.maxWind,
        precipProbability:
          value.precipProbCount && value.precipProbSum !== undefined
            ? value.precipProbSum / value.precipProbCount
            : undefined,
      };
    });
  });
  return summary;
}

function getTimeSegmentKey(time?: string) {
  if (!time || time.length < 2) {
    return "all";
  }
  const hour = Number(time.slice(0, 2));
  if (Number.isNaN(hour)) {
    return "all";
  }
  return hour < 12 ? "am" : "pm";
}

type SixHourChartProps = {
  title: string;
  status: string;
  error?: string;
  points: MiniSeriesPoint[];
  onReload: () => void;
  labels: { refresh: string; loading: string; error: string; limited?: string };
  temperatureRange?: { min: number; max: number };
};

function SixHourChart({ title, status, error, points, onReload, labels, temperatureRange }: SixHourChartProps) {
  const validPoints = points.filter((point) => point.temperature !== undefined);
  // JMA short-term forecast slots carry only weather codes (no temperature)
  // at 6h resolution, so a temp line chart can't render. That's a data-shape
  // difference, not a failure — show the slot labels with an informational
  // note rather than the error+retry state.
  const hasOnlyLabels = status !== "error" && points.length > 0 && validPoints.length === 0;
  const temps = validPoints.map((point) => point.temperature!);
  const localMin = temps.length ? Math.min(...temps) : undefined;
  const localMax = temps.length ? Math.max(...temps) : undefined;
  let min = temperatureRange?.min ?? localMin ?? 0;
  let max = temperatureRange?.max ?? localMax ?? 0;
  // Keep zero in range so the dashed line is meaningful.
  min = Math.min(min, 0);
  max = Math.max(max, 0);
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const width = Math.max(360, validPoints.length * 80);
  const height = 140;
  const padding = 20;
  const innerHeight = height - padding * 2;
  const innerWidth = width - padding * 2;
  const toX = (index: number) => padding + (innerWidth / Math.max(1, validPoints.length - 1)) * index;
  const toY = (value: number) => height - padding - ((value - (min ?? 0)) / Math.max(1, (max ?? 0) - (min ?? 0))) * innerHeight;
  const [hover, setHover] = useState<{ x: number; y: number; point: MiniSeriesPoint } | null>(null);
  const zeroLineY =
    min !== undefined && max !== undefined
      ? Math.min(height - padding, Math.max(padding, toY(0)))
      : height - padding;

  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white/90 p-5 shadow-sm dark:border-slate-800/70 dark:bg-slate-900/70">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{title}</h2>
        <button
          type="button"
          onClick={onReload}
          className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <FiRefreshCcw className="h-3.5 w-3.5" aria-hidden />
          {labels.refresh}
        </button>
      </div>
      {status === "loading" ? (
        <Skeleton className="mt-3 h-32 w-full" />
      ) : hasOnlyLabels ? (
        <div className="mt-3 space-y-2">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {labels.limited ?? labels.error}
          </p>
          <ul className="text-sm text-slate-700 dark:text-slate-200">
            {points.slice(0, 6).map((p, i) => (
              <li key={`${p.label}-${i}`} className="flex justify-between gap-3 py-1">
                <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{p.label}</span>
                <span className="truncate">
                  {p.precipitation !== undefined && p.precipitationUnit
                    ? `${formatNumber(p.precipitation, p.precipitationUnit)}`
                    : "—"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : status === "error" || !validPoints.length ? (
        <ErrorWithRetry
          className="mt-3"
          message={labels.error}
          retryLabel={labels.refresh}
          onRetry={onReload}
        />
      ) : (
        <>
          <div className="relative mt-3">
            <div className="overflow-hidden">
              <svg
                width="100%"
                height={height}
                viewBox={`0 0 ${width} ${height}`}
                role="presentation"
                preserveAspectRatio="xMidYMid meet"
                onMouseLeave={() => setHover(null)}
              >
                {validPoints.length > 1 && (
                  <polyline
                    fill="none"
                    stroke="#f97316"
                    strokeWidth={2}
                    points={validPoints.map((point, index) => `${toX(index)},${toY(point.temperature!)}`).join(" ")}
                  />
                )}
                <line
                  x1={padding}
                  x2={width - padding}
                  y1={zeroLineY}
                  y2={zeroLineY}
                  stroke="#cbd5f5"
                  strokeWidth={1}
                  strokeDasharray="4 4"
                />
                {validPoints.map((point, index) => (
                  <circle
                    key={point.label}
                    cx={toX(index)}
                    cy={toY(point.temperature!)}
                    r={4}
                    fill="#f97316"
                    stroke="#fff"
                    strokeWidth={1}
                    onMouseEnter={() => setHover({ x: toX(index), y: toY(point.temperature!), point })}
                    onFocus={() => setHover({ x: toX(index), y: toY(point.temperature!), point })}
                    onBlur={() => setHover(null)}
                  />
                ))}
                {max !== undefined && (
                  <text x={padding} y={padding} className="fill-slate-400 text-[10px]">
                    {`${Math.round(max)}°`}
                  </text>
                )}
                {min !== undefined && (
                  <text x={padding} y={height - padding / 2} className="fill-slate-400 text-[10px]">
                    {`${Math.round(min)}°`}
                  </text>
                )}
              </svg>
            </div>
            {hover && (
              <div
                className="pointer-events-none absolute -translate-x-1/2 -translate-y-3 rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-xs text-slate-700 shadow-md dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                style={{
                  left: `${(hover.x / width) * 100}%`,
                  top: `${(hover.y / height) * 100}%`,
                }}
              >
                <p className="font-semibold">{hover.point.label}</p>
                <p>{hover.point.temperature !== undefined ? `${formatNumber(hover.point.temperature)}°C` : "—"}</p>
                {hover.point.precipitation !== undefined && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-300">
                    {`${formatNumber(hover.point.precipitation)} ${hover.point.precipitationUnit ?? ""}`.trim()}
                  </p>
                )}
              </div>
            )}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300">
            {points.map((point) => (
              <div key={point.label} className="rounded-xl border border-slate-100 px-3 py-2 dark:border-slate-800">
                <p className="font-semibold text-slate-800 dark:text-slate-100">{point.label}</p>
                <p>{point.temperature !== undefined ? `${formatNumber(point.temperature)}°C` : "—"}</p>
                {point.precipitation !== undefined && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {`${formatNumber(point.precipitation)} ${point.precipitationUnit ?? ""}`.trim()}
                  </p>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// new helper definitions inserted below...

function formatDailyStat(value: number | undefined, suffix = "") {
  if (value === undefined) return "—";
  return suffix ? `${formatNumber(value)}${suffix}` : formatNumber(value);
}

function formatPrecipTotal(value: number | undefined) {
  if (value === undefined) return "—";
  return `${formatNumber(value)} mm`;
}

function getSegmentStats(
  stats: Record<string, Record<string, SegmentStats>> | undefined,
  isoDate?: string,
  key?: string
) {
  if (!isoDate || !stats) return undefined;
  const dayStats = stats[isoDate];
  if (!dayStats) return undefined;
  if (key && dayStats[key]) {
    return dayStats[key];
  }
  return dayStats.all;
}

function formatSegmentPrecipChance(part?: MidRangeDayPart, fallback?: number) {
  const value = part?.precipitationChance ?? (fallback !== undefined ? Math.round(fallback) : undefined);
  if (value === undefined) return "—";
  return `${value}%`;
}

export function ConditionIcon({ part, className }: { part?: MidRangeDayPart; className?: string }) {
  const { t } = useI18n();
  const { Icon, labelKey } = getConditionIcon(part?.weather);
  const displayLabel = t(strings.resortPage.conditions[labelKey]);
  return (
    <span className={cn("flex flex-col items-center gap-1 text-xs text-slate-600 dark:text-slate-300", className)}>
      <Icon
        className="h-7 w-7 text-slate-500 dark:text-slate-200"
        aria-label={displayLabel}
        role="img"
        focusable="false"
      />
      <span className="text-[11px] text-slate-500 dark:text-slate-400">{displayLabel ?? part?.weather ?? "—"}</span>
    </span>
  );
}

function getConditionIcon(weather?: string): { Icon: IconType; labelKey: keyof typeof strings.resortPage.conditions } {
  if (!weather) {
    return { Icon: WiCloud, labelKey: "unknown" };
  }
  const normalized = weather.toLowerCase();
  const rule =
    CONDITION_ICON_RULES.find((entry) => entry.test.test(normalized)) ??
    { icon: WiCloud, key: "unknown" as const };
  return { Icon: rule.icon, labelKey: rule.key };
}

const CONDITION_ICON_RULES: Array<{ test: RegExp; icon: IconType; key: keyof typeof strings.resortPage.conditions }> = [
  { test: /(비\/눈|진눈깨비|mixed|みぞれ|雨\/雪)/i, icon: WiSleet, key: "mixed" },
  { test: /(눈|snow|雪)/i, icon: WiSnow, key: "snow" },
  { test: /(비|rain|소나기|shower|雨)/i, icon: WiRain, key: "rain" },
  { test: /(맑|sun|clear|晴)/i, icon: WiDaySunny, key: "clear" },
  { test: /(흐림|overcast|曇)/i, icon: WiCloudy, key: "overcast" },
  { test: /(구름|cloud|くもり)/i, icon: WiDayCloudy, key: "cloudy" },
  { test: /(안개|fog|霧)/i, icon: WiFog, key: "unknown" },
];

function formatMonthDay(date: Date, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "ja" ? "ja-JP" : locale === "en" ? "en-US" : "ko-KR", {
    month: "numeric",
    day: "numeric",
    timeZone: "Asia/Seoul",
  }).format(date);
}
