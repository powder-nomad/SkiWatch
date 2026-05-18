"use client";

import { Link } from "react-router-dom";
import { PointerEvent, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useDraggable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { FaRegStar, FaStar } from "react-icons/fa";
import { FiCheck, FiChevronDown, FiChevronLeft, FiChevronRight, FiExternalLink, FiPlus, FiSlash } from "react-icons/fi";
import { RxDragHandleDots2 } from "react-icons/rx";
import { Resort, Stream, StreamType } from "@/data/Util";
import { useFavorites } from "@/hooks/useFavorites";
import { WeatherBadge } from "@/components/weather/WeatherBadge";
import { useI18n } from "@/lib/i18n/context";
import { strings } from "@/lib/i18n/strings";
import { getStreamIdentifier } from "@/lib/streamKeys";
import { type DashboardItemType } from "@/components/ui/DashboardTypes";
import { cn } from "@/lib/utils";
import { useResortIndex } from "@/lib/resortData";
import type { CSSProperties } from "react";

type SidebarProps = {
  data: Resort[];
  resortOrder: string[];
  streamOrder: Record<string, string[]>;
  gridStreamIds?: Set<string>;
  onRemoveFromGrid?: (id: string) => void;
  onAddToGrid?: (
    items: {
      stream?: Stream;
      resort: Resort;
      streamId?: string;
      resortSlug?: string;
      type: DashboardItemType;
    }[]
  ) => void;
  onStreamSelect: (
    stream: Stream,
    meta: { resort: Resort; streamId: string; shouldSyncSidebar: boolean; resortSlug?: string }
  ) => void;
  selectedStreamId?: string;
  selectedResortHomepage?: string;
  selectionToken?: number;
  shouldSyncSelection?: boolean;
  isDragging?: boolean;
  isMobileViewport?: boolean;
  onMobileHandleDragStart?: (
    payload: { type: DashboardItemType; stream?: Stream; resort: Resort; streamId: string; resortSlug?: string },
    point: { x: number; y: number }
  ) => void;
  onMobileHandleDragMove?: (point: { x: number; y: number }) => void;
  onMobileHandleDragEnd?: (
    payload: { type: DashboardItemType; stream?: Stream; resort: Resort; streamId: string; resortSlug?: string },
    point: { x: number; y: number }
  ) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
};

type RenderStreamProps = {
  resort: Resort;
  stream: Stream;
  streamId: string;
  tabIndex: number;
  syncAccordion?: boolean;
  showResortLabel?: boolean;
};

const FAVORITES_KEY = "__favorites__";
const FAVORITES_OPEN_STORAGE = "skiwatch-favorites-open";

function Sidebar({
  data,
  resortOrder,
  streamOrder,
  gridStreamIds,
  onStreamSelect,
  selectedStreamId,
  selectedResortHomepage,
  selectionToken = 0,
  shouldSyncSelection = true,
  isDragging = false,
  isMobileViewport = false,
  onMobileHandleDragStart,
  onMobileHandleDragMove,
  onMobileHandleDragEnd,
  isCollapsed = false,
  onToggleCollapse,
  onAddToGrid,
  onRemoveFromGrid,
}: SidebarProps) {
  const [currentResort, setCurrentResort] = useState<Resort | undefined>(() => {
    if (!selectedResortHomepage) {
      return undefined;
    }
    return data.find((resort) => resort.homepage === selectedResortHomepage);
  });
  const [activeStreamId, setActiveStreamId] = useState<string | undefined>(selectedStreamId);
  const { t } = useI18n();
  const { favorites, favoriteSet, toggleFavorite, setFavoritesOrder } = useFavorites();
  const [searchQuery, setSearchQuery] = useState("");
  const [desktopDndEnabled, setDesktopDndEnabled] = useState(false);
  const [favoritesOpen, setFavoritesOpen] = useState(() => {
    if (typeof window === "undefined") {
      return favoriteSet.size > 0;
    }
    const stored = window.localStorage.getItem(FAVORITES_OPEN_STORAGE);
    if (stored === "true" || stored === "false") {
      return stored === "true";
    }
    return favoriteSet.size > 0;
  });

  const listRefs = useRef<Record<string, HTMLElement | null>>({});
  const { getResortSlug } = useResortIndex();

  const collapseEnabled = typeof onToggleCollapse === "function";
  const collapsed = collapseEnabled ? isCollapsed : false;
  const gridEnabled = Boolean(onAddToGrid || onRemoveFromGrid);

  const streamLookup = useMemo(() => {
    const map = new Map<string, { resort: Resort; stream: Stream }>();
    data.forEach((resort) => {
      resort.streams.forEach((stream) => {
        map.set(getStreamIdentifier(resort, stream), { resort, stream });
      });
    });
    return map;
  }, [data]);

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const matchesQuery = useCallback(
    (value: string) => {
      if (!normalizedQuery) return true;
      return value.toLowerCase().includes(normalizedQuery);
    },
    [normalizedQuery]
  );

  useEffect(() => {
    if (!selectionToken) {
      return;
    }
    if (selectedStreamId) {
      setActiveStreamId(selectedStreamId);
    }
    if (shouldSyncSelection && selectedResortHomepage) {
      const entry = data.find((resort) => resort.homepage === selectedResortHomepage);
      if (entry) {
        setCurrentResort(entry);
      }
    }
  }, [selectionToken, selectedStreamId, selectedResortHomepage, shouldSyncSelection, data]);

  const favoriteEntries = useMemo(() => {
    return favorites
      .map((id) => {
        const entry = streamLookup.get(id);
        if (!entry) return null;
        return { id, ...entry };
      })
      .filter(Boolean) as { id: string; resort: Resort; stream: Stream }[];
  }, [favorites, streamLookup]);

  const filteredFavorites = useMemo(() => {
    if (!normalizedQuery) return favoriteEntries;
    return favoriteEntries.filter(({ resort, stream }) => {
      const resortName = t(resort.name);
      const streamName = t(stream.name);
      return matchesQuery(resortName) || matchesQuery(streamName);
    });
  }, [favoriteEntries, normalizedQuery, matchesQuery, t]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const orderedResorts = useMemo(() => {
    // Key by slug. Homepage collides for open-ski-data placeholder
    // places that have homepage:null (CA/CH/JP), which produced the
    // "wall of Eiger" duplicates on /resorts → /webcams nav.
    const lookup = new Map(
      data.map((resort) => [getResortSlug(resort) ?? resort.homepage, resort])
    );
    return resortOrder.map((id) => lookup.get(id)).filter(Boolean) as Resort[];
  }, [data, resortOrder, getResortSlug]);

  const filteredResorts = useMemo(() => {
    if (!normalizedQuery) {
      return orderedResorts.map((resort) => {
        const key = getResortSlug(resort) ?? resort.homepage;
        return {
          resort,
          streamIds: streamOrder[key] ?? resort.streams.map((s) => getStreamIdentifier(resort, s)),
        };
      });
    }
    return orderedResorts
      .map((resort) => {
        const resortName = t(resort.name);
        const resortMatches = matchesQuery(resortName);
        const key = getResortSlug(resort) ?? resort.homepage;
        const baseIds = streamOrder[key] ?? resort.streams.map((s) => getStreamIdentifier(resort, s));
        if (resortMatches) {
          return { resort, streamIds: baseIds };
        }
        const streamIds = baseIds.filter((id) => {
          const entry = streamLookup.get(id);
          if (!entry) return false;
          return matchesQuery(t(entry.stream.name));
        });
        if (streamIds.length === 0) return null;
        return { resort, streamIds };
      })
      .filter(Boolean) as { resort: Resort; streamIds: string[] }[];
  }, [orderedResorts, normalizedQuery, streamOrder, streamLookup, matchesQuery, t]);

  useEffect(() => {
    if (favoriteEntries.length === 0) {
      setFavoritesOpen(false);
    }
  }, [favoriteEntries.length]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(FAVORITES_OPEN_STORAGE, favoritesOpen ? "true" : "false");
  }, [favoritesOpen]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(hover: hover) and (pointer: fine)");
    const update = () => setDesktopDndEnabled(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  function resortSelected(resort: Resort) {
    setCurrentResort((prev) => (prev === resort ? undefined : resort));
  }

  function handleStreamSelection(resort: Resort, stream: Stream, options?: { syncAccordion?: boolean }) {
    const { syncAccordion = true } = options ?? {};
    const streamId = getStreamIdentifier(resort, stream);
    if (stream.type === StreamType.External) {
      window.open(stream.url, "_blank", "noopener,noreferrer");
      return;
    }
    onStreamSelect(stream, {
      resort,
      streamId,
      shouldSyncSidebar: syncAccordion,
      resortSlug: getResortSlug(resort),
    });
    setActiveStreamId(streamId);
    if (syncAccordion) {
      setCurrentResort(resort);
    }
  }

  const handleFavoriteReorder = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = favorites.findIndex((item) => item === active.id);
      const newIndex = favorites.findIndex((item) => item === over.id);
      if (oldIndex === -1 || newIndex === -1) return;
      setFavoritesOrder(arrayMove(favorites, oldIndex, newIndex));
    },
    [favorites, setFavoritesOrder]
  );

  const renderStreamAction = ({
    resort,
    stream,
    streamId,
    tabIndex,
    showResortLabel,
    syncAccordion = true,
  }: RenderStreamProps) => {
    const isDisabled = stream.type === StreamType.Unavailable;
    const isSelectable = stream.type !== StreamType.External && stream.type !== StreamType.Unavailable;
    const isSelected = activeStreamId === streamId;
    const isFavorite = favoriteSet.has(streamId);

    const indicator = (() => {
      if (isDisabled) {
        return (
          <span
            className="inline-flex items-center text-slate-400 dark:text-slate-500"
            title={t(strings.sidebar.unavailable)}
          >
            <FiSlash className="h-4 w-4" aria-hidden />
            <span className="sr-only">{t(strings.sidebar.unavailable)}</span>
          </span>
        );
      }
      if (stream.type === StreamType.External) {
        return (
          <span
            className={cn(
              "inline-flex items-center text-slate-500 dark:text-slate-300",
              isSelected && "text-white"
            )}
            title={t(strings.sidebar.newTab)}
          >
            <FiExternalLink className="h-3.5 w-3.5" aria-hidden />
            <span className="sr-only">{t(strings.sidebar.newTab)}</span>
          </span>
        );
      }
      return null;
    })();

    return (
      <div className="flex items-center gap-1">
        <button
          type="button"
          className={cn(
            "flex w-full min-w-0 items-center justify-between rounded-md px-2 py-2 text-left text-sm transition-colors",
            isDisabled
              ? "cursor-not-allowed border border-dashed border-slate-300/70 bg-slate-100 text-slate-400 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-500"
              : "border border-transparent hover:bg-accent-light/10 dark:hover:bg-accent-dark/20",
            isSelected ? "bg-accent-light/90 text-white dark:bg-accent-dark/90" : "text-slate-700 dark:text-slate-200"
          )}
          disabled={isDisabled}
          tabIndex={tabIndex}
          title={stream.type === StreamType.External ? t(strings.sidebar.externalTooltip) : undefined}
          onClick={() => {
            handleStreamSelection(resort, stream, { syncAccordion });
          }}
        >
          <div className="flex min-w-0 flex-col text-left">
            {showResortLabel && (
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                {t(resort.name)}
              </span>
            )}
            <span className="truncate text-left" title={t(stream.name)}>
              {t(stream.name)}
            </span>
          </div>
          {indicator}
        </button>
        <button
          type="button"
          aria-pressed={isFavorite}
          aria-label={isFavorite ? t(strings.sidebar.favoriteRemove) : t(strings.sidebar.favoriteAdd)}
          title={isFavorite ? t(strings.sidebar.favoriteRemove) : t(strings.sidebar.favoriteAdd)}
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs transition-colors",
            isFavorite
              ? "text-amber-400 hover:text-amber-300"
              : "text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
          )}
          tabIndex={tabIndex}
          onClick={(event) => {
            event.stopPropagation();
            toggleFavorite(streamId);
          }}
        >
            {isFavorite ? <FaStar className="h-4 w-4" /> : <FaRegStar className="h-4 w-4" />}
        </button>
      </div>
    );
  };

  useEffect(() => {
    Object.entries(listRefs.current).forEach(([key, element]) => {
      if (!element) return;

      const isFavoritesList = key === FAVORITES_KEY;
      const isActive = !collapsed && (isFavoritesList ? favoritesOpen : currentResort?.homepage === key);

      if (isActive) {
        element.style.maxHeight = `${element.scrollHeight}px`;
        element.style.opacity = "1";
        element.style.pointerEvents = "auto";
        element.style.borderColor = "";
      } else {
        element.style.maxHeight = "0px";
        element.style.opacity = "0";
        element.style.pointerEvents = "none";
        element.style.borderColor = "transparent";
      }
    });
  }, [currentResort, collapsed, favoritesOpen]);

  return (
    <aside
      className={cn(
        "flex w-full flex-1 min-h-0 flex-col border-t border-slate-200/70 md:border-t-0 md:border-l dark:border-slate-800/60 bg-white/70 dark:bg-slate-900/70 backdrop-blur transition-[width] duration-300 overflow-hidden h-full",
        collapseEnabled ? (collapsed ? "md:w-12 md:flex-none" : "md:w-full md:flex-none") : "md:w-full md:flex-none"
      )}
    >
      <div className="relative flex h-full flex-col px-0">
        {collapseEnabled && (
          <div className="hidden md:flex justify-end">
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label={collapsed ? t(strings.sidebar.expand) : t(strings.sidebar.collapse)}
              aria-pressed={!collapsed}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300/70 bg-white/90 text-slate-600 transition-colors hover:bg-slate-200 dark:border-slate-600/70 dark:bg-slate-800/80 dark:text-slate-100 dark:hover:bg-slate-700"
            >
              {collapsed ? <FiChevronLeft className="h-4 w-4" /> : <FiChevronRight className="h-4 w-4" />}
            </button>
          </div>
        )}

      {!collapseEnabled || !collapsed ? (
        <div className="flex-1 min-h-0">
          <div className="flex h-full flex-col overflow-hidden">
            <div
              className={cn(
                "flex-1 overflow-y-auto",
                isDragging && isMobileViewport && "overflow-y-hidden"
              )}
              data-dragging={isDragging && isMobileViewport ? "1" : "0"}
            >
              <div className="sticky top-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur px-3 py-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder={t(strings.sidebar.searchPlaceholder)}
                  className="w-full rounded-md border border-slate-300/70 bg-white/90 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-accent-light focus:outline-none focus:ring-2 focus:ring-accent-light/30 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100"
                />
              </div>
              <ul className="space-y-1.5 py-2">
                {filteredFavorites.length > 0 && (
                  <li className="px-4">
                    <button
                      type="button"
                      className={cn(
                        "flex w-full items-center justify-between rounded-md border border-transparent px-3 py-2 text-left text-sm font-semibold transition-colors",
                        favoritesOpen
                          ? "bg-slate-200/80 text-slate-900 dark:bg-slate-800/70 dark:text-slate-100"
                          : "text-slate-600 hover:border-slate-300 hover:bg-slate-100 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-800/60"
                      )}
                      onClick={() => setFavoritesOpen((prev) => !prev)}
                      aria-expanded={favoritesOpen}
                      aria-controls="sidebar-favorites"
                    >
                      <span>{t(strings.sidebar.favorites)}</span>
                      <span className="text-slate-500 dark:text-slate-400" aria-hidden>
                        <FiChevronDown
                          className={cn(
                            "h-4 w-4 transition-transform",
                            favoritesOpen && "rotate-180"
                          )}
                        />
                      </span>
                    </button>
                    <div
                      id="sidebar-favorites"
                      ref={(node) => {
                        if (node) {
                          listRefs.current[FAVORITES_KEY] = node;
                        } else {
                          delete listRefs.current[FAVORITES_KEY];
                        }
                      }}
                      className="max-h-0 rounded-lg border border-slate-200/80 bg-white/80 pt-1 dark:border-slate-800/70 dark:bg-slate-900/80 overflow-hidden transition-[max-height,opacity] duration-400 ease-in-out"
                      aria-hidden={!favoritesOpen || collapsed}
                    >
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleFavoriteReorder}
                        modifiers={[restrictToVerticalAxis, restrictToParentElement]}
                      >
                        <SortableContext
                          items={filteredFavorites.map(({ id }) => id)}
                          strategy={verticalListSortingStrategy}
                        >
                          <ul className="py-2 space-y-1">
                            {filteredFavorites.map(({ id, resort, stream }) => (
                              <FavoriteSortableItem
                                key={`favorite-${id}`}
                                id={id}
                                handleLabel={t(strings.sidebar.favoriteReorder)}
                              >
                                {renderStreamAction({
                                  resort,
                                  stream,
                                  streamId: id,
                                  tabIndex: favoritesOpen && !collapsed ? 0 : -1,
                                  showResortLabel: true,
                                  syncAccordion: false,
                                })}
                              </FavoriteSortableItem>
                            ))}
                          </ul>
                        </SortableContext>
                      </DndContext>
                    </div>
                  </li>
                )}

                {filteredResorts.map(({ resort, streamIds }) => {
                  const resortSlug = getResortSlug(resort);
                  const isActiveResort = !collapsed && currentResort === resort;
                  const hasSelectedStream = activeStreamId
                    ? resort.streams.some((stream) => getStreamIdentifier(resort, stream) === activeStreamId)
                    : false;

                  return (
                    <li
                      key={resort.homepage}
                      className={cn(
                        "px-4 rounded-xl",
                        isActiveResort && "bg-slate-50/80 dark:bg-slate-800/40",
                        hasSelectedStream && !isActiveResort && "bg-accent-light/10 dark:bg-accent-dark/10"
                      )}
                    >
                      <button
                        className={cn(
                          "flex w-full items-center justify-between rounded-md border border-transparent px-3 py-2 text-left text-sm font-semibold transition-colors",
                          isActiveResort
                            ? "bg-slate-200/80 text-slate-900 dark:bg-slate-800/70 dark:text-slate-100"
                            : hasSelectedStream
                              ? "border-accent-light/70 bg-accent-light/10 text-slate-800 dark:border-accent-dark/60 dark:bg-accent-dark/10 dark:text-slate-100"
                              : "text-slate-600 hover:border-slate-300 hover:bg-slate-100 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-800/60"
                        )}
                        onClick={() => resortSelected(resort)}
                        aria-expanded={isActiveResort}
                        aria-controls={`resort-${resort.homepage}-streams`}
                      >
                        <div className="flex items-center gap-2">
                          <span>{t(resort.name)}</span>
                          {resortSlug && <WeatherBadge resortSlug={resortSlug} priority />}
                        </div>
                        <span className="text-slate-500 dark:text-slate-400" aria-hidden>
                          <FiChevronDown
                            className={cn(
                              "h-4 w-4 transition-transform",
                              isActiveResort && "rotate-180"
                            )}
                          />
                        </span>
                      </button>

                      <ul
                        id={`resort-${resort.homepage}-streams`}
                        ref={(node) => {
                          if (node) {
                            listRefs.current[resort.homepage] = node;
                          } else {
                            delete listRefs.current[resort.homepage];
                          }
                        }}
                        className="max-h-0 rounded-lg border border-slate-200/80 bg-white/80 pt-1 dark:border-slate-800/70 dark:bg-slate-900/80 overflow-hidden transition-[max-height,opacity] duration-400 ease-in-out"
                        aria-hidden={!isActiveResort}
                      >
                        <li className="px-2 pt-3" aria-hidden={!isActiveResort}>
                          <div className="flex items-center">
                            {resortSlug ? (
                              <Link
                                to={`/resorts/${resortSlug}/weather`}
                                className="group flex flex-1 items-center justify-between rounded-md px-2 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/60"
                                tabIndex={isActiveResort ? 0 : -1}
                              >
                                <span>{t(strings.sidebar.weather)}</span>
                                <FiChevronRight
                                  className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-0.5 dark:text-slate-500"
                                  aria-hidden
                                />
                              </Link>
                            ) : (
                              <span
                                className="flex flex-1 items-center justify-between rounded-md px-2 py-2 text-sm font-medium text-slate-400 dark:text-slate-500"
                                aria-disabled="true"
                              >
                                {t(strings.sidebar.weather)}
                              </span>
                            )}
                            {gridEnabled && resortSlug && onAddToGrid && (() => {
                              const alreadyPinned = gridStreamIds?.has(`weather:${resortSlug}`) ?? false;
                              if (alreadyPinned) {
                                // When already on the dashboard, render a tiny
                                // muted check that doesn't beg for attention but
                                // signals "this one's pinned".
                                return (
                                  <span
                                    className="ml-1 inline-flex h-9 w-9 shrink-0 items-center justify-center text-sky-600 dark:text-sky-300"
                                    aria-hidden
                                    title={t(strings.sidebar.pinnedToDashboard)}
                                  >
                                    <FiCheck className="h-4 w-4" />
                                  </span>
                                );
                              }
                              return (
                                <button
                                  type="button"
                                  title={t(strings.sidebar.pinWeatherToDashboard)}
                                  aria-label={t(strings.sidebar.pinWeatherToDashboard)}
                                  onClick={() => {
                                    onAddToGrid([
                                      { type: "weather", resort, resortSlug },
                                    ]);
                                  }}
                                  tabIndex={isActiveResort ? 0 : -1}
                                  className="ml-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-sky-600 dark:text-slate-500 dark:hover:bg-slate-800/60 dark:hover:text-sky-300"
                                >
                                  <FiPlus className="h-4 w-4" aria-hidden />
                                </button>
                              );
                            })()}
                          </div>
                        </li>
                        {resortSlug && (
                          <li className="px-2" aria-hidden={!isActiveResort}>
                            <Link
                              to={`/resorts/${resortSlug}`}
                              className="flex items-center justify-between rounded-md px-2 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/60"
                              tabIndex={isActiveResort ? 0 : -1}
                            >
                              <span>{t(strings.sidebar.details)}</span>
                              <span className="text-xs uppercase tracking-wide text-slate-400">→</span>
                            </Link>
                          </li>
                        )}

                        {streamIds.map((streamId) => {
                          const entry = streamLookup.get(streamId);
                          if (!entry) return null;
                          const { stream } = entry;
                          return (
                            <DraggableStreamItem
                              key={streamId}
                              streamId={streamId}
                              itemType="webcam"
                              resort={resort}
                              stream={stream}
                              resortSlug={resortSlug}
                              tabIndex={isActiveResort ? 0 : -1}
                              isActive={isActiveResort}
                              dragEnabled={gridEnabled}
                              dragHandleOnly={!desktopDndEnabled}
                              useManualHandleDrag={isMobileViewport}
                              onMobileHandleDragStart={onMobileHandleDragStart}
                              onMobileHandleDragMove={onMobileHandleDragMove}
                              onMobileHandleDragEnd={onMobileHandleDragEnd}
                              renderContent={() =>
                                renderStreamAction({
                                  resort,
                                  stream,
                                  streamId,
                                  tabIndex: isActiveResort ? 0 : -1,
                                  showResortLabel: false,
                                  syncAccordion: true,
                                })
                              }
                            />
                          );
                        })}
                        
                        <li aria-hidden className="px-2 pb-3" />
                      </ul>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center text-xs uppercase tracking-[0.3em] text-slate-400">
          <span className="-rotate-90 whitespace-nowrap">{t(strings.sidebar.expand)}</span>
        </div>
      )}
      </div>
    </aside>
  );
}

type FavoriteSortableItemProps = {
  id: string;
  handleLabel: string;
  children: ReactNode;
};

type DraggableStreamItemProps = {
  streamId: string;
  itemType: DashboardItemType;
  resort: Resort;
  stream?: Stream;
  resortSlug?: string;
  tabIndex: number;
  isActive: boolean;
  dragEnabled: boolean;
  dragHandleOnly: boolean;
  useManualHandleDrag: boolean;
  onMobileHandleDragStart?: (
    payload: { type: DashboardItemType; stream?: Stream; resort: Resort; streamId: string; resortSlug?: string },
    point: { x: number; y: number }
  ) => void;
  onMobileHandleDragMove?: (point: { x: number; y: number }) => void;
  onMobileHandleDragEnd?: (
    payload: { type: DashboardItemType; stream?: Stream; resort: Resort; streamId: string; resortSlug?: string },
    point: { x: number; y: number }
  ) => void;
  renderContent: () => ReactNode;
};

function DraggableStreamItem({
  streamId,
  itemType,
  resort,
  stream,
  resortSlug,
  isActive,
  dragEnabled,
  dragHandleOnly,
  useManualHandleDrag,
  onMobileHandleDragStart,
  onMobileHandleDragMove,
  onMobileHandleDragEnd,
  renderContent,
}: DraggableStreamItemProps) {
  const { t } = useI18n();
  const draggableId = `sidebar-${streamId}`;
  const isManualDraggingRef = useRef(false);
  const activePointerIdRef = useRef<number | null>(null);
  const payload = { type: itemType, stream, resort, streamId, resortSlug };
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: draggableId,
    disabled: !dragEnabled,
    data: {
      type: "stream",
      payload,
    },
  });

  const style: CSSProperties = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.75 : 1,
    touchAction: dragEnabled && !dragHandleOnly ? "none" : "auto",
  };

  useEffect(() => {
    if (!useManualHandleDrag) return;

    const handlePointerMove = (event: globalThis.PointerEvent) => {
      if (!isManualDraggingRef.current) return;
      if (activePointerIdRef.current !== null && event.pointerId !== activePointerIdRef.current) return;
      onMobileHandleDragMove?.({ x: event.clientX, y: event.clientY });
    };

    const handlePointerEnd = (event: globalThis.PointerEvent) => {
      if (!isManualDraggingRef.current) return;
      if (activePointerIdRef.current !== null && event.pointerId !== activePointerIdRef.current) return;
      isManualDraggingRef.current = false;
      activePointerIdRef.current = null;
      onMobileHandleDragEnd?.(payload, { x: event.clientX, y: event.clientY });
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerEnd);
    window.addEventListener("pointercancel", handlePointerEnd);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerEnd);
      window.removeEventListener("pointercancel", handlePointerEnd);
    };
  }, [onMobileHandleDragEnd, onMobileHandleDragMove, payload, useManualHandleDrag]);

  return (
    <li
      className="px-2"
      aria-hidden={!isActive}
      ref={setNodeRef}
      style={style}
      {...(dragEnabled && !dragHandleOnly ? attributes : {})}
      {...(dragEnabled && !dragHandleOnly ? listeners : {})}
    >
      {dragEnabled && dragHandleOnly ? (
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label={t(strings.dashboardGrid.dragToReorder)}
            className="flex h-9 w-9 shrink-0 touch-none items-center justify-center rounded-md border border-dashed border-slate-300/70 bg-white/80 text-slate-400 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-400"
            {...(useManualHandleDrag
              ? {
                  onPointerDown: (event: PointerEvent<HTMLButtonElement>) => {
                    event.preventDefault();
                    event.stopPropagation();
                    isManualDraggingRef.current = true;
                    activePointerIdRef.current = event.pointerId;
                    onMobileHandleDragStart?.(payload, { x: event.clientX, y: event.clientY });
                  },
                }
              : { ...attributes, ...listeners })}
          >
            <RxDragHandleDots2 className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1">{renderContent()}</div>
        </div>
      ) : (
        renderContent()
      )}
    </li>
  );
}

function FavoriteSortableItem({ id, handleLabel, children }: FavoriteSortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li ref={setNodeRef} style={style} className="px-2">
      <div
        className={cn(
          "flex min-w-0 items-center gap-2 rounded-lg border border-slate-100/70 bg-white/90 px-2 py-1 dark:border-slate-800/70 dark:bg-slate-900/70",
          isDragging && "shadow-lg ring-2 ring-amber-300/70 dark:ring-amber-400/60"
        )}
      >
        <button
          type="button"
          className="flex h-10 w-12 touch-none items-center justify-center rounded-md border border-dashed border-slate-300/70 text-slate-400 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-amber-400 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 md:w-6"
          aria-label={handleLabel}
          {...attributes}
          {...listeners}
        >
          <RxDragHandleDots2 className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </li>
  );
}

export default Sidebar;
