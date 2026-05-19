import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n/context";
import { strings } from "@/lib/i18n/strings";

export const GA_MEASUREMENT_ID = "G-E9ZGDC0F8M";
export const GA_DISABLE_KEY = `ga-disable-${GA_MEASUREMENT_ID}`;
const CONSENT_STORAGE_KEY = "analytics-consent";
const CONSENT_COOKIE = "analytics_consent";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export type ConsentStatus = "granted" | "denied" | "unset";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: any[]) => void;
  }
}

let gtagScriptPromise: Promise<void> | null = null;
let gtagInitialized = false;

function readCookie(name: string) {
  if (typeof document === "undefined") return null;
  const match = document.cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split("=")[1]) : null;
}

function writeCookie(name: string, value: string, maxAgeSeconds: number) {
  if (typeof document === "undefined") return;
  const base = `${name}=${encodeURIComponent(value)}; max-age=${maxAgeSeconds}; path=/; SameSite=Lax`;
  const hostname = window.location.hostname;
  const parts = hostname.split(".");
  const rootDomain = parts.length > 2 ? `.${parts.slice(-2).join(".")}` : undefined;
  document.cookie = base;
  document.cookie = `${base}; domain=${hostname}`;
  if (rootDomain) {
    document.cookie = `${base}; domain=${rootDomain}`;
  }
}

function deleteCookie(name: string) {
  if (typeof document === "undefined") return;
  const hostname = window.location.hostname;
  const parts = hostname.split(".");
  const rootDomain = parts.length > 2 ? `.${parts.slice(-2).join(".")}` : undefined;
  const expire = `${name}=; Max-Age=0; path=/; SameSite=Lax`;
  document.cookie = expire;
  document.cookie = `${expire}; domain=${hostname}`;
  if (rootDomain) {
    document.cookie = `${expire}; domain=${rootDomain}`;
  }
}

function clearGaCookies() {
  if (typeof document === "undefined") return;
  document.cookie
    .split(";")
    .map((chunk) => chunk.trim())
    .forEach((chunk) => {
      const [name] = chunk.split("=");
      if (!name) return;
      if (name.startsWith("_ga") || name === "_gid" || name === "_gat") {
        deleteCookie(name);
      }
    });
}

function setGaDisabled(disabled: boolean) {
  (window as any)[GA_DISABLE_KEY] = disabled;
}

function ensureGtagQueue() {
  if (!window.dataLayer) {
    window.dataLayer = [];
  }
  if (typeof window.gtag !== "function") {
    window.gtag = function gtag(...args: any[]) {
      window.dataLayer?.push(args);
    };
  }
}

function loadGtagScript() {
  if (gtagScriptPromise) return gtagScriptPromise;

  const existing = document.querySelector<HTMLScriptElement>(
    `script[src="https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}"]`
  );
  if (existing && existing.dataset.loaded === "true") {
    gtagScriptPromise = Promise.resolve();
    return gtagScriptPromise;
  }

  gtagScriptPromise = new Promise<void>((resolve, reject) => {
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Failed to load gtag.js")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    script.async = true;
    script.onload = () => {
      script.dataset.loaded = "true";
      resolve();
    };
    script.onerror = () => reject(new Error("Failed to load gtag.js"));
    document.head.appendChild(script);
  });

  return gtagScriptPromise;
}

async function enableAnalytics() {
  if (typeof window === "undefined") return;
  setGaDisabled(false);
  ensureGtagQueue();
  window.gtag?.("consent", "update", { analytics_storage: "granted" });
  if (!gtagInitialized) {
    window.gtag?.("js", new Date());
  }
  await loadGtagScript();
  window.gtag?.("config", GA_MEASUREMENT_ID);
  gtagInitialized = true;
}

function disableAnalytics() {
  if (typeof window === "undefined") return;
  setGaDisabled(true);
  ensureGtagQueue();
  window.gtag?.("consent", "update", { analytics_storage: "denied" });
  window.gtag = () => undefined;
  clearGaCookies();
}

