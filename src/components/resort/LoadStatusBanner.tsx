import { useState } from "react";
import { FiAlertTriangle, FiChevronDown, FiChevronUp, FiRefreshCcw } from "react-icons/fi";
import { useResortLoadStatus } from "@/lib/resortData";
import type { LoadError } from "@/lib/openSkiData/types";
import { useI18n } from "@/lib/i18n/context";
import { strings } from "@/lib/i18n/strings";

// Tiers the load-status surface:
//   • bundled-fallback / error → full-width card. Severity is high — the
//     entire list is stale or absent, the user needs the announcement.
//   • partial → compact pill. Most data loaded; a small amber dot is enough
//     to flag the degradation without taxing screen real estate.
//   • ready / loading → renders nothing.
export function LoadStatusBanner() {
  const { status, errors, retry } = useResortLoadStatus();

  if (status === "ready" || status === "loading") return null;

  if (status === "partial") {
    return <PartialPill errors={errors} retry={retry} />;
  }
  return <FullBanner errors={errors} retry={retry} />;
}

type SurfaceProps = {
  errors: LoadError[];
  retry: () => void;
};

function FullBanner({ errors, retry }: SurfaceProps) {
  const { t } = useI18n();
  const [showDetails, setShowDetails] = useState(false);
  const tone =
    "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700/60 dark:bg-amber-900/30 dark:text-amber-100";
  return (
    <div
      className={`rounded-2xl border px-4 py-3 text-sm ${tone}`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <FiAlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <div className="flex-1 space-y-1">
          <p className="font-semibold">{t(strings.resortPage.dataBundledFallbackTitle)}</p>
          <p className="text-xs opacity-90">{t(strings.resortPage.dataBundledFallbackBody)}</p>
        </div>
        <button
          type="button"
          onClick={retry}
          className="inline-flex items-center gap-1 rounded-full border border-current px-2 py-0.5 text-xs font-semibold hover:bg-current/10"
        >
          <FiRefreshCcw className="h-3 w-3" aria-hidden />
          {t(strings.resortPage.dataRetry)}
        </button>
      </div>
      {errors.length > 0 && (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setShowDetails((s) => !s)}
            className="inline-flex items-center gap-1 text-xs font-semibold underline-offset-2 hover:underline"
            aria-expanded={showDetails}
          >
            {showDetails ? (
              <FiChevronUp className="h-3 w-3" aria-hidden />
            ) : (
              <FiChevronDown className="h-3 w-3" aria-hidden />
            )}
            {t(strings.resortPage.dataLoadingErrors)} ({errors.length})
          </button>
          {showDetails && <ErrorList errors={errors} />}
        </div>
      )}
    </div>
  );
}

function PartialPill({ errors, retry }: SurfaceProps) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  return (
    <div role="status" aria-live="polite" className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900 hover:bg-amber-100 dark:border-amber-700/60 dark:bg-amber-900/30 dark:text-amber-100 dark:hover:bg-amber-900/50"
      >
        <span
          className="h-1.5 w-1.5 rounded-full bg-amber-500 dark:bg-amber-300"
          aria-hidden
        />
        {t(strings.resortPage.dataPartialTitle)}
        {expanded ? (
          <FiChevronUp className="h-3 w-3" aria-hidden />
        ) : (
          <FiChevronDown className="h-3 w-3" aria-hidden />
        )}
      </button>
      {expanded && (
        <div className="w-full max-w-xl rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-2 text-xs text-amber-900 dark:border-amber-700/60 dark:bg-amber-900/20 dark:text-amber-100">
          <p className="opacity-90">{t(strings.resortPage.dataPartialBody)}</p>
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={retry}
              className="inline-flex items-center gap-1 rounded-full border border-current px-2 py-0.5 font-semibold hover:bg-current/10"
            >
              <FiRefreshCcw className="h-3 w-3" aria-hidden />
              {t(strings.resortPage.dataRetry)}
            </button>
            <span className="opacity-70">
              {t(strings.resortPage.dataLoadingErrors)} ({errors.length})
            </span>
          </div>
          {errors.length > 0 && <ErrorList errors={errors} />}
        </div>
      )}
    </div>
  );
}

function ErrorList({ errors }: { errors: LoadError[] }) {
  return (
    <ul className="mt-1 max-h-48 overflow-auto text-xs font-mono opacity-80">
      {errors.map((e, i) => (
        <li key={i} className="truncate">
          [{e.scope}]{e.placeSlug ? ` ${e.placeSlug}` : ""}
          {e.status ? ` (${e.status})` : ""}: {e.message}
        </li>
      ))}
    </ul>
  );
}
