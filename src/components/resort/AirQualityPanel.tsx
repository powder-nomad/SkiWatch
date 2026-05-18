"use client";

import { useEffect, useState } from "react";
import { FiRefreshCcw } from "react-icons/fi";
import { useAirQuality } from "@/hooks/useAirQuality";
import { useI18n } from "@/lib/i18n/context";
import { strings } from "@/lib/i18n/strings";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorWithRetry } from "@/components/ui/ErrorWithRetry";

type AirQualityPanelProps = {
  resortSlug: string;
  variant?: "full" | "compact";
  refreshToken?: number;
};

export function AirQualityPanel({ resortSlug, variant = "full", refreshToken }: AirQualityPanelProps) {
  const { t } = useI18n();
  const { status, data, error, reload } = useAirQuality(resortSlug);
  const [lastRefresh, setLastRefresh] = useState(refreshToken);

  const pm25 = data?.daily?.pm25 ?? null;
  const pm10 = data?.daily?.pm10 ?? null;
  const weekly = data?.weekly?.summary;
  const updated =
    pm25?.dataTime ??
    pm10?.dataTime ??
    weekly?.presentationDate ??
    data?.weekly?.dataTime;

  const isLoading = status === "loading";
  const hasError = status === "error" || !data;

  useEffect(() => {
    if (refreshToken !== undefined && refreshToken !== lastRefresh) {
      setLastRefresh(refreshToken);
      reload();
    }
  }, [refreshToken, lastRefresh, reload]);

  if (variant === "compact") {
    if (isLoading) {
      return (
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          {t(strings.resortPage.weatherLoading)}
        </div>
      );
    }
    if (hasError) {
      return (
        <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-200">
          {t(strings.resortPage.airQuality.noData)}
        </div>
      );
    }

    return (
      <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-300">
        <div className="flex-1">
          <InlineStat
            label={t(strings.resortPage.airQuality.pm25)}
            value={translateGrade(pm25?.gradeForResort, t)}
          />
        </div>
        <div className="flex-1">
          <InlineStat
            label={t(strings.resortPage.airQuality.pm10)}
            value={translateGrade(pm10?.gradeForResort, t)}
          />
        </div>
        {/* {updated && <span className="text-[11px] text-slate-400 dark:text-slate-500">{updated}</span>} */}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/70">
      <div className="flex items-center gap-2">
        <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{t(strings.resortPage.airQuality.title)}</p>
        {updated && <span className="text-[11px] text-slate-400">{t(strings.resortPage.airQuality.updated)} {updated}</span>}
      </div>

      {isLoading ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : hasError ? (
        <ErrorWithRetry
          className="mt-2"
          message={error?.message ?? t(strings.resortPage.airQuality.noData)}
          retryLabel={t(strings.resortPage.refresh)}
          onRetry={reload}
        />
      ) : (
        <div className="mt-3 space-y-3 text-sm text-slate-700 dark:text-slate-200">
          <div className="grid gap-2 sm:grid-cols-2">
            <BulletinBadge label={t(strings.resortPage.airQuality.pm25)} grade={pm25?.gradeForResort} forecastDate={pm25?.forecastDate ?? pm25?.summary?.informData} />
            <BulletinBadge label={t(strings.resortPage.airQuality.pm10)} grade={pm10?.gradeForResort} forecastDate={pm10?.forecastDate ?? pm10?.summary?.informData} />
          </div>

          {pm25?.summary?.informOverall && (
            <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">{pm25.summary.informOverall}</p>
          )}

          {weekly && weekly.forecasts && weekly.forecasts.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {t(strings.resortPage.airQuality.weekly)}
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {weekly.forecasts.map((forecast) => (
                  <WeeklyChip key={`${forecast.date}-${forecast.label}`} forecast={forecast} />
                ))}
              </div>
              {weekly.outlook && (
                <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">{weekly.outlook}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function BulletinBadge({ label, grade, forecastDate }: { label: string; grade?: string; forecastDate?: string }) {
  const { t } = useI18n();
  const displayGrade = translateGrade(grade, t);
  const gradeClass = colorForGrade(displayGrade ?? "");
  const dateLabel = forecastDate ? formatDate(forecastDate) : undefined;
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-200/70 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/60">
      <div>
        <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
        {dateLabel && <p className="text-[11px] text-slate-400 dark:text-slate-500">{dateLabel}</p>}
      </div>
      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${gradeClass}`}>{displayGrade}</span>
    </div>
  );
}

function WeeklyChip({ forecast }: { forecast: { date?: string; label?: string; gradeForResort?: string } }) {
  const { t } = useI18n();
  const translatedGrade = translateGrade(forecast.gradeForResort, t);
  const gradeClass = colorForGrade(translatedGrade ?? "");
  const dateLabel = forecast.date ? formatDate(forecast.date) : forecast.label ?? "";
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-200/70 bg-slate-50 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800/60">
      <span className="font-semibold text-slate-600 dark:text-slate-200">{dateLabel}</span>
      <span className={`rounded-full px-2 py-0.5 font-semibold ${gradeClass}`}>{translatedGrade ?? "—"}</span>
    </div>
  );
}

function Chip({ label, grade }: { label: string; grade?: string }) {
  const gradeClass = colorForGrade(grade ?? "");
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 font-semibold ${gradeClass}`}>
      <span>{label}</span>
      <span>{translateGrade(grade, useI18n().t) ?? "—"}</span>
    </span>
  );
}

function InlineStat({ label, value }: { label: string; value?: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="text-slate-500 dark:text-slate-400 whitespace-nowrap">{label}</span>
      <span className="font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">{value ?? "—"}</span>
    </span>
  );
}

function formatDate(date: string) {
  const digits = date.replace(/[^0-9]/g, "");
  if (digits.length !== 8) return date;
  const month = digits.slice(4, 6);
  const day = digits.slice(6, 8);
  return `${month}/${day}`;
}

function colorForGrade(grade: string) {
  const lower = grade.toLowerCase();
  if (/(좋|good)/.test(lower)) return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200";
  if (/(보통|moderate|normal)/.test(lower)) return "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-100";
  if (/(나쁨|bad|poor)/.test(lower)) {
    if (/(매우|very)/.test(lower)) {
      return "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-100";
    }
    return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-100";
  }
  return "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200";
}

function translateGrade(grade: string | undefined, t: ReturnType<typeof useI18n>["t"]) {
  if (!grade) return undefined;
  const lower = grade.toLowerCase();
  if (/(좋음|good)/.test(lower)) return t(strings.resortPage.airQuality.good);
  if (/(보통|moderate|normal)/.test(lower)) return t(strings.resortPage.airQuality.moderate);
  if (/(매우\s*나쁨|very\s*bad|very\s*poor)/.test(lower)) return t(strings.resortPage.airQuality.veryBad);
  if (/(나쁨|bad|poor)/.test(lower)) return t(strings.resortPage.airQuality.bad);
  return grade;
}
