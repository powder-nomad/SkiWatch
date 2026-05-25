import { useState } from "react";
import { FiAlertTriangle, FiChevronDown, FiChevronUp, FiRefreshCcw } from "react-icons/fi";
import { useResortLoadStatus } from "@/lib/resortData";
import { useI18n } from "@/lib/i18n/context";
import { strings } from "@/lib/i18n/strings";

// Surfaces the load-status the provider tracks. Stays out of the way
// when status is 'ready' / 'loading' (loading is quiet on purpose since
// bundled data is shown immediately as a placeholder).
export function LoadStatusBanner() {
  const { t } = useI18n();
  const { status, errors, retry } = useResortLoadStatus();
  const [showDetails, setShowDetails] = useState(false);

  if (status === "ready" || status === "loading") return null;

  const isFullFallback = status === "bundled-fallback" || status === "error";
  const title = t(
    isFullFallback
      ? strings.resortPage.dataBundledFallbackTitle
      : strings.resortPage.dataPartialTitle
  );
  const body = t(
    isFullFallback
      ? strings.resortPage.dataBundledFallbackBody
      : strings.resortPage.dataPartialBody
  );
  const tone = isFullFallback
    ? "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700/60 dark:bg-amber-900/30 dark:text-amber-100"
    : "border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-700/60 dark:bg-sky-900/30 dark:text-sky-100";

  return (
    <div
      className={`rounded-2xl border px-4 py-3 text-sm ${tone}`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <FiAlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <div className="flex-1 space-y-1">
          <p className="font-semibold">{title}</p>
          <p className="text-xs opacity-90">{body}</p>
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
          {showDetails && (
            <ul className="mt-1 max-h-48 overflow-auto text-xs font-mono opacity-80">
              {errors.map((e, i) => (
                <li key={i} className="truncate">
                  [{e.scope}]{e.placeSlug ? ` ${e.placeSlug}` : ""}
                  {e.status ? ` (${e.status})` : ""}: {e.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