export function getStoredConsent(): ConsentStatus {
  if (typeof window === "undefined") return "unset";

  const local = window.localStorage?.getItem(CONSENT_STORAGE_KEY) as ConsentStatus | null;
  const cookie = readCookie(CONSENT_COOKIE) as ConsentStatus | null;
  const value = local ?? cookie ?? "unset";
  return value === "granted" || value === "denied" ? value : "unset";
}

function persistConsent(value: ConsentStatus) {
  if (typeof window === "undefined") return;
  if (value === "unset") {
    window.localStorage?.removeItem(CONSENT_STORAGE_KEY);
    deleteCookie(CONSENT_COOKIE);
    return;
  }
  window.localStorage?.setItem(CONSENT_STORAGE_KEY, value);
  writeCookie(CONSENT_COOKIE, value, ONE_YEAR_SECONDS);
}

export function trackPageView(path: string) {
  if (typeof window === "undefined") return;
  const disabled = (window as any)[GA_DISABLE_KEY];
  if (disabled || typeof window.gtag !== "function") return;
  if (import.meta.env.DEV) {
    // Visible-only-in-dev confirmation that events are firing. Look for
    // "[GA]" in the console to verify gtag is wired and not blocked by
    // an ad-blocker, before checking GA4 Realtime.
    // eslint-disable-next-line no-console
    console.debug("[GA] page_view", { page_path: path });
  }
  window.gtag("event", "page_view", {
    page_path: path,
  });
}

export function AnalyticsConsent() {
  const { t } = useI18n();
  const [status, setStatus] = useState<ConsentStatus>("unset");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setGaDisabled(true);
    const stored = getStoredConsent();
    setStatus(stored);
    if (stored === "granted") {
      enableAnalytics();
    } else if (stored === "denied") {
      disableAnalytics();
    }
    setVisible(stored === "unset");
  }, []);

  useEffect(() => {
    function handleOpen() {
      setVisible(true);
    }
    window.addEventListener("analytics-consent:open", handleOpen);
    return () => window.removeEventListener("analytics-consent:open", handleOpen);
  }, []);

  useEffect(() => {
    if (status === "granted") {
      enableAnalytics();
    }
    if (status === "denied") {
      disableAnalytics();
    }
    window.dispatchEvent(new CustomEvent<ConsentStatus>("analytics-consent:status", { detail: status }));
  }, [status]);

  const actions = useMemo(
    () => ({
      allow: async () => {
        persistConsent("granted");
        setStatus("granted");
        setVisible(false);
        // Race-safe first page_view: enableAnalytics is fired by the
        // `[status]` effect, but it's async (loads gtag.js). We await it
        // here too so we can fire the initial event ourselves — covers
        // the case where the user grants consent on first visit and
        // would otherwise miss the landing page_view (no location
        // change triggers App.tsx's tracker).
        await enableAnalytics();
        if (typeof window !== "undefined") {
          trackPageView(`${window.location.pathname}${window.location.search}`);
        }
      },
      decline: () => {
        persistConsent("denied");
        setStatus("denied");
        setVisible(false);
      },
      close: () => setVisible(false),
    }),
    []
  );

  if (!visible) return null;

  // Slim bottom toast. Mobile: full-width band, single-line truncated
  // message + compact buttons. Desktop: pinned bottom-right, max
  // width 576 px. Same content, no big card.
  return (
    <div
      className="fixed inset-x-3 bottom-3 z-40 mx-auto flex max-w-xl items-center gap-3 rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-sm shadow-lg backdrop-blur sm:left-auto sm:right-4 sm:mx-0 dark:border-slate-700 dark:bg-slate-900/95"
      role="region"
      aria-label={t(strings.analyticsConsent.settings)}
    >
      <p className="min-w-0 flex-1 truncate text-slate-700 dark:text-slate-200">
        {t(strings.analyticsConsent.message)}
      </p>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={actions.allow}
          className="inline-flex items-center justify-center rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
        >
          {t(strings.analyticsConsent.allow)}
        </button>
        <button
          type="button"
          onClick={actions.decline}
          className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
        >
          {t(strings.analyticsConsent.decline)}
        </button>
        {status !== "unset" && (
          <button
            type="button"
            onClick={actions.close}
            aria-label={t(strings.analyticsConsent.close)}
            title={t(strings.analyticsConsent.close)}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 dark:text-slate-300 dark:hover:text-white"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}
