const defaultBase = (import.meta.env.VITE_WEATHER_API_BASE_URL as string | undefined)?.replace(/\/+$/, "");

// Ridgecast v2 lives at /ridgecast/v1/places/{slug}/{weather,forecast}. The
// hooks below call buildWeatherApiUrl("places/<slug>/weather") to hit it.
//
// Default: dev → relative `/ridgecast/v1` (caught by the Vite proxy in
// vite.config.ts, which forges Origin/Referer for the key's allowlist);
// prod → absolute api.pk3d.dev URL hit directly by the browser, whose
// real Origin/Referer match the allowlist. Override via
// VITE_WEATHER_API_BASE_URL in either environment.
const apiBase = (
  defaultBase && defaultBase.length > 0 ? defaultBase : "https://api.pk3d.dev/ridgecast/v1"
).replace(/\/+$/, "");

export function buildWeatherApiUrl(path: string) {
  const trimmed = path.replace(/^\/+/, "");
  return `${apiBase}/${trimmed}`;
}

function withApiHeaders(init?: RequestInit): RequestInit {
  const headers = new Headers(init?.headers ?? {});
  headers.set("Accept", "application/json");
  // Read the key from the build env. No hardcoded fallback — a missing key
  // surfaces as 401 at runtime, which is the right failure mode (vs silently
  // sending a stale key). Set VITE_WEATHER_API_KEY in `.env.local` for dev
  // and pass it to the build env for production (`gh-pages` deploy).
  const apiKey = import.meta.env.VITE_WEATHER_API_KEY as string | undefined;
  if (apiKey) {
    headers.set("x-api-key", apiKey);
  }
  return { ...init, headers };
}

export async function fetchWeatherApi(path: string, init?: RequestInit) {
  const url = buildWeatherApiUrl(path);
  return fetch(url, withApiHeaders(init));
}

export function withWeatherApiHeaders(init?: RequestInit) {
  return withApiHeaders(init);
}
