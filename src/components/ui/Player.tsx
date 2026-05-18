"use client";

import { useRef, useEffect, useState } from "react";
import Hls from "hls.js";
import { Stream, StreamType } from "@/data/Util";
import { useI18n } from "@/lib/i18n/context";
import { strings } from "@/lib/i18n/strings";
import VivaldiPlayer from "@/components/ui/vivaldi/VivaldiPlayer";
import { useWeather } from "@/hooks/useWeather";
import { FiCamera, FiChevronDown, FiChevronUp, FiDroplet, FiExternalLink, FiWind } from "react-icons/fi";
import { cn } from "@/lib/utils";

// Iframe load timeout — used as a heuristic for mixed-content blocks, which
// fail silently in many browsers (no onerror fires). 8s gives the frame
// plenty of room to load before we surface the external-link UX.
const IFRAME_LOAD_TIMEOUT_MS = 8000;

type LoadState = "loading" | "playing" | "failed";

type PlayerProps = {
  stream: Stream;
  resortSlug?: string;
  showSummary?: boolean;
  rounded?: boolean;
  capturePlacement?: "top-right" | "bottom-right" | "bottom-left";
  compactCapture?: boolean;
};

function Player({
  stream,
  resortSlug,
  showSummary = true,
  rounded = true,
  capturePlacement = "top-right",
  compactCapture = false,
}: PlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const { t } = useI18n();
  const { status: summaryStatus, data: summaryData } = useWeather(resortSlug, {
    mode: "now",
    enabled: Boolean(resortSlug) && showSummary,
  });
  const [summaryOpen, setSummaryOpen] = useState(() => {
    if (typeof window === "undefined") {
      return true;
    }
    return !window.matchMedia("(max-width: 768px)").matches;
  });
  const [isMobile, setIsMobile] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [overlayActive, setOverlayActive] = useState(false);
  const [loadState, setLoadState] = useState<LoadState>("loading");

  useEffect(() => {
    // Reset whenever the underlying stream changes.
    if (stream.type === StreamType.Unavailable) {
      setLoadState("loading");
      return;
    }
    setLoadState("loading");

    const video = videoRef.current;
    if (stream.type === StreamType.HLS && video) {
      if (Hls.isSupported()) {
        const hls = new Hls();
        hls.loadSource(stream.url);
        hls.attachMedia(video);
        const onHlsError = (_evt: unknown, data: { fatal?: boolean }) => {
          if (data?.fatal) setLoadState("failed");
        };
        hls.on(Hls.Events.ERROR, onHlsError);
        const onPlaying = () => setLoadState("playing");
        video.addEventListener("playing", onPlaying);
        return () => {
          hls.off(Hls.Events.ERROR, onHlsError);
          video.removeEventListener("playing", onPlaying);
          hls.destroy();
        };
      } else {
        // Native HLS path (Safari). The video element fires error/playing.
        video.src = stream.url;
        const onError = () => setLoadState("failed");
        const onPlaying = () => setLoadState("playing");
        video.addEventListener("error", onError);
        video.addEventListener("playing", onPlaying);
        return () => {
          video.removeEventListener("error", onError);
          video.removeEventListener("playing", onPlaying);
        };
      }
    }
  }, [stream]);

  // Iframe load timer: mixed-content blocks fire no onerror in most
  // browsers, so we trip "failed" after the timeout if onLoad never fired.
  useEffect(() => {
    if (stream.type !== StreamType.IFrame) return;
    if (loadState !== "loading") return;
    const timer = setTimeout(() => {
      setLoadState((prev) => (prev === "loading" ? "failed" : prev));
    }, IFRAME_LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [stream, loadState]);

  const streamTitle = t(stream.name);
  const canCapture = stream.type === StreamType.HLS;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const query = window.matchMedia("(max-width: 768px)");
    const update = (event: MediaQueryList | MediaQueryListEvent) => {
      if (isMediaQueryList(event)) {
        setIsMobile(event.matches);
      } else {
        const target = event.currentTarget ?? event.target;
        if (target && isMediaQueryList(target as MediaQueryList)) {
          setIsMobile((target as MediaQueryList).matches);
        } else {
          setIsMobile(false);
        }
      }
    };
    update(query);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    setSummaryOpen(!isMobile);
    setOverlayActive(!isMobile);
  }, [stream, resortSlug, isMobile, showSummary]);

  useEffect(() => {
    if (!captureError) return;
    const timeout = setTimeout(() => setCaptureError(null), 2500);
    return () => clearTimeout(timeout);
  }, [captureError]);

  const handleCapture = () => {
    if (!canCapture || !videoRef.current) {
      setCaptureError(t(strings.player.captureError));
      return;
    }
    const video = videoRef.current;
    if (!video.videoWidth || !video.videoHeight) {
      setCaptureError(t(strings.player.captureError));
      return;
    }
    try {
      setIsCapturing(true);
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("Unable to capture frame");
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        setIsCapturing(false);
        if (!blob) {
          setCaptureError(t(strings.player.captureError));
          return;
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `skiwatch-${Date.now()}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }, "image/png");
    } catch (error) {
      setIsCapturing(false);
      setCaptureError(t(strings.player.captureError));
    }
  };

  const overlayOpacityClass = overlayActive ? "opacity-100" : "opacity-30";
  const capturePositionClass =
    capturePlacement === "bottom-right"
      ? "bottom-4 right-4"
      : capturePlacement === "bottom-left"
        ? "bottom-4 left-4"
        : "right-4 top-4";
  const captureErrorPositionClass =
    capturePlacement === "bottom-right"
      ? "bottom-16 right-4"
      : capturePlacement === "bottom-left"
        ? "bottom-16 left-4"
        : "right-4 top-16";

  return (
    <div
      className={cn(
        "relative w-full shrink-0 md:flex-1 md:shrink flex aspect-video md:aspect-auto min-h-0 md:h-full flex-col items-center justify-center bg-slate-200/70 dark:bg-slate-800/60 transition-colors overflow-hidden",
        rounded && "rounded-xl"
      )}
      onMouseEnter={() => !isMobile && setOverlayActive(true)}
      onMouseLeave={() => !isMobile && setOverlayActive(false)}
      onFocusCapture={() => setOverlayActive(true)}
      onBlurCapture={() => !isMobile && setOverlayActive(false)}
    >
      {canCapture && (
        <button
          type="button"
          onClick={handleCapture}
          disabled={isCapturing}
          className={cn(
            "absolute z-30 inline-flex items-center rounded-md border border-slate-200/70 bg-white/80 text-xs font-semibold text-slate-600 shadow backdrop-blur hover:bg-white disabled:opacity-60 dark:border-slate-700/70 dark:bg-slate-900/80 dark:text-slate-100 transition-opacity",
            capturePositionClass,
            compactCapture ? "h-8 w-8 justify-center p-0" : "gap-1 px-3 py-1",
            overlayOpacityClass
          )}
          aria-label={isCapturing ? t(strings.player.captureSaving) : t(strings.player.capture)}
        >
          <FiCamera className="h-3.5 w-3.5" />
          {!compactCapture && (isCapturing ? t(strings.player.captureSaving) : t(strings.player.capture))}
        </button>
      )}
      {stream.type === StreamType.Unavailable ? (
        <div className="flex flex-col items-center gap-2 p-6 text-center text-slate-600 dark:text-slate-300">
          <p className="text-base font-semibold">{t(strings.player.emptyTitle)}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">{t(strings.player.emptyBody)}</p>
        </div>
      ) : loadState === "failed" ? (
        <div className="flex flex-col items-center gap-3 p-6 text-center text-slate-700 dark:text-slate-200">
          <p className="text-base font-semibold">{t(strings.player.mixedContentTitle)}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">{t(strings.player.mixedContentBody)}</p>
          <a
            href={stream.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
          >
            <FiExternalLink className="h-4 w-4" />
            {t(strings.player.openExternally)}
          </a>
        </div>
      ) : (
        <div className="h-full w-full overflow-hidden">
          {stream.type === StreamType.Vivaldi ? (
            <VivaldiPlayer stream={stream} />
          ) : stream.type === StreamType.IFrame ? (
            <iframe
              className="h-full w-full"
              src={stream.url}
              title={streamTitle}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              onLoad={() => setLoadState("playing")}
              onError={() => setLoadState("failed")}
            ></iframe>
          ) : (
            <video
              ref={videoRef}
              controls
              autoPlay
              muted
              playsInline
              aria-label={streamTitle}
              className="h-full w-full bg-black object-contain"
            />
          )}
        </div>
      )}
      {captureError && (
        <div className={cn("pointer-events-none absolute rounded-md bg-rose-500/90 px-3 py-1 text-xs font-semibold text-white shadow", captureErrorPositionClass)}>
          {captureError}
        </div>
      )}
      {showSummary && resortSlug && summaryData && summaryStatus === "success" && summaryOpen && (
        <div
          className={`pointer-events-auto absolute left-4 top-4 z-[999] rounded-2xl border border-white/40 bg-white/90 px-4 py-3 text-sm text-slate-700 shadow-lg backdrop-blur dark:border-slate-800/60 dark:bg-slate-900/90 dark:text-slate-200 transition-opacity ${overlayOpacityClass}`}
        >
          <button
            type="button"
            onClick={() => setSummaryOpen(false)}
            className="absolute -top-2 right-2 rounded-full border border-slate-200 bg-white/80 p-1 text-slate-500 shadow dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300"
          >
            <FiChevronDown className="h-3 w-3" />
          </button>
          <p className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">{t(strings.resortPage.weather)}</p>
          <div className="mt-1 flex items-center gap-3">
            <span className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {summaryData.summary.temperature !== undefined ? `${summaryData.summary.temperature.toFixed(1)}°C` : "—"}
            </span>
            {summaryData.summary.windSpeed !== undefined && (
              <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-300">
                <FiWind className="h-3.5 w-3.5" />
                {summaryData.summary.windSpeed.toFixed(1)} m/s
              </span>
            )}
            {summaryData.summary.humidity !== undefined && (
              <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-300">
                <FiDroplet className="h-3.5 w-3.5" />
                {summaryData.summary.humidity}%
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">{t(strings.resortPage.conditions[summaryData.summary.condition])}</p>
          {stream.type === StreamType.Vivaldi && (
            <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">
              <a href="https://github.com/hletrd/slopes" target="_blank" rel="noreferrer" className="underline">
                Vivaldi webcam by hletrd/slopes
              </a>{" "}
              <a href="https://ski.atik.kr" target="_blank" rel="noreferrer" className="underline">
                (live page)
              </a>
            </p>
          )}
        </div>
      )}
      {showSummary && resortSlug && summaryData && summaryStatus === "success" && !summaryOpen && (
        <button
          type="button"
          onClick={() => setSummaryOpen(true)}
          className={`absolute left-4 top-4 z-[999] inline-flex items-center gap-1 rounded-full border border-slate-200/70 bg-white/80 px-3 py-1 text-xs font-semibold text-slate-600 shadow hover:bg-white dark:border-slate-700/70 dark:bg-slate-900/80 dark:text-slate-100 transition-opacity ${overlayOpacityClass}`}
        >
          <FiChevronUp className="h-3 w-3" />
          {t(strings.resortPage.weather)}
        </button>
      )}
    </div>
  );
}

export default Player;

function isMediaQueryList(value: unknown): value is MediaQueryList {
  return typeof (value as MediaQueryList)?.matches === "boolean";
}
