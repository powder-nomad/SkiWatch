import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { NavLink, BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { FiMoon, FiSun, FiMoreVertical, FiShield, FiInfo, FiCamera, FiBarChart2, FiMap } from "react-icons/fi";
// Route-level code-split. The five page components below are the only
// places hls.js / video.js / @dnd-kit / @tanstack/react-table are
// imported, so making them lazy lets Vite split them into their own
// chunks. Initial JS drops to: shell + navigation + the chunk for the
// route the user actually landed on.
const Webcam = lazy(() => import("@/components/Webcam"));
const Slopes = lazy(() => import("@/components/Slopes"));
const ResortListPage = lazy(() => import("@/components/ResortListPage"));
const ResortDetailPage = lazy(() => import("@/components/ResortDetailPage"));
const ResortWeatherPage = lazy(() => import("@/components/ResortWeatherPage"));
import { useDarkMode } from "@/hooks/useDarkMode";
import { useI18n } from "@/lib/i18n/context";
import { strings } from "@/lib/i18n/strings";
import { AnalyticsConsent, getStoredConsent, trackPageView, type ConsentStatus } from "@/components/AnalyticsConsent";
import { Locale, localeLabels, locales } from "@/lib/i18n/locales";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Seo } from "@/components/Seo";
import { ResortDataProvider } from "@/lib/resortData";

function App() {
  return (
    <BrowserRouter basename="/SkiWatch">
      <ResortDataProvider>
        <AppShell />
      </ResortDataProvider>
    </BrowserRouter>
  );
}

