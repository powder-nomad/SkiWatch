"use client";

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FiSearch, FiX } from "react-icons/fi";
import { WeatherBadge } from "@/components/weather/WeatherBadge";
import { useI18n } from "@/lib/i18n/context";
import { strings } from "@/lib/i18n/strings";
import { useResortIndex } from "@/lib/resortData";
import { getLocalizedText } from "@/lib/i18n/locales";

// Country chip palette. Order is intentional: KR first (primary
// audience), then JP/CH/CA in alphabetical order. Add codes here
// as open-ski-data grows.
const COUNTRY_CHIPS: { code: string; label: string }[] = [
  { code: "kr", label: "🇰🇷 KR" },
  { code: "jp", label: "🇯🇵 JP" },
  { code: "ch", label: "🇨🇭 CH" },
  { code: "ca", label: "🇨🇦 CA" },
];

type SortKey = "name" | "mostWebcams" | "mostSlopes";

export function ResortIndexList() {
  const { t, locale } = useI18n();
  const { resortEntries } = useResortIndex();

  const [query, setQuery] = useState("");
  const [country, setCountry] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("name");

  // Resorts that DON'T have a `country` (bundled fallback dataset)
  // default to KR — the original SkiWatch dataset is all Korean.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matched = resortEntries.filter((entry) => {
      const c = entry.resort.country ?? "kr";
      if (country && c !== country) return false;
      if (!q) return true;
      const localized = getLocalizedText(entry.resort.name, locale).toLowerCase();
      if (localized.includes(q)) return true;
      if (entry.slug.toLowerCase().includes(q)) return true;
      const allNames = Object.values(entry.resort.name).join(" ").toLowerCase();
      return allNames.includes(q);
    });
    const out = [...matched];
    // Stable secondary sort by localized name keeps the list
    // deterministic when the primary metric ties (e.g. two resorts
    // with the same webcam count).
    const byName = (a: typeof matched[number], b: typeof matched[number]) =>
      getLocalizedText(a.resort.name, locale)
        .localeCompare(getLocalizedText(b.resort.name, locale), locale);
    if (sortKey === "mostWebcams") {
      out.sort((a, b) =>
        b.resort.streams.length - a.resort.streams.length || byName(a, b)
      );
    } else if (sortKey === "mostSlopes") {
      out.sort((a, b) =>
        b.resort.slopes.length - a.resort.slopes.length || byName(a, b)
      );
    } else {
      out.sort(byName);
    }
    return out;
  }, [resortEntries, query, country, locale, sortKey]);

  // Available country chips = the intersection of the canonical list
  // and what's actually present in the data. Prevents showing "JP"
  // when no JP resorts have been loaded yet.
  const availableChips = useMemo(() => {
    const present = new Set(resortEntries.map((e) => e.resort.country ?? "kr"));
    return COUNTRY_CHIPS.filter((chip) => present.has(chip.code));
  }, [resortEntries]);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-slate-400">{t(strings.resortPage.heading)}</p>
        <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">{t(strings.resortPage.listTitle)}</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">{t(strings.resortPage.listDescription)}</p>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <label className="relative flex-1">
          <FiSearch
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Yongpyong, ヨンピョン, …"
            aria-label={t(strings.resortPage.searchAriaLabel)}
            className="w-full rounded-full border border-slate-200 bg-white pl-9 pr-9 py-2 text-sm text-slate-900 shadow-sm transition focus:border-accent-light focus:outline-none focus:ring-2 focus:ring-accent-light/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label={t(strings.resortPage.clearSearch)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <FiX className="h-4 w-4" />
            </button>
          )}
        </label>

        {availableChips.length > 1 && (
          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              onClick={() => setCountry(null)}
              className={[
                "rounded-full border px-3 py-1 text-xs font-semibold transition",
                country === null
                  ? "border-accent-light bg-accent-light/15 text-accent-light"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800",
              ].join(" ")}
            >
              All
            </button>
            {availableChips.map((chip) => (
              <button
                key={chip.code}
                type="button"
                onClick={() => setCountry(chip.code)}
                className={[
                  "rounded-full border px-3 py-1 text-xs font-semibold transition",
                  country === chip.code
                    ? "border-accent-light bg-accent-light/15 text-accent-light"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800",
                ].join(" ")}
              >
                {chip.label}
              </button>
            ))}
          </div>
        )}

        <label className="inline-flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="uppercase tracking-wide">{t(strings.resortPage.sort)}</span>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="rounded-full border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 shadow-sm focus:border-accent-light focus:outline-none focus:ring-2 focus:ring-accent-light/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          >
            <option value="name">{t(strings.resortPage.sortName)}</option>
            <option value="mostWebcams">{t(strings.resortPage.sortMostWebcams)}</option>
            <option value="mostSlopes">{t(strings.resortPage.sortMostSlopes)}</option>
          </select>
        </label>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-400">
          {t(strings.resortPage.noResortsMatch)}
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((entry) => (
            <Link
              key={entry.slug}
              to={`/resorts/${entry.slug}`}
              className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm transition hover:border-accent-light/40 dark:border-slate-800/70 dark:bg-slate-900/70"
            >
              <div className="flex items-center justify-between">
                <p className="text-base font-semibold text-slate-900 dark:text-slate-100">{t(entry.resort.name)}</p>
                <WeatherBadge resortSlug={entry.slug} />
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {entry.resort.streams.length} {t(strings.resortPage.webcams)} · {entry.resort.slopes.length} {t(
                  strings.resortPage.slopes
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
