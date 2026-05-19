import { useMemo } from "react";
import {
  WiDaySunny,
  WiCloud,
  WiCloudy,
  WiDayCloudy,
  WiRain,
  WiSnow,
  WiSleet,
} from "react-icons/wi";
import type { IconType } from "react-icons";
import { useWeather } from "@/hooks/useWeather";
import { useResortIndex } from "@/lib/resortData";
import { useI18n } from "@/lib/i18n/context";
import { strings } from "@/lib/i18n/strings";
import { formatNumber } from "@/lib/utils";
import type { ForecastSlot, WeatherCondition } from "@/lib/weather/forecast";
import { getLocalizedText } from "@/lib/i18n/locales";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorWithRetry } from "@/components/ui/ErrorWithRetry";

const CONDITION_ICON: Record<WeatherCondition, IconType> = {
  clear: WiDaySunny,
  cloudy: WiDayCloudy,
  overcast: WiCloudy,
  rain: WiRain,
  snow: WiSnow,
  mixed: WiSleet,
  unknown: WiCloud,
};

// A polished weather card for the dashboard. Hero current temp +
// condition icon at the top, an emphasized snow callout when there's
// upcoming snow in the next 48 h, and a four-up stats row underneath
// (temp range / snow / rain / max wind).
export function WeatherWidget({ resortSlug }: { resortSlug: string }) {
  const { t, locale } = useI18n();
  const index = useResortIndex();
  const now = useWeather(resortSlug, { mode: "now" });
  const forecast = useWeather(resortSlug, { mode: "forecast" });

  const entry = useMemo(() => index.findResortBySlug(resortSlug), [index, resortSlug]);
  const resortName = entry
    ? getLocalizedText(entry.resort.name, locale)
    : resortSlug;

  const hourlySlots = forecast.data?.hourly ?? [];
  const upcoming48Slots = hourlySlots.slice(0, 48);
  const upcomingDigest = useMemo(
    () => summarizeUpcoming48(upcoming48Slots),
    [upcoming48Slots],
  );

  const isLoading = forecast.status === "loading" || now.status === "loading";
  const isError = !upcomingDigest && forecast.status !== "loading";

  if (isLoading) {
    return (
      <div className="flex h-full w-full flex-col gap-3 bg-gradient-to-br from-sky-50 via-white to-slate-50 p-4 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950">
        <Skeleton className="h-4 w-28" />
        <div className="flex items-center gap-3">
          <Skeleton className="h-14 w-14 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-9 w-16" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
        <div className="mt-auto grid grid-cols-4 gap-1.5 pt-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-full w-full flex-col justify-center bg-gradient-to-br from-sky-50 via-white to-slate-50 p-4 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950">
        <ErrorWithRetry
          message={t(strings.resortPage.weatherError)}
          retryLabel={t(strings.resortPage.refresh)}
          onRetry={() => {
            forecast.reload();
            now.reload();
          }}
        />
      </div>
    );
  }

  const condition = now.data?.summary.condition ?? "unknown";
  const Icon = CONDITION_ICON[condition];
  const currentTemp = now.data?.summary.temperature;
  const conditionLabel = t(strings.resortPage.conditions[condition]);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-gradient-to-br from-sky-50 via-white to-slate-50 p-4 text-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 dark:text-slate-100">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            {t(strings.resortPage.weather)}
          </p>
          <p className="truncate text-sm font-semibold text-slate-700 dark:text-slate-200">
            {resortName}
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <Icon className="h-14 w-14 shrink-0 text-sky-500 dark:text-sky-300" aria-hidden />
        <div className="min-w-0">
          <p className="text-4xl font-semibold leading-none tracking-tight">
            {currentTemp !== undefined ? `${Math.round(currentTemp)}°` : "—"}
          </p>
          <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
            {conditionLabel}
          </p>
        </div>
      </div>

      {upcomingDigest && upcomingDigest.snowTotal >= 1 && (
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50/70 px-3 py-2 text-xs font-semibold text-sky-800 dark:border-sky-700/60 dark:bg-sky-900/30 dark:text-sky-100">
          <WiSnow className="h-5 w-5 shrink-0" aria-hidden />
          <span>
            {formatNumber(upcomingDigest.snowTotal)} cm{" "}
            <span className="font-normal opacity-80">snow next 48 h</span>
          </span>
        </div>
      )}

      <div className="mt-auto grid grid-cols-4 gap-1.5 pt-3">
        <StatChip
          label={t(strings.resortPage.temperature)}
          value={
            upcomingDigest
              ? `${formatNumber(upcomingDigest.minTemp, "°")}/${formatNumber(upcomingDigest.maxTemp, "°")}`
              : "—"
          }
        />
        <StatChip
          label={t(strings.resortPage.snowTotal)}
          value={
            upcomingDigest && upcomingDigest.snowTotal > 0
              ? `${formatNumber(upcomingDigest.snowTotal)} cm`
              : "—"
          }
        />
        <StatChip
          label={t(strings.resortPage.rainTotal)}
          value={
            upcomingDigest && upcomingDigest.rainTotal > 0
              ? `${formatNumber(upcomingDigest.rainTotal)} mm`
              : "—"
          }
        />
        <StatChip
          label={t(strings.resortPage.maxWind)}
          value={
            upcomingDigest && upcomingDigest.maxWind !== undefined
              ? `${formatNumber(upcomingDigest.maxWind)} m/s`
              : "—"
          }
        />
      </div>
    </div>
  );
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/70 px-2 py-1.5 text-center shadow-sm ring-1 ring-slate-200/70 dark:bg-slate-800/70 dark:ring-slate-700/60">
      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
        {label}
      </p>
      <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{value}</p>
    </div>
  );
}

function summarizeUpcoming48(slots: ForecastSlot[]) {
  if (!slots.length) return undefined;
  let snowTotal = 0;
  let rainTotal = 0;
  let minTemp: number | undefined;
  let maxTemp: number | undefined;
  let maxWind: number | undefined;

  slots.forEach((slot) => {
    if (slot.precipitationSnow !== undefined) snowTotal += Math.max(0, slot.precipitationSnow);
    if (slot.precipitationRain !== undefined) rainTotal += Math.max(0, slot.precipitationRain);

    if (
      slot.precipitation !== undefined &&
      slot.precipitationSnow === undefined &&
      slot.precipitationRain === undefined
    ) {
      if (slot.precipitationType === 3 || slot.precipitationType === 7) {
        snowTotal += Math.max(0, slot.precipitation) / 10;
      } else {
        rainTotal += Math.max(0, slot.precipitation);
      }
    }

    if (slot.temperature !== undefined) {
      if (minTemp === undefined || slot.temperature < minTemp) minTemp = slot.temperature;
      if (maxTemp === undefined || slot.temperature > maxTemp) maxTemp = slot.temperature;
    }
    if (slot.windSpeed !== undefined) {
      if (maxWind === undefined || slot.windSpeed > maxWind) maxWind = slot.windSpeed;
    }
  });

  return { snowTotal, rainTotal, minTemp, maxTemp, maxWind };
}
