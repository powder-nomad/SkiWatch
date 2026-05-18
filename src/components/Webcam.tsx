import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  closestCenter,
  CollisionDetection,
  DndContext,
  DragEndEvent,
  DragMoveEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { Resort, Stream, StreamType } from "@/data/Util";
import Sidebar from "@/components/ui/Sidebar";
import Player from "@/components/ui/Player";
import { DashboardGrid } from "@/components/ui/DashboardGrid";
import { type DashboardItem, type DashboardItemType } from "@/components/ui/DashboardTypes";
import { useI18n } from "@/lib/i18n/context";
import { createText } from "@/lib/i18n/locales";
import { strings } from "@/lib/i18n/strings";
import { useResortData, useResortIndex } from "@/lib/resortData";
import { getStreamIdentifier } from "@/lib/streamKeys";
import { cn } from "@/lib/utils";

type WebcamParams = {
  resort?: string;
  stream?: string;
  "*": string;
};

const PLAYER_DROP_ID = "player-drop";
const GRID_DROP_ID = "webcam-grid-drop";

function Webcam() {
  const params = useParams<WebcamParams>();
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useI18n();
  const { resorts } = useResortData();
  const { findStreamById, findStreamBySlugs, getResortSlug, getRouteForStream, getRouteForStreamId } = useResortIndex();

  const [currentStream, setCurrentStream] = useState<Stream | undefined>();
  const [selectedStreamId, setSelectedStreamId] = useState<string | undefined>();
  const [selectedResortHomepage, setSelectedResortHomepage] = useState<string | undefined>();
  const [selectedResortSlug, setSelectedResortSlug] = useState<string | undefined>();
  const [selectionToken, setSelectionToken] = useState(1);
  const [shouldSyncSelection, setShouldSyncSelection] = useState(true);
  const [viewItems, setViewItems] = useState<DashboardItem[]>([]);
  const [isPointerDragging, setIsPointerDragging] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [manualOverId, setManualOverId] = useState<string | null>(null);
  const lastOverIdRef = useRef<string | null>(null);
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);
  const playerDropElementRef = useRef<HTMLDivElement | null>(null);
  const gridDropElementRef = useRef<HTMLDivElement | null>(null);

  const resortOrder = useMemo(() => resorts.map((r) => r.homepage), []);
  const streamOrder = useMemo(() => {
    const next: Record<string, string[]> = {};
    resorts.forEach((resort) => {
      next[resort.homepage] = resort.streams.map((stream) => getStreamIdentifier(resort, stream));
    });
    return next;
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 8 } }),
    useSensor(KeyboardSensor)
  );

  const gridIds = useMemo(() => viewItems.map((item) => item.id), [viewItems]);
  const gridIdSet = useMemo(() => new Set(gridIds), [gridIds]);
  const isGridMode = viewItems.length > 1;
  const { setNodeRef: baseSetPlayerDropRef, isOver: isPlayerDropOver } = useDroppable({ id: PLAYER_DROP_ID });
  const { setNodeRef: baseSetGridDropRef, isOver: isGridDropOver } = useDroppable({ id: GRID_DROP_ID });

  const setPlayerDropRef = (node: HTMLDivElement | null) => {
    playerDropElementRef.current = node;
    baseSetPlayerDropRef(node);
  };

  const setGridDropRef = (node: HTMLDivElement | null) => {
    gridDropElementRef.current = node;
    baseSetGridDropRef(node);
  };

  const fallbackStream: Stream = {
    name: createText({ ko: "선택된 영상이 없습니다", en: "No stream selected" }),
    type: StreamType.Unavailable,
    url: "",
  };

  const setPrimarySelection = (entry: { resort: Resort; stream: Stream; streamId: string; resortSlug: string }) => {
    setCurrentStream(entry.stream);
    setSelectedStreamId(entry.streamId);
    setSelectedResortHomepage(entry.resort.homepage);
    setSelectedResortSlug(entry.resortSlug);
    setShouldSyncSelection(true);
    setSelectionToken((token) => token + 1);
  };

  const syncSelectionFromItems = (items: DashboardItem[]) => {
    const first = items[0];
    if (!first) {
      setCurrentStream(undefined);
      setSelectedStreamId(undefined);
      setSelectedResortHomepage(undefined);
      setSelectedResortSlug(undefined);
      setShouldSyncSelection(false);
      setSelectionToken((token) => token + 1);
      return;
    }
    const found = findStreamById(first.id);
    if (!found) {
      setCurrentStream(undefined);
      setSelectedStreamId(undefined);
      setSelectedResortHomepage(undefined);
      setSelectedResortSlug(undefined);
      setShouldSyncSelection(false);
      setSelectionToken((token) => token + 1);
      return;
    }
    setPrimarySelection({
      resort: found.resort,
      stream: found.stream,
      streamId: first.id,
      resortSlug: found.resortSlug,
    });
  };

  const toWebcamItem = (entry: { resort: Resort; stream: Stream; streamId: string; resortSlug: string }): DashboardItem => ({
    id: entry.streamId,
    type: "webcam",
    stream: entry.stream,
    resortSlug: entry.resortSlug,
    label: `${t(entry.resort.name)} · ${t(entry.stream.name)}`,
    colSpan: 1,
    rowSpan: 1,
  });

  const parseMultiPath = (pathValue: string | undefined) => {
    if (!pathValue) return [];
    return pathValue
      .split("/")
      .map((segment) => decodeURIComponent(segment.trim()))
      .filter(Boolean)
      .map((segment) => {
        const [resortSlug, streamSlug] = segment.split("~");
        if (!resortSlug || !streamSlug) return undefined;
        return { resortSlug, streamSlug };
      })
      .filter(Boolean) as { resortSlug: string; streamSlug: string }[];
  };

  const routeForItems = (items: DashboardItem[]) => {
    if (items.length === 0) return "/webcams";
    const routes = items.map((item) => getRouteForStreamId(item.id)).filter(Boolean) as {
      resortSlug: string;
      streamSlug: string;
    }[];
    if (routes.length === 0) return "/webcams";
    if (routes.length === 1) {
      return `/webcams/${routes[0].resortSlug}/${routes[0].streamSlug}`;
    }
    const segments = routes.map((route) => `${route.resortSlug}~${route.streamSlug}`);
    return `/webcams/m/${segments.join("/")}`;
  };

  const navigateForItems = (items: DashboardItem[], replace = false) => {
    const nextRoute = routeForItems(items);
    navigate(nextRoute, { replace });
  };

  useEffect(() => {
    const isMultiRoute = location.pathname.startsWith("/webcams/m");
    if (isMultiRoute) {
      const pairs = parseMultiPath(params["*"]);
      const seen = new Set<string>();
      const items: DashboardItem[] = [];
      pairs.forEach((pair) => {
        const found = findStreamBySlugs(pair.resortSlug, pair.streamSlug);
        if (!found || seen.has(found.streamId)) return;
        seen.add(found.streamId);
        items.push(
          toWebcamItem({
            resort: found.resort,
            stream: found.stream,
            streamId: found.streamId,
            resortSlug: found.resortSlug,
          })
        );
      });
      setViewItems(items);
      syncSelectionFromItems(items);
      return;
    }

    if (params.resort && params.stream) {
      const found = findStreamBySlugs(params.resort, params.stream);
      if (found) {
        const singleItem = [
          toWebcamItem({
            resort: found.resort,
            stream: found.stream,
            streamId: found.streamId,
            resortSlug: found.resortSlug,
          }),
        ];
        setViewItems(singleItem);
        setPrimarySelection({
          resort: found.resort,
          stream: found.stream,
          streamId: found.streamId,
          resortSlug: found.resortSlug,
        });
        return;
      }
    }

    setViewItems([]);
    setCurrentStream(undefined);
    setSelectedStreamId(undefined);
    setSelectedResortHomepage(undefined);
    setSelectedResortSlug(undefined);
    setShouldSyncSelection(false);
    setSelectionToken((token) => token + 1);
  }, [location.pathname, params.resort, params.stream, params["*"]]);

  const handleStreamSelect = (
    stream: Stream,
    meta: { resort: Resort; streamId: string; shouldSyncSidebar: boolean; resortSlug?: string }
  ) => {
    const resortSlug = meta.resortSlug ?? getResortSlug(meta.resort);
    const route = getRouteForStream(meta.resort, stream);
    if (!resortSlug || !route) return;

    const nextItems = [
      toWebcamItem({
        resort: meta.resort,
        stream,
        streamId: meta.streamId,
        resortSlug,
      }),
    ];
    setViewItems(nextItems);
    setCurrentStream(stream);
    setSelectedStreamId(meta.streamId);
    setSelectedResortHomepage(meta.resort.homepage);
    setSelectedResortSlug(resortSlug);
    setShouldSyncSelection(meta.shouldSyncSidebar !== false);
    setSelectionToken((token) => token + 1);

    navigate(`/webcams/${route.resortSlug}/${route.streamSlug}`);
  };

  const appendPayloadItems = (
    sourceItems: DashboardItem[],
    payloadItems: {
      type: DashboardItemType;
      stream?: Stream;
      resort: Resort;
      streamId?: string;
      resortSlug?: string;
    }[]
  ) => {
    const next = [...sourceItems];
    payloadItems.forEach((payload) => {
      if (payload.type !== "webcam" || !payload.stream || !payload.streamId) return;
      if (next.some((item) => item.id === payload.streamId)) return;
      const resortSlug = payload.resortSlug ?? getResortSlug(payload.resort);
      if (!resortSlug) return;
      next.push(
        toWebcamItem({
          resort: payload.resort,
          stream: payload.stream,
          streamId: payload.streamId,
          resortSlug,
        })
      );
    });
    return next;
  };

  const handleAddToGrid = (
    payloadItems: {
      type: DashboardItemType;
      stream?: Stream;
      resort: Resort;
      streamId?: string;
      resortSlug?: string;
    }[]
  ) => {
    if (payloadItems.length === 0) return;
    const nextItems = appendPayloadItems(viewItems, payloadItems);
    setViewItems(nextItems);
    if (nextItems.length > 0) {
      syncSelectionFromItems(nextItems);
    }
    navigateForItems(nextItems);
  };

  const handleRemoveFromGrid = (id: string) => {
    const nextItems = viewItems.filter((item) => item.id !== id);
    setViewItems(nextItems);
    syncSelectionFromItems(nextItems);
    navigateForItems(nextItems);
  };

  const handleToggleSpan = (id: string) => {
    setViewItems((items) =>
      items.map((item) =>
        item.id === id
          ? {
              ...item,
              colSpan: item.colSpan === 2 && item.rowSpan === 2 ? 1 : 2,
              rowSpan: item.colSpan === 2 && item.rowSpan === 2 ? 1 : 2,
            }
          : item
      )
    );
  };

  const handleResizeItem = (id: string, colSpan: number, rowSpan: number) => {
    setViewItems((items) =>
      items.map((item) =>
        item.id === id
          ? {
              ...item,
              colSpan,
              rowSpan,
            }
          : item
      )
    );
  };

  const handleClearGrid = () => {
    setViewItems([]);
    syncSelectionFromItems([]);
    navigateForItems([]);
  };

  const resolveDropTargetFromPoint = (point: { x: number; y: number }) => {
    const inRect = (node: HTMLElement | null) => {
      if (!node) return false;
      const rect = node.getBoundingClientRect();
      return point.x >= rect.left && point.x <= rect.right && point.y >= rect.top && point.y <= rect.bottom;
    };
    if (inRect(gridDropElementRef.current)) return GRID_DROP_ID;
    if (inRect(playerDropElementRef.current)) return PLAYER_DROP_ID;
    return null;
  };

  const handleStreamPayloadDrop = (
    payload: {
      type: DashboardItemType;
      stream?: Stream;
      resort: Resort;
      streamId: string;
      resortSlug?: string;
    },
    effectiveOverId: string | null
  ) => {
    if (!effectiveOverId) return;
    if (payload.type !== "webcam" || !payload.stream) return;

    if (effectiveOverId === GRID_DROP_ID || gridIds.includes(effectiveOverId)) {
      const nextItems = appendPayloadItems(viewItems, [payload]);
      setViewItems(nextItems);
      syncSelectionFromItems(nextItems);
      navigateForItems(nextItems);
      return;
    }

    if (effectiveOverId === PLAYER_DROP_ID && viewItems.length <= 1) {
      const nextItems = appendPayloadItems(viewItems, [payload]);
      setViewItems(nextItems);
      syncSelectionFromItems(nextItems);
      navigateForItems(nextItems);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    const resolveTargetFromPointer = () => {
      const pointer = lastPointerRef.current;
      if (!pointer) return null;
      return resolveDropTargetFromPoint(pointer);
    };

    let effectiveOverId =
      (over?.id ? String(over.id) : null) || lastOverIdRef.current || resolveTargetFromPointer();
    lastOverIdRef.current = null;
    lastPointerRef.current = null;
    setManualOverId(null);
    setIsPointerDragging(false);

    const activeType = active.data.current?.type;
    if (activeType === "stream" && !effectiveOverId) {
      effectiveOverId = viewItems.length > 1 ? GRID_DROP_ID : PLAYER_DROP_ID;
    }
    if (activeType === "grid") {
      if (!effectiveOverId || active.id === effectiveOverId) return;
      const oldIndex = gridIds.findIndex((id) => id === active.id);
      const newIndex = gridIds.findIndex((id) => id === effectiveOverId);
      if (oldIndex === -1 || newIndex === -1) return;
      const nextItems = arrayMove(viewItems, oldIndex, newIndex);
      setViewItems(nextItems);
      syncSelectionFromItems(nextItems);
      navigateForItems(nextItems);
      return;
    }

    if (activeType !== "stream") return;

    const payload = active.data.current?.payload as {
      type: DashboardItemType;
      stream?: Stream;
      resort: Resort;
      streamId: string;
      resortSlug?: string;
    };
    if (!payload) return;
    handleStreamPayloadDrop(payload, effectiveOverId);
  };

  const handleDragMove = (event: DragMoveEvent) => {
    const translated = event.active.rect.current.translated;
    if (!translated) return;
    lastPointerRef.current = {
      x: translated.left + translated.width / 2,
      y: translated.top + translated.height / 2,
    };
  };

  const handleMobileHandleDragStart = (
    _payload: {
      type: DashboardItemType;
      stream?: Stream;
      resort: Resort;
      streamId: string;
      resortSlug?: string;
    },
    point: { x: number; y: number }
  ) => {
    lastOverIdRef.current = null;
    lastPointerRef.current = point;
    setManualOverId(resolveDropTargetFromPoint(point));
    setIsPointerDragging(true);
  };

  const handleMobileHandleDragMove = (point: { x: number; y: number }) => {
    lastPointerRef.current = point;
    setManualOverId(resolveDropTargetFromPoint(point));
  };

  const handleMobileHandleDragEnd = (
    payload: {
      type: DashboardItemType;
      stream?: Stream;
      resort: Resort;
      streamId: string;
      resortSlug?: string;
    },
    point: { x: number; y: number }
  ) => {
    const effectiveOverId = manualOverId ?? resolveDropTargetFromPoint(point);
    lastOverIdRef.current = null;
    lastPointerRef.current = null;
    setManualOverId(null);
    setIsPointerDragging(false);
    handleStreamPayloadDrop(payload, effectiveOverId);
  };

  useEffect(() => {
    if (!isPointerDragging || typeof document === "undefined") return;
    if (!isMobileViewport) return;

    const originalBodyOverflow = document.body.style.overflow;
    const originalBodyOverscroll = document.body.style.overscrollBehavior;
    const originalHtmlOverscroll = document.documentElement.style.overscrollBehavior;

    const preventTouchScroll = (event: TouchEvent) => {
      event.preventDefault();
    };

    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";
    document.documentElement.style.overscrollBehavior = "none";
    document.addEventListener("touchmove", preventTouchScroll, { passive: false });

    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.body.style.overscrollBehavior = originalBodyOverscroll;
      document.documentElement.style.overscrollBehavior = originalHtmlOverscroll;
      document.removeEventListener("touchmove", preventTouchScroll);
    };
  }, [isMobileViewport, isPointerDragging]);

  useEffect(() => {
    if (!isPointerDragging || typeof window === "undefined") return;
    const onPointerMove = (event: PointerEvent) => {
      lastPointerRef.current = { x: event.clientX, y: event.clientY };
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    return () => window.removeEventListener("pointermove", onPointerMove);
  }, [isPointerDragging]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobileViewport(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const collisionDetection: CollisionDetection = (args) => {
    // For dragging from sidebar, prioritize drop target under pointer to make
    // single-view player drop reliable.
    const activeType = args.active.data.current?.type;
    if (activeType === "stream") {
      const pointerHits = pointerWithin(args);
      if (pointerHits.length > 0) {
        return pointerHits;
      }
    }
    return closestCenter(args);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      autoScroll={!isMobileViewport}
      onDragStart={() => {
        lastOverIdRef.current = null;
        lastPointerRef.current = null;
        setManualOverId(null);
        setIsPointerDragging(true);
      }}
      onDragMove={handleDragMove}
      onDragOver={({ over }) => {
        lastOverIdRef.current = over?.id ? String(over.id) : null;
      }}
      onDragCancel={() => {
        lastOverIdRef.current = null;
        lastPointerRef.current = null;
        setManualOverId(null);
        setIsPointerDragging(false);
      }}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-full w-full flex-col overflow-hidden bg-white/70 text-slate-900 backdrop-blur dark:bg-slate-900/40 dark:text-white">
        <div className="flex flex-1 min-h-0 flex-col overflow-hidden md:flex-row md:items-stretch">
          <div
            className={cn(
              "order-1 flex w-full shrink-0 flex-col md:h-full md:min-h-0 md:flex-1 md:overflow-hidden",
              isGridMode && "min-h-[58svh]"
            )}
          >
            <div
              className={cn(
                "flex w-full flex-col overflow-hidden rounded-xl border border-slate-200/70 bg-white/80 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/70 md:min-h-0 md:flex-1",
                isGridMode && "min-h-[58svh] md:min-h-0"
              )}
            >
              {isGridMode ? (
                <div className="flex h-full min-h-0 flex-col gap-2 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                      {t(strings.webcam.multiView)}: {viewItems.length}
                    </p>
                    <button
                      type="button"
                      onClick={handleClearGrid}
                      className="inline-flex items-center gap-2 rounded-md border border-slate-200/80 px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
                    >
                      {t(strings.webcam.clearAll)}
                    </button>
                  </div>
                  <DashboardGrid
                    items={viewItems}
                    onRemove={handleRemoveFromGrid}
                    onToggleSpan={handleToggleSpan}
                    onResize={handleResizeItem}
                    isDropping={isPointerDragging}
                    dropRef={setGridDropRef}
                    isOver={isGridDropOver || manualOverId === GRID_DROP_ID}
                    isMobileViewport={isMobileViewport}
                  />
                </div>
              ) : (
                <div className="relative w-full overflow-hidden md:min-h-0 md:flex-1">
                  <div
                    ref={setPlayerDropRef}
                    data-testid="player-drop-zone"
                    className={cn(
                      "absolute inset-0 z-20 flex items-center justify-center transition",
                      isPointerDragging ? "pointer-events-auto bg-slate-900/15 dark:bg-slate-100/10" : "pointer-events-none bg-transparent",
                      (isPlayerDropOver || manualOverId === PLAYER_DROP_ID) && "ring-2 ring-accent-light/60 dark:ring-accent-dark/70"
                    )}
                  />
                  <Player stream={currentStream ?? fallbackStream} resortSlug={selectedResortSlug} rounded={false} />
                </div>
              )}
            </div>
          </div>

          <div className="order-2 relative flex min-h-0 w-full flex-1 flex-col pt-3 md:h-full md:w-[320px] md:flex-none md:pt-0 lg:w-[360px]">
            <Sidebar
              data={resorts}
              resortOrder={resortOrder}
              streamOrder={streamOrder}
              gridStreamIds={gridIdSet}
              onStreamSelect={handleStreamSelect}
              onAddToGrid={handleAddToGrid}
              onRemoveFromGrid={handleRemoveFromGrid}
              selectedStreamId={selectedStreamId}
              selectedResortHomepage={selectedResortHomepage}
              selectionToken={selectionToken}
              shouldSyncSelection={shouldSyncSelection}
              isDragging={isPointerDragging}
              isMobileViewport={isMobileViewport}
              onMobileHandleDragStart={handleMobileHandleDragStart}
              onMobileHandleDragMove={handleMobileHandleDragMove}
              onMobileHandleDragEnd={handleMobileHandleDragEnd}
            />
          </div>
        </div>
      </div>
    </DndContext>
  );
}

export default Webcam;
