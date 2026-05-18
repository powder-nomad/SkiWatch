import { SortableContext, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { FiMaximize2, FiMinimize2, FiMoreVertical, FiX } from "react-icons/fi";
import { RxDragHandleDots2 } from "react-icons/rx";
import Player from "@/components/ui/Player";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { CSSProperties } from "react";
import { useI18n } from "@/lib/i18n/context";
import { strings } from "@/lib/i18n/strings";

import { DashboardItem } from "@/components/ui/DashboardTypes";
import { WeatherWidget } from "@/components/widgets/WeatherWidget";
import { SlopesWidget } from "@/components/widgets/SlopesWidget";

type DashboardGridProps = {
  items: DashboardItem[];
  onRemove: (id: string) => void;
  onToggleSpan: (id: string) => void;
  onResize: (id: string, colSpan: number, rowSpan: number) => void;
  isDropping?: boolean;
  dropRef?: (node: HTMLDivElement | null) => void;
  isOver?: boolean;
  isMobileViewport?: boolean;
};

export function DashboardGrid({
  items,
  onRemove,
  onToggleSpan,
  onResize,
  isDropping,
  dropRef,
  isOver,
  isMobileViewport = false,
}: DashboardGridProps) {
  const { t } = useI18n();
  const showDropHighlight = Boolean(isOver || isDropping);
  // Mobile: single column so each tile gets the full ~358 px width
  // and stays watchable. Desktop: 2 columns up to 4 tiles, then 3.
  const columns = isMobileViewport ? 1 : items.length <= 2 ? 2 : items.length <= 4 ? 2 : 3;
  const totalCells = items.reduce((sum, item) => sum + item.colSpan * item.rowSpan, 0);
  const largestRowSpan = items.reduce((max, item) => Math.max(max, item.rowSpan), 1);
  const rows = Math.max(largestRowSpan, Math.ceil(totalCells / columns));

  return (
    <div
      ref={dropRef}
      data-testid="grid-drop-zone"
      className={cn(
        "h-full w-full rounded-lg border border-slate-200/70 bg-white/70 p-3 shadow-sm backdrop-blur dark:border-slate-800/70 dark:bg-slate-900/60",
        showDropHighlight && "ring-2 ring-accent-light/60 dark:ring-accent-dark/60"
      )}
    >
      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-3 py-6 text-center text-slate-500 dark:text-slate-300">
          <p className="text-sm font-semibold">{t(strings.dashboardGrid.emptyTitle)}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{t(strings.dashboardGrid.emptyBody)}</p>
        </div>
      ) : (
        <SortableContext items={items} strategy={rectSortingStrategy}>
          <div
            className={cn("grid min-h-0 gap-3", isMobileViewport ? "h-auto content-start" : "h-full")}
            style={{
              gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
              gridTemplateRows: isMobileViewport ? undefined : `repeat(${rows}, minmax(0, 1fr))`,
              gridAutoFlow: "dense",
              // Mobile rows size to each tile's 16:9 aspect (set on the
              // tile itself, see DashboardGridTile). Desktop keeps fixed
              // grid rows so colSpan/rowSpan resize semantics work.
              gridAutoRows: undefined,
            }}
          >
            {items.map((item) => (
              <DashboardGridTile
                key={item.id}
                item={item}
                maxCols={columns}
                maxRows={rows}
                isMobileViewport={isMobileViewport}
                onRemove={() => onRemove(item.id)}
                onToggleSpan={() => onToggleSpan(item.id)}
                onResize={(colSpan, rowSpan) => onResize(item.id, colSpan, rowSpan)}
              />
            ))}
          </div>
        </SortableContext>
      )}
    </div>
  );
}

type DashboardGridTileProps = {
  item: DashboardItem;
  maxCols: number;
  maxRows: number;
  isMobileViewport?: boolean;
  onRemove: () => void;
  onToggleSpan: () => void;
  onResize: (colSpan: number, rowSpan: number) => void;
};