function AppShell() {
  const { isDark, toggle } = useDarkMode();
  const { t, locale, setLocale } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [consentStatus, setConsentStatus] = useState<ConsentStatus>(() => getStoredConsent());
  const menuRef = useRef<HTMLDivElement | null>(null);
  const location = useLocation();
  const showWeatherAttribution = !location.pathname.startsWith("/slopes");

  const navItems = useMemo(
    () => [
      {
        to: "/webcams",
        active: location.pathname === "/" || location.pathname.startsWith("/webcams"),
        label: t(strings.nav.webcams),
        icon: <FiCamera className="h-4 w-4" aria-hidden />,
      },
      {
        to: "/slopes",
        active: location.pathname.startsWith("/slopes"),
        label: t(strings.nav.slopes),
        icon: <FiBarChart2 className="h-4 w-4" aria-hidden />,
      },
      {
        to: "/resorts",
        active: location.pathname.startsWith("/resorts"),
        label: t(strings.nav.resorts),
        icon: <FiMap className="h-4 w-4" aria-hidden />,
      },
    ],
    [location.pathname, t]
  );

  const navLinkClass = (active: boolean) =>
    [
      "px-2 py-1 text-sm font-medium rounded-md transition-colors inline-flex items-center gap-1",
      active
        ? "bg-slate-200 text-slate-900 dark:bg-slate-700 dark:text-slate-100 shadow-sm"
        : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100",
    ].join(" ");

  const handleLocaleChange = (value: string) => {
    setLocale(value as Locale);
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      const insideMenu = menuRef.current && menuRef.current.contains(target as Node);
      const insideSelectPortal = target?.closest("[data-slot^='select-']") !== null;
      if (!insideMenu && !insideSelectPortal) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleStatus = (event: Event) => {
      const detail = (event as CustomEvent<ConsentStatus>).detail;
      if (detail) setConsentStatus(detail);
    };
    window.addEventListener("analytics-consent:status", handleStatus as EventListener);
    return () => window.removeEventListener("analytics-consent:status", handleStatus as EventListener);
  }, []);

  useEffect(() => {
    if (consentStatus !== "granted") return;
    trackPageView(`${location.pathname}${location.search}`);
  }, [consentStatus, location.pathname, location.search]);

  const seo = useMemo(() => {
    if (location.pathname.startsWith("/slopes")) {
      return {
        title: t(strings.seo.slopesTitle),
        description: t(strings.seo.slopesDescription),
      };
    }
    if (location.pathname.startsWith("/resorts")) {
      return {
        title: t(strings.nav.resorts),
        description: t(strings.resortPage.listDescription),
      };
    }
    return {
      title: t(strings.seo.webcamsTitle),
      description: t(strings.seo.webcamsDescription),
    };
  }, [location.pathname, t]);

  const openPrivacySettings = () => {
    window.dispatchEvent(new Event("analytics-consent:open"));
    setMenuOpen(false);
  };

  return (
    <div className="h-screen h-[100svh] flex flex-col bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors overflow-hidden">
      <Seo title={seo.title} description={seo.description} path={location.pathname} />
      <header className="sticky top-0 z-20 border-b border-slate-200/70 dark:border-slate-700/60 bg-white/80 dark:bg-slate-900/80 backdrop-blur">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <nav className="flex items-center gap-1 sm:gap-2">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={navLinkClass(item.active)}
                  aria-current={item.active ? "page" : undefined}
                  aria-label={item.label}
                >
                  {item.icon}
                  <span className="hidden sm:inline">{item.label}</span>
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="relative flex items-center gap-2" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-haspopup="true"
              aria-expanded={menuOpen}
              aria-label={t(strings.language.label)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300/70 dark:border-slate-600/70 bg-white/80 dark:bg-slate-800/80 text-slate-700 hover:bg-slate-200 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <FiMoreVertical className="h-5 w-5" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-11 z-30 w-64 rounded-xl border border-slate-200 bg-white/95 p-3 shadow-xl backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
                <div className="space-y-3 text-sm text-slate-700 dark:text-slate-200">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      {t(strings.language.label)}
                    </p>
                    <Select value={locale} onValueChange={(value) => { handleLocaleChange(value); setMenuOpen(false); }}>
                      <SelectTrigger
                        id="language-select"
                        className="mt-1 h-9 w-full justify-between border-slate-300/70 bg-white dark:border-slate-600/70 dark:bg-slate-800"
                        aria-label={t(strings.language.label)}
                      >
                        <SelectValue placeholder={t(strings.language.label)} />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        {locales.map((code) => (
                          <SelectItem key={code} value={code}>
                            <span className="flex items-center gap-2">
                              <span>{localeLabels[code]}</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      toggle();
                      setMenuOpen(false);
                    }}
                    className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                  >
                    <span>{isDark ? t(strings.themeToggle.light) : t(strings.themeToggle.dark)}</span>
                    {isDark ? <FiSun className="h-4 w-4" /> : <FiMoon className="h-4 w-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={openPrivacySettings}
                    className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                  >
                    <span>{t(strings.analyticsConsent.settings)}</span>
                    <FiShield className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNoticeOpen(true);
                      setMenuOpen(false);
                    }}
                    className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                  >
                    <span>{t(strings.notices.title)}</span>
                    <FiInfo className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>
      <div className="flex-1 min-h-0 flex overflow-hidden">
        <Suspense
          fallback={
            <div className="flex-1 grid place-items-center text-sm text-slate-400 dark:text-slate-500">
              {t(strings.resortPage?.weatherLoading) || "Loading…"}
            </div>
          }
        >
          <Routes>
            <Route path="/" element={<Navigate to="/webcams" replace />} />
            <Route path="/webcams" element={<Webcam />} />
            <Route path="/webcams/m/*" element={<Webcam />} />
            <Route path="/webcams/:resort/:stream" element={<Webcam />} />
            <Route path="/slopes" element={<Slopes />} />
            <Route path="/resorts" element={<ResortListPage />} />
            <Route path="/resorts/:slug" element={<ResortDetailPage />} />
            <Route path="/resorts/:slug/weather" element={<ResortWeatherPage />} />
          </Routes>
        </Suspense>
      </div>
      {showWeatherAttribution && (
        <footer className="shrink-0 border-t border-slate-200/70 bg-white/80 px-4 py-2 pb-[max(env(safe-area-inset-bottom),0px)] text-center text-xs text-slate-500 backdrop-blur dark:border-slate-800/70 dark:bg-slate-900/80 dark:text-slate-300">
          {t(strings.attribution.weather)}{" "}
          <a
            href="https://www.kogl.or.kr/"
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            {t(strings.attribution.linkLabel)}
          </a>
        </footer>
      )}

      {noticeOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur">
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{t(strings.notices.title)}</h2>
              <button
                type="button"
                onClick={() => setNoticeOpen(false)}
                className="rounded-md px-2 py-1 text-sm text-slate-500 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="mt-4 space-y-3 text-sm text-slate-700 dark:text-slate-200">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {t(strings.notices.dataSources)}
                </p>
                <p className="mt-1">
                  {t(strings.attribution.weather)}{" "}
                  <a
                    href="https://www.kogl.or.kr/"
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                  >
                    {t(strings.attribution.linkLabel)}
                  </a>
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {t(strings.notices.credits)}
                </p>
                <p className="mt-1">React, Vite, Tailwind, Radix UI, dnd-kit, HLS.js, react-icons.</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {t(strings.notices.translationHeading)}
                </p>
                <p className="mt-1 text-slate-700 dark:text-slate-200">
                  {t(strings.notices.translationNote)}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {t(strings.notices.feedback)}
                </p>
                <p className="mt-1 flex flex-wrap items-center gap-2">
                  <a
                    href="https://github.com/powder-nomad/SkiWatch/issues"
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                  >
                    GitHub Issues
                  </a>
                  <span className="text-slate-500 dark:text-slate-400">·</span>
                  <a href="mailto:paul.kim.dev@gmail.com" className="underline">
                    paul.kim.dev@gmail.com
                  </a>
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {t(strings.notices.thirdPartyLicenses)}
                </p>
                <ul className="mt-1 list-disc space-y-1 pl-4 text-[13px]">
                  <li>
                    {t(strings.notices.routingLicense)}
                  </li>
                  <li>
                    {t(strings.notices.videoLicense)}
                  </li>
                  <li>
                    {t(strings.notices.fullLicensePrefix)}{" "}
                    <a
                      href="https://github.com/powder-nomad/SkiWatch/blob/main/THIRD_PARTY_NOTICES.md"
                      target="_blank"
                      rel="noreferrer"
                      className="underline"
                    >
                      {t(strings.notices.fullLicenseLink)}
                    </a>{" "}
                    {t(strings.notices.fullLicenseSuffix)}
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
      <AnalyticsConsent />
    </div>
  );
}

export default App;
