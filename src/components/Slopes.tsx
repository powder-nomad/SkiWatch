"use client";

import { useCallback, useMemo, useState } from "react";
import { Difficulty } from "@/data/Util";
import { useI18n } from "@/lib/i18n/context";
import { strings, difficultyLabels } from "@/lib/i18n/strings";
import { getLocalizedText, type LocalizedText } from "@/lib/i18n/locales";
import { useResortData } from "@/lib/resortData";
import { cn } from "@/lib/utils";

const difficultyOrder: Difficulty[] = [
  Difficulty.BEGINNER,
  Difficulty.BE_IN,
  Difficulty.INTERMEDIATE,
  Difficulty.IN_AD,
  Difficulty.ADVANCED,
  Difficulty.EXPERT,
  Difficulty.PARK,
];

const difficultyColors: Record<Difficulty, string> = {
  [Difficulty.BEGINNER]: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-100",
  [Difficulty.BE_IN]: "bg-teal-100 text-teal-800 dark:bg-teal-500/20 dark:text-teal-100",
  [Difficulty.INTERMEDIATE]: "bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-100",
  [Difficulty.IN_AD]: "bg-indigo-100 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-100",
  [Difficulty.ADVANCED]: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-100",
  [Difficulty.EXPERT]: "bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-100",
  [Difficulty.PARK]: "bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-100",
};

type SortColumn = "resort" | "name" | "difficulty" | "length" | "vertical" | "avgGradient" | "maxAngle";