function DashboardGridTile({ item, maxCols, maxRows, isMobileViewport = false, onRemove, onToggleSpan, onResize }: DashboardGridTileProps) {
  const { t } = useI18n();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    data: { type: "grid" },
  });
  const tileRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    gridColumn: `span ${item.colSpan}`,
    gridRow: `span ${item.rowSpan}`,
  };

  const handleResizePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const tile = tileRef.current;
    if (!tile) return;

    const rect = tile.getBoundingClientRect();
    const startX = event.clientX;
    const startY = event.clientY;
    const cellWidth = rect.width / Math.max(1, item.colSpan);
    const cellHeight = rect.height / Math.max(1, item.rowSpan);

    const onMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      const nextCols = Math.max(1, Math.min(maxCols, Math.round((rect.width + deltaX) / cellWidth)));
      const nextRows = Math.max(1, Math.min(maxRows, Math.round((rect.height + deltaY) / cellHeight)));
      if (nextCols !== item.colSpan || nextRows !== item.rowSpan) {
        onResize(nextCols, nextRows);
      }
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (menuRef.current?.contains(event.target as Node)) {
        return;
      }
      setMenuOpen(false);
    };

    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [menuOpen]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn("relative", menuOpen && "z-[90]")}
    >
      <div
        ref={tileRef}
        className={cn(
          "group relative w-full overflow-visible rounded-xl border border-slate-200/80 bg-slate-100/80 shadow-sm ring-0 backdrop-blur transition hover:ring-2 hover:ring-accent-light/50 dark:border-slate-800/80 dark:bg-slate-800/50 dark:hover:ring-accent-dark/60",
          // Mobile: each tile is full-width and self-sizes to 16:9 so
          // the cam image fills the cell with no letterbox. Desktop:
          // keep h-full so the grid row controls height.
          isMobileViewport ? "aspect-video" : "h-full",
          isDragging && "z-30 scale-[1.01] ring-2 ring-accent-light/70 dark:ring-accent-dark/80"
        )}
      >
        <div className="absolute inset-0 overflow-hidden rounded-xl">
          {item.type === "webcam" && item.stream && (
            <Player
              stream={item.stream}
              resortSlug={item.resortSlug}
              showSummary={false}
              rounded={false}
              capturePlacement="bottom-right"
              compactCapture
              bare={isMobileViewport}
            />
          )}
          {item.type === "weather" && item.resortSlug && (
            <WeatherWidget resortSlug={item.resortSlug} />
          )}
          {item.type === "slopes" && item.resortSlug && (
            <SlopesWidget resortSlug={item.resortSlug} />
          )}
          <div className="absolute inset-x-0 bottom-0 z-10 flex items-center justify-between bg-gradient-to-t from-black/60 via-black/20 to-transparent px-3 pb-3 pt-10 text-sm font-semibold text-white drop-shadow pointer-events-none">
            <span className="line-clamp-2">{item.label}</span>
          </div>
        </div>
        <div className="absolute left-2 top-2 z-20 flex items-center gap-1 text-slate-500 dark:text-slate-200">
          <button
            type="button"
            aria-label={t(strings.dashboardGrid.dragToReorder)}
            className="inline-flex h-8 w-8 touch-none items-center justify-center rounded-md border border-slate-200/60 bg-white/90 p-0 shadow-sm backdrop-blur hover:bg-white dark:border-slate-700/70 dark:bg-slate-900/80"
            {...attributes}
            {...listeners}
          >
            <RxDragHandleDots2 className="h-4 w-4" />
          </button>
          <div ref={menuRef} className="relative">
            <button
              type="button"
              aria-label={t(strings.dashboardGrid.moreOptions)}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200/60 bg-white/90 p-0 shadow-sm backdrop-blur hover:bg-white dark:border-slate-700/70 dark:bg-slate-900/80"
            >
              <FiMoreVertical className="h-4 w-4" />
            </button>
            {menuOpen && (
              <div className="absolute left-0 top-10 z-[120] min-w-40 rounded-xl border border-slate-200/80 bg-white/95 p-1.5 shadow-lg backdrop-blur dark:border-slate-700/70 dark:bg-slate-900/95">
                {!isMobileViewport && (
                  <button
                    type="button"
                    onClick={() => {
                      onToggleSpan();
                      setMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800"
                  >
                    {item.colSpan > 1 ? <FiMinimize2 className="h-4 w-4" /> : <FiMaximize2 className="h-4 w-4" />}
                    <span>{item.colSpan > 1 ? t(strings.dashboardGrid.shrinkTile) : t(strings.dashboardGrid.expandTile)}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    onRemove();
                    setMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-500/10"
                >
                  <FiX className="h-4 w-4" />
                  <span>{t(strings.dashboardGrid.removeFromGrid)}</span>
                </button>
              </div>
            )}
          </div>
        </div>
        <button
          type="button"
          aria-label={t(strings.dashboardGrid.resizeTile)}
          onPointerDown={handleResizePointerDown}
          className="absolute bottom-1 right-1 z-20 hidden h-5 w-5 cursor-se-resize rounded-sm border border-slate-200/70 bg-white/90 text-slate-500 opacity-0 shadow-sm transition-opacity group-hover:opacity-100 focus-visible:opacity-100 dark:border-slate-700/70 dark:bg-slate-900/90 dark:text-slate-300 sm:block"
        >
          ↘
        </button>
      </div>
    </div>
  );
}
