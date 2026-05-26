import { useMemo } from "react";
import { Link } from "react-router-dom";
import { FiCamera, FiPlay } from "react-icons/fi";
import { Resort, StreamType } from "@/data/Util";
import { useResortData, useResortIndex } from "@/lib/resortData";
import { WeatherBadge } from "@/components/weather/WeatherBadge";
import { useI18n } from "@/lib/i18n/context";
import { strings } from "@/lib/i18n/strings";
import { useLastWatched } from "@/hooks/useLastWatched";

const MAX_CARDS = 6;

type RankedResort = {
  resort: Resort;
  slug: string;
  liveCount: number;
};

function countLiveStreams(resort: Resort): number {
  return resort.streams.filter((s) => s.type !== StreamType.Unavailable).length;
}

function EmptyStateWeatherGrid() {
  const { t } = useI18n();
  const { resorts } = useResortData();
  const index = useResortIndex();
  const { getResortSlug, findStreamById, getRouteForStreamId } = index;
  const { lastWatched } = useLastWatched();

  const resumeTarget = useMemo(() => {
    if (!lastWatched) return null;
    const entry = findStreamById(lastWatched);
    if (!entry) return null;
    if (entry.stream.type === StreamType.Unavailable) return null;
    const route = getRouteForStreamId(lastWatched);
    if (!route) return null;
    return {
      path: `/webcams/${route.resortSlug}/${route.streamSlug}`,
      label: `${t(entry.resort.name)} · ${t(entry.stream.name)}`,
    };
  }, [lastWatched, findStreamById, getRouteForStreamId, t]);

  const ranked: RankedResort[] = useMemo(() => {
    return resorts
      .map((resort) => {
        const slug = getResortSlug(resort);
        if (!slug) return null;
        return {
          resort,
          slug,
          liveCount: countLiveStreams(resort),
        } as RankedResort;
      })
      .filter((entry): entry is RankedResort => Boolean(entry))
      .sort((a, b) => {
        if (b.liveCount !== a.liveCount) return b.liveCount - a.liveCount;
        return t(a.resort.name).localeCompare(t(b.resort.name));
      });
  }, [resorts, getResortSlug, t]);

  const visible = ranked.slice(0, MAX_CARDS);
  const hasMore = ranked.length > MAX_CARDS;

  if (visible.length === 0) {
    return null;
  }

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-5 px-4 py-6 sm:px-6">
      <div className="text-center">
        <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">
          {t(strings.player.emptyTitle)}
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {t(strings.webcam.emptyPickResort)}
        </p>
      </div>
      {resumeTarget && (
        <Link
          to={resumeTarget.path}
          className="inline-flex items-center gap-2 rounded-full border border-accent-light/40 bg-accent-light/10 px-3 py-1.5 text-xs font-medium text-accent-light hover:bg-accent-light/20 dark:border-accent-dark/40 dark:bg-accent-dark/10 dark:text-accent-dark dark:hover:bg-accent-dark/20"
        >
          <FiPlay className="h-3.5 w-3.5" aria-hidden />
          <span>
            {t(strings.webcam.resume)}: <span className="font-semibold">{resumeTarget.label}</span>
          </span>
        </Link>
      )}
      <ul className="grid w-full max-w-2xl grid-cols-1 gap-3 max-h-[40svh] overflow-y-auto pr-1 sm:grid-cols-2 sm:max-h-none sm:overflow-visible sm:pr-0 lg:grid-cols-3">
        {visible.map(({ resort, slug, liveCount }) => (
          <li key={slug}>
            <Link
              to={`/resorts/${slug}`}
              className="group flex h-full flex-col gap-2 rounded-xl border border-slate-200/80 bg-white/80 p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:border-accent-light/60 hover:shadow-md dark:border-slate-700/60 dark:bg-slate-900/60 dark:hover:border-accent-dark/60"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="min-w-0 line-clamp-2 text-sm font-semibold leading-snug text-slate-900 dark:text-slate-100">
                  {t(resort.name)}
                </span>
                <WeatherBadge resortSlug={slug} priority className="shrink-0" />
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <FiCamera className="h-3.5 w-3.5" aria-hidden />
                <span>{liveCount}</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
      {hasMore && (
        <Link
          to="/resorts"
          className="text-sm font-medium text-accent-light hover:underline dark:text-accent-dark"
        >
          {t(strings.webcam.browseAllResorts)} →
        </Link>
      )}
    </div>
  );
}

export default EmptyStateWeatherGrid;
