"use client";

import { Link } from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi";
import { HeroCurrentWeather } from "@/components/resort/HeroCurrentWeather";
import { useI18n } from "@/lib/i18n/context";
import { strings } from "@/lib/i18n/strings";
import type { ResortEntry } from "@/lib/resortIndex";
import { getLocalizedText } from "@/lib/i18n/locales";

type Props = {
  entry: ResortEntry;
};

export function ResortWeatherHeader({ entry }: Props) {
  const { t, locale } = useI18n();

  const navItems = [
    { id: "trend", label: t(strings.resortPage.dailyTrend) },
    { id: "past-48", label: t(strings.resortPage.past48h) },
    { id: "upcoming-48", label: t(strings.resortPage.upcoming48Digest) },
    // Middle dot (·) instead of "/" makes it clearer the chip jumps
    // to TWO side-by-side cards, not one combined view.
    { id: "six-hour", label: `${t(strings.resortPage.past6h)} · ${t(strings.resortPage.next6h)}` },
    { id: "hourly", label: t(strings.resortPage.hourlyDetails) },
  ];

  return (
    <header className="space-y-4 rounded-3xl border border-slate-200/80 bg-white/95 p-5 shadow-sm dark:border-slate-800/70 dark:bg-slate-900/85">
      <Link
        to={`/resorts/${entry.slug}`}
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
      >
        <FiArrowLeft className="h-4 w-4" aria-hidden />
        {t(strings.resortPage.backToResort)}
      </Link>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-stretch lg:justify-between">
        <div className="flex-1 space-y-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {t(strings.resortPage.fullWeather)}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-4xl font-semibold text-slate-900 dark:text-slate-100">
                {getLocalizedText(entry.resort.name, locale)}
              </h1>
              {entry.resort.weather && (
                <a
                  href={entry.resort.weather}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-full border border-slate-200/80 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  {t(strings.resortPage.officialForecastLink)}
                  <span aria-hidden>↗</span>
                </a>
              )}
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300">{t(strings.resortPage.weatherHeroDescription)}</p>
          </div>

          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {t(strings.resortPage.weatherSectionNav)}
            </p>
            <nav className="flex flex-wrap gap-2">
              {navItems.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className="inline-flex items-center gap-1 rounded-full border border-slate-200/80 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </div>
        </div>

        <HeroCurrentWeather resortSlug={entry.slug} />
      </div>
    </header>
  );
}
