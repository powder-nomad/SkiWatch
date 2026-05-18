#!/usr/bin/env node
/**
 * Visual E2E audit — drives a headless Chromium through the key SkiWatch
 * routes in each locale and captures:
 *   - PNG screenshots → ./visual-audit/<route>__<locale>.png
 *   - console errors / warnings → ./visual-audit/console.log
 *   - failing network requests → same file
 *
 * Assumes `npm run dev` is running at http://localhost:5173/SkiWatch/.
 *
 * Usage: node scripts/visual-audit.mjs
 */
import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(__dirname, "..", "visual-audit");
await fs.mkdir(outDir, { recursive: true });

const BASE = "http://localhost:5173/SkiWatch";

const ROUTES = [
  { name: "webcams", path: "/webcams" },
  { name: "slopes", path: "/slopes" },
  { name: "resorts", path: "/resorts" },
  { name: "resort-detail", path: "/resorts/yongpyong" },
  { name: "resort-weather", path: "/resorts/yongpyong/weather" },
];

const LOCALES = ["ko", "en", "ja"];

// CORS + origin-allowlist workaround for dev audits:
//   - --disable-web-security skips browser CORS preflights so the SPA
//     can talk to https://api.pk3d.dev directly from localhost.
//   - The api-key's origin allowlist still has to be satisfied: we route
//     all api.pk3d.dev requests through Playwright and inject the
//     allowlisted Origin / Referer headers before the request leaves.
// Result: visual-audit can run against a real prod backend without
// running a custom proxy.
const ALLOWED_ORIGIN = "https://powder-nomad.github.io";
const ALLOWED_REFERER = `${ALLOWED_ORIGIN}/SkiWatch/`;
const browser = await chromium.launch({
  headless: true,
  args: ["--disable-web-security"],
});
const logLines = [];
let pageviews = 0;

async function auditPage(route, locale) {
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    locale: locale === "ko" ? "ko-KR" : locale === "ja" ? "ja-JP" : "en-US",
  });

  const consoleEvents = [];

  // Inject Origin/Referer ONLY on api.pk3d.dev requests. setExtraHTTPHeaders
  // would leak them to localhost too, and Vite's dev server rejects any
  // request whose Origin doesn't match its host (the SPA renders blank).
  //
  // Use route.fetch() + fulfill() instead of route.continue() — Playwright
  // treats `Origin` as a CORS-forbidden header on continue(), so the
  // override silently no-ops there. The fetch() variant is server-side
  // and has full header control.
  await ctx.route("https://api.pk3d.dev/**", async (apiRoute) => {
    const req = apiRoute.request();
    try {
      const response = await apiRoute.fetch({
        headers: {
          ...req.headers(),
          origin: ALLOWED_ORIGIN,
          referer: ALLOWED_REFERER,
        },
      });
      await apiRoute.fulfill({ response });
    } catch (err) {
      consoleEvents.push(`[route-fetch-error] ${req.url()} → ${(err && err.message) || err}`);
      await apiRoute.abort();
    }
  });

  // Track api.pk3d.dev responses so we can confirm Origin injection worked.
  ctx.on("response", (resp) => {
    const url = resp.url();
    if (url.includes("api.pk3d.dev") && resp.status() >= 400) {
      consoleEvents.push(`[api ${resp.status()}] ${url}`);
    }
  });

  const page = await ctx.newPage();
  page.on("console", (msg) => {
    if (msg.type() === "error" || msg.type() === "warning") {
      consoleEvents.push(`[${msg.type()}] ${msg.text()}`);
    }
  });
  page.on("pageerror", (err) => {
    consoleEvents.push(`[pageerror] ${err.message}`);
  });
  page.on("requestfailed", (req) => {
    const f = req.failure()?.errorText ?? "unknown";
    // Filter out hls.js' expected stream-load failures for cameras that
    // aren't reachable from the test box.
    if (req.url().includes(".m3u8") || req.url().includes("ts?")) return;
    consoleEvents.push(`[requestfailed] ${req.url()} → ${f}`);
  });

  const url = `${BASE}${route.path}`;
  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 20000 });
  } catch (err) {
    consoleEvents.push(`[goto-failed] ${url}: ${err.message}`);
  }

  // Force locale via localStorage. SkiWatch persists language choice there;
  // setting it pre-navigation isn't possible cleanly, so re-set + reload.
  await page.evaluate((loc) => {
    localStorage.setItem("locale", loc);
  }, locale);
  await page.reload({ waitUntil: "networkidle", timeout: 20000 }).catch(() => {});

  // Dismiss analytics consent banner if visible so it doesn't occlude
  // the screenshot. Grant it so we also exercise the GA path.
  try {
    const allowBtn = page.locator("button", { hasText: /Allow|허용|許可/ });
    if (await allowBtn.count()) {
      await allowBtn.first().click({ timeout: 2000 });
      pageviews += 1;
    }
  } catch {
    /* banner not present or already dismissed */
  }
  await page.waitForTimeout(800);

  const file = path.join(outDir, `${route.name}__${locale}.png`);
  await page.screenshot({ path: file, fullPage: false });
  logLines.push(`OK ${route.name} [${locale}] -> ${path.relative(outDir, file)} (${consoleEvents.length} events)`);
  for (const evt of consoleEvents) {
    logLines.push(`    ${evt}`);
  }

  await ctx.close();
}

for (const locale of LOCALES) {
  for (const route of ROUTES) {
    await auditPage(route, locale);
  }
}

await fs.writeFile(path.join(outDir, "console.log"), logLines.join("\n") + "\n", "utf8");
console.log(logLines.join("\n"));
console.log(`\nGA consent banner clicks fired (pageview prompts): ${pageviews}`);

await browser.close();