function Slopes() {
  const { t, locale } = useI18n();
  const { resorts } = useResortData();
  const [difficultyFilter, setDifficultyFilter] = useState<"all" | Difficulty>("all");
  const [resortFilter, setResortFilter] = useState<string>("all");
  const [sortConfig, setSortConfig] = useState<{ column?: SortColumn; direction?: "asc" | "desc" }>({
    column: undefined,
    direction: undefined,
  });

  const getName = useCallback(
    (value?: LocalizedText | string) => {
      if (!value) return "";
      if (typeof value === "string") {
        return value;
      }
      return getLocalizedText(value, locale);
    },
    [locale]
  );

  const resortOptions = useMemo(() => {
    const unique = new Set<string>();
    resorts.forEach((resort) => {
      const label = getName(resort.name);
      if (label) {
        unique.add(label);
      }
    });
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [getName]);

  const tableRows = useMemo(() => {
    const rows = resorts
      .flatMap((resort) => {
        const resortName = getName(resort.name);
        if (!resortName) {
          return [];
        }
        if (resortFilter !== "all" && resortName !== resortFilter) {
          return [];
        }

        return resort.slopes
          .filter((slope) => (difficultyFilter === "all" ? true : slope.difficulty === difficultyFilter))
          .map((slope) => ({
            key: `${resortName}-${slope.id}`,
            resortName,
            slopeName: getName(slope.name),
            difficulty: slope.difficulty,
            length: slope.length,
            vertical: slope.elevation,
            avgGradient: slope.avgAngle,
            maxAngle: slope.maxAngle,
          }));
      });

    const comparator = createComparator(sortConfig, locale);
    return rows.sort((a, b) => {
      const sortResult = comparator(a, b);
      if (sortResult !== 0) {
        return sortResult;
      }
      return defaultComparator(a, b, locale);
    });
  }, [difficultyFilter, resortFilter, getName, locale, sortConfig]);

  const handleSort = (column: SortColumn) => {
    setSortConfig((current) => {
      if (current.column !== column) {
        return { column, direction: "desc" };
      }
      if (current.direction === "desc") {
        return { column, direction: "asc" };
      }
      return { column: undefined, direction: undefined };
    });
  };

  return (
    <section className="flex-1 overflow-auto bg-white/80 px-4 py-6 backdrop-blur dark:bg-slate-900/50 md:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            {t(strings.slopes.title)}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">{t(strings.slopes.description)}</p>
        </header>

        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200/70 bg-white/90 px-4 py-3 shadow-sm dark:border-slate-800/70 dark:bg-slate-900/80">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">
              {t(strings.slopes.filterDifficulty)}
            </span>
            <button
              type="button"
              onClick={() => setDifficultyFilter("all")}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
                difficultyFilter === "all"
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
              )}
            >
              {t(strings.slopeTable.filters.none)}
            </button>
            {difficultyOrder.map((difficulty) => (
              <button
                key={difficulty}
                type="button"
                onClick={() => setDifficultyFilter(difficulty)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-semibold capitalize transition-colors",
                  difficultyFilter === difficulty
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                )}
              >
                {getLocalizedText(difficultyLabels[difficulty], locale)}
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <label htmlFor="resort-filter" className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">
              {t(strings.slopes.filterResort)}
            </label>
            <select
              id="resort-filter"
              value={resortFilter}
              onChange={(event) => setResortFilter(event.target.value)}
              className="rounded-full border border-slate-300 bg-white px-3 py-1 text-sm text-slate-600 shadow-sm focus:border-accent-light focus:outline-none focus:ring-2 focus:ring-accent-light/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <option value="all">{t(strings.slopes.allResorts)}</option>
              {resortOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200/70 bg-white/95 shadow-sm dark:border-slate-800/70 dark:bg-slate-900/80">
          {tableRows.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
              {t(strings.resortPage.weatherError)}
            </div>
          ) : (
            <>
              {/* Mobile (< md): card layout. Same data, denser display
                  that doesn't require horizontal scroll. */}
              <ul className="divide-y divide-slate-200 dark:divide-slate-800 md:hidden">
                {tableRows.map((row) => (
                  <li key={row.key} className="px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {row.slopeName}
                      </p>
                      <span
                        className={cn(
                          "ml-2 inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                          difficultyColors[row.difficulty],
                        )}
                      >
                        {getLocalizedText(difficultyLabels[row.difficulty], locale)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      {row.resortName}
                    </p>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                      {row.length ? `${Math.round(row.length).toLocaleString()} m` : "—"}
                      <span className="mx-1 text-slate-300 dark:text-slate-600">·</span>
                      {row.vertical ? `${Math.round(row.vertical).toLocaleString()} m ↕` : "— ↕"}
                      <span className="mx-1 text-slate-300 dark:text-slate-600">·</span>
                      {row.avgGradient !== undefined ? `${row.avgGradient.toFixed(1)}° avg` : "—° avg"}
                      <span className="mx-1 text-slate-300 dark:text-slate-600">·</span>
                      {row.maxAngle !== undefined ? `${row.maxAngle.toFixed(1)}° max` : "—° max"}
                    </p>
                  </li>
                ))}
              </ul>
              {/* Desktop (≥ md): original table */}
              <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full table-fixed text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                  <tr>
                    <SortableHeader
                      className="w-[140px] px-4 py-3 text-left"
                      label={t(strings.slopeTable.headers.resort)}
                      column="resort"
                      sortConfig={sortConfig}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      className="px-4 py-3 text-left"
                      label={t(strings.slopeTable.headers.name)}
                      column="name"
                      sortConfig={sortConfig}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      className="w-[160px] px-4 py-3 text-left"
                      label={t(strings.slopeTable.headers.difficulty)}
                      column="difficulty"
                      sortConfig={sortConfig}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      className="w-[120px] px-4 py-3 text-right"
                      label={t(strings.slopeTable.headers.length)}
                      column="length"
                      sortConfig={sortConfig}
                      onSort={handleSort}
                      align="right"
                    />
                    <SortableHeader
                      className="w-[120px] px-4 py-3 text-right"
                      label={t(strings.slopeTable.headers.vertical)}
                      column="vertical"
                      sortConfig={sortConfig}
                      onSort={handleSort}
                      align="right"
                    />
                    <SortableHeader
                      className="w-[140px] px-4 py-3 text-right"
                      label={t(strings.slopeTable.headers.avgGradient)}
                      column="avgGradient"
                      sortConfig={sortConfig}
                      onSort={handleSort}
                      align="right"
                    />
                    <SortableHeader
                      className="w-[140px] px-4 py-3 text-right"
                      label={t(strings.slopeTable.headers.maxAngle)}
                      column="maxAngle"
                      sortConfig={sortConfig}
                      onSort={handleSort}
                      align="right"
                    />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {tableRows.map((row) => (
                    <tr key={row.key} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{row.resortName}</td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{row.slopeName}</td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide",
                            difficultyColors[row.difficulty]
                          )}
                        >
                          {getLocalizedText(difficultyLabels[row.difficulty], locale)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-300">
                        {row.length ? `${Math.round(row.length).toLocaleString()} m` : "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-300">
                        {row.vertical ? `${Math.round(row.vertical).toLocaleString()} m` : "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-300">
                        {row.avgGradient !== undefined ? `${row.avgGradient.toFixed(1)} °` : "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-300">
                        {row.maxAngle !== undefined ? `${row.maxAngle.toFixed(1)} °` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

type SortableHeaderProps = {
  className?: string;
  label: string;
  column: SortColumn;
  align?: "left" | "right";
  sortConfig: { column?: SortColumn; direction?: "asc" | "desc" };
  onSort: (column: SortColumn) => void;
};

function SortableHeader({ className, label, column, align = "left", sortConfig, onSort }: SortableHeaderProps) {
  const direction = sortConfig.column === column ? sortConfig.direction : undefined;
  const ariaSort =
    sortConfig.column === column
      ? direction === "desc"
        ? "descending"
        : direction === "asc"
          ? "ascending"
          : "none"
      : "none";

  return (
    <th className={className} aria-sort={ariaSort as "none" | "ascending" | "descending"}>
      <button
        type="button"
        onClick={() => onSort(column)}
        className={cn(
          "flex w-full items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100",
          align === "right" ? "justify-end" : "justify-start"
        )}
      >
        {label}
        {direction && <span className="text-[10px]">{direction === "desc" ? "↓" : "↑"}</span>}
      </button>
    </th>
  );
}

type SortRow = {
  key: string;
  resortName: string;
  slopeName: string;
  difficulty: Difficulty;
  length?: number;
  vertical?: number;
  avgGradient?: number;
  maxAngle?: number;
};

function createComparator(
  sortConfig: { column?: SortColumn; direction?: "asc" | "desc" },
  locale: string
) {
  return (a: SortRow, b: SortRow) => {
    if (!sortConfig.column || !sortConfig.direction) {
      return 0;
    }
    const dir = sortConfig.direction === "asc" ? 1 : -1;
    switch (sortConfig.column) {
      case "resort":
        return dir * a.resortName.localeCompare(b.resortName, locale);
      case "name":
        return dir * a.slopeName.localeCompare(b.slopeName, locale);
      case "difficulty": {
        const diff =
          difficultyOrder.indexOf(a.difficulty) - difficultyOrder.indexOf(b.difficulty);
        return dir * diff;
      }
      case "length":
        return compareNumeric(a.length, b.length, sortConfig.direction);
      case "vertical":
        return compareNumeric(a.vertical, b.vertical, sortConfig.direction);
      case "avgGradient":
        return compareNumeric(a.avgGradient, b.avgGradient, sortConfig.direction);
      case "maxAngle":
        return compareNumeric(a.maxAngle, b.maxAngle, sortConfig.direction);
      default:
        return 0;
    }
  };
}

function compareNumeric(
  valueA?: number,
  valueB?: number,
  direction: "asc" | "desc" = "asc"
) {
  const fallback = direction === "asc" ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
  const safeA = valueA ?? fallback;
  const safeB = valueB ?? fallback;
  if (safeA === safeB) return 0;
  const result = safeA > safeB ? 1 : -1;
  return direction === "asc" ? result : -result;
}

function defaultComparator(a: SortRow, b: SortRow, locale: string) {
  if (a.resortName !== b.resortName) {
    return a.resortName.localeCompare(b.resortName, locale);
  }
  const slopeNameCompare = a.slopeName.localeCompare(b.slopeName, locale);
  if (slopeNameCompare !== 0) {
    return slopeNameCompare;
  }
  const difficultyCompare =
    difficultyOrder.indexOf(a.difficulty) - difficultyOrder.indexOf(b.difficulty);
  if (difficultyCompare !== 0) {
    return difficultyCompare;
  }
  if (a.length !== undefined && b.length !== undefined && b.length !== a.length) {
    return b.length - a.length;
  }
  return 0;
}

export default Slopes;
