"use client";

import { useMemo, useState } from "react";
import { FiAlertTriangle, FiExternalLink } from "react-icons/fi";
import Player from "@/components/ui/Player";
import { ResortSlopeList } from "@/components/resort/ResortSlopeList";
import { WeatherDetails } from "@/components/resort/WeatherDetails";
import { ResortEntry } from "@/lib/resortIndex";
import { Stream, StreamType } from "@/data/Util";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/context";
import { strings } from "@/lib/i18n/strings";
import { useResortLoadStatus } from "@/lib/resortData";

type ResortDetailProps = {
  entry: ResortEntry;
};

export function ResortDetail({ entry }: ResortDetailProps) {
  const { t } = useI18n();
  const { errors: loadErrors } = useResortLoadStatus();
  const playableStreams = entry.resort.streams.filter((stream) => stream.type !== StreamType.External);
  const [currentStream, setCurrentStream] = useState<Stream | undefined>(playableStreams[0]);

  // Surface only the errors attributable to THIS resort, so the warning
  // is actionable. Slug match relies on `slugifyLocalized(resort.name)`
  // matching open-ski-data's `place_slug` (true in practice; if a future
  // resort breaks the convention, the warning simply doesn't render —
  // the page-level banner on /resorts still tells the user something
  // failed).
  const myErrors = useMemo(
    () => loadErrors.filter((e) => e.placeSlug === entry.slug),
    [loadErrors, entry.slug]
  );

  const displayStream = useMemo(() => {
    if (currentStream) return currentStream;
    return playableStreams[0];
  }, [currentStream, playableStreams]);

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-slate-400">{t(strings.resortPage.heading)}</p>
        <div className="flex flex-wrap items-center gap-4">
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">{t(entry.resort.name)}</h1>
          <a
            href={entry.resort.homepage}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-300"
          >
            {t(strings.resortPage.officialSite)}
            <FiExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
        {myErrors.length > 0 && (
          <div
            className="mt-2 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-700/60 dark:bg-amber-900/30 dark:text-amber-100"
            role="status"
            aria-live="polite"
          >
            <FiAlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            <div>
              <p className="font-semibold">{t(strings.resortPage.perResortPartial)}</p>
              <p className="opacity-90">
                {Array.from(new Set(myErrors.map((e) => e.scope))).join(", ")}
              </p>
            </div>
          </div>
        )}
      </header>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)]">
        <div className="flex flex-col gap-4 rounded-2xl border border-slate-200/70 bg-white/90 p-4 shadow-sm dark:border-slate-800/70 dark:bg-slate-900/70">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">{t(strings.resortPage.webcams)}</p>
            {entry.resort.streams.some((s) => s.type === StreamType.External) && (
              <span className="text-xs text-slate-400">{t(strings.resortPage.externalWebcam)}</span>
            )}
          </div>
          <div className="rounded-xl border border-slate-200/60 bg-black/5 dark:border-slate-700/60">
            <div className="relative w-full overflow-hidden rounded-xl pb-[56.25%]">
              {displayStream ? (
                <div className="absolute inset-0">
                  <Player stream={displayStream} showSummary={false} />
                </div>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-500 dark:text-slate-300">
                  {t(strings.player.emptyBody)}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {entry.resort.streams.map((stream) => {
              const isActive = displayStream === stream;
              const isUnavailable = stream.type === StreamType.Unavailable;
              const disableSelect = stream.type === StreamType.External || isUnavailable;
              return (
                <button
                  key={`${stream.url}-${stream.name.en ?? stream.name.ko}`}
                  type="button"
                  onClick={() => {
                    if (disableSelect) {
                      window.open(stream.url, "_blank", "noopener,noreferrer");
                    } else {
                      if (!isUnavailable) {
                        setCurrentStream(stream);
                      }
                    }
                  }}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    isUnavailable
                      ? "cursor-not-allowed border-dashed border-slate-300 text-slate-400 dark:border-slate-700 dark:text-slate-500"
                      : isActive
                        ? "border-accent-light bg-accent-light/10 text-accent-light dark:border-accent-dark dark:text-accent-dark"
                        : "border-slate-200 text-slate-600 hover:border-accent-light/50 hover:text-accent-light dark:border-slate-700 dark:text-slate-300"
                  )}
                  disabled={disableSelect}
                >
                  {t(stream.name)}
                  {stream.type === StreamType.External && <FiExternalLink className="ml-1 inline h-3 w-3" />}
                  {isUnavailable && (
                    <span className="ml-2 inline-flex items-center rounded-full border border-slate-300 px-2 text-[10px] uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:text-slate-400">
                      {t(strings.sidebar.unavailable)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <WeatherDetails resortSlug={entry.slug} />
      </section>

      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{t(strings.resortPage.slopes)}</h2>
        </div>
        <div className="mt-4 rounded-2xl border border-slate-200/70 bg-white/90 p-4 shadow-sm dark:border-slate-800/70 dark:bg-slate-900/70">
          <ResortSlopeList slopes={entry.resort.slopes} />
        </div>
      </section>
    </div>
  );
}
