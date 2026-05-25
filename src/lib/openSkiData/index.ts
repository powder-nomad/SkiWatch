/**
 * Live loader for resort data from open-ski-data.
 *
 * Walks the registry tree directly via raw.githubusercontent.com:
 *
 *   ${BASE}/registry/index.json          (countries)
 *     → ${BASE}/registry/kr/index.json    (regions)
 *         → ${BASE}/registry/kr/gangwon/index.json  (places)
 *             → place.json + lifts.json + slopes.json + webcams.json
 *
 * The mapping (open-ski-data shape → SkiWatch `Resort`) is identical to
 * `open-ski-data/scripts/export-skiwatch.mjs`; both stay in sync if the
 * upstream schema ever evolves.
 *
 * Errors are collected, not swallowed: a 404 on an optional file
 * (lifts/slopes/webcams) is reported only as informational, while any
 * network/parse failure or non-404 HTTP error is captured in
 * `LoadResult.errors` so the UI can surface degraded states instead of
 * pretending nothing went wrong.
 */

import type { Resort } from "@/data/Util";
import type {
  CountryIndex,
  LoadError,
  LoadErrorScope,
  LoadResult,
  RawLift,
  RawPlace,
  RawSlope,
  RawWebcam,
  RegionIndex,
  RegistryIndex,
} from "./types";
import {
  buildIdMap,
  pickI18n,
  transformLift,
  transformSlope,
  transformStream,
} from "./transforms";

export const DEFAULT_OPEN_SKI_DATA_BASE =
  "https://raw.githubusercontent.com/powder-nomad/open-ski-data/main";

type FetchOk<T> = { ok: true; data: T };
type FetchFail = { ok: false; error: Omit<LoadError, "scope"> };
type FetchOutcome<T> = FetchOk<T> | FetchFail;

// Distinguishes the four failure modes (network, !res.ok, JSON parse,
// abort). Abort propagates upward; everything else becomes a structured
// FetchFail the caller can attribute to a scope.
async function tryFetchJson<T>(url: string, signal?: AbortSignal): Promise<FetchOutcome<T>> {
  let res: Response;
  try {
    res = await fetch(url, { signal });
  } catch (err) {
    if ((err as Error).name === "AbortError") throw err;
    return { ok: false, error: { url, message: `network error: ${(err as Error).message}` } };
  }
  if (!res.ok) {
    return { ok: false, error: { url, status: res.status, message: `HTTP ${res.status}` } };
  }
  try {
    return { ok: true, data: (await res.json()) as T };
  } catch (err) {
    return { ok: false, error: { url, message: `JSON parse error: ${(err as Error).message}` } };
  }
}

async function loadJson<T>(
  url: string,
  scope: LoadErrorScope,
  errors: LoadError[],
  signal?: AbortSignal,
  extra?: { placeSlug?: string; country?: string }
): Promise<T | null> {
  const outcome = await tryFetchJson<T>(url, signal);
  if (outcome.ok) return outcome.data;
  errors.push({ scope, ...outcome.error, ...extra });
  return null;
}

// Optional fetch: a 404 isn't an error (the file is allowed to be
// absent for places that don't publish that section). Any other failure
// IS reported so the UI can warn that a real fetch went wrong.
async function loadOptionalJson<T>(
  url: string,
  scope: LoadErrorScope,
  errors: LoadError[],
  signal?: AbortSignal,
  extra?: { placeSlug?: string; country?: string }
): Promise<T | null> {
  const outcome = await tryFetchJson<T>(url, signal);
  if (outcome.ok) return outcome.data;
  if (outcome.error.status === 404) return null;
  errors.push({ scope, ...outcome.error, ...extra });
  return null;
}

export async function loadResortsFromOpenSkiData(
  base: string = DEFAULT_OPEN_SKI_DATA_BASE,
  signal?: AbortSignal
): Promise<LoadResult> {
  const root = base.replace(/\/+$/, "");
  const errors: LoadError[] = [];

  const registry = await loadJson<RegistryIndex>(
    `${root}/registry/index.json`,
    "registry",
    errors,
    signal
  );
  if (!registry?.countries) return { resorts: [], errors };

  type PlaceLocator = { country: string; region: string; slug: string; dirUrl: string };
  const placeLocators: PlaceLocator[] = [];

  const countries = await Promise.all(
    registry.countries.map((c) =>
      loadJson<CountryIndex>(`${root}/${c.path}`, "country", errors, signal, {
        country: c.country_code,
      })
    )
  );

  for (let ci = 0; ci < countries.length; ci++) {
    const country = countries[ci];
    const cSlug = registry.countries[ci].country_code;
    if (!country?.regions) continue;

    const regions = await Promise.all(
      country.regions.map((r) =>
        loadJson<RegionIndex>(`${root}/${r.path}`, "region", errors, signal, { country: cSlug })
      )
    );

    for (let ri = 0; ri < regions.length; ri++) {
      const region = regions[ri];
      const rSlug = country.regions[ri].region_slug;
      if (!region?.places) continue;

      for (const placeRef of region.places) {
        const placeUrl = `${root}/${placeRef.path}`;
        const dirUrl = placeUrl.replace(/\/place\.json$/, "");
        placeLocators.push({ country: cSlug, region: rSlug, slug: placeRef.place_slug, dirUrl });
      }
    }
  }

  // place.json is REQUIRED — if it fails the resort is dropped.
  // lifts/slopes/webcams are OPTIONAL (404 = file legitimately absent);
  // anything other than 404 IS captured so we can warn on /:slug.
  const resorts = await Promise.all(
    placeLocators.map(async (loc): Promise<Resort | null> => {
      const placeAttr = { placeSlug: loc.slug, country: loc.country };
      const [place, liftsDoc, slopesDoc, webcamsDoc] = await Promise.all([
        loadJson<RawPlace>(`${loc.dirUrl}/place.json`, "place", errors, signal, placeAttr),
        loadOptionalJson<{ lifts?: RawLift[] }>(
          `${loc.dirUrl}/lifts.json`,
          "lifts",
          errors,
          signal,
          placeAttr
        ),
        loadOptionalJson<{ slopes?: RawSlope[] }>(
          `${loc.dirUrl}/slopes.json`,
          "slopes",
          errors,
          signal,
          placeAttr
        ),
        loadOptionalJson<{ webcams?: RawWebcam[] }>(
          `${loc.dirUrl}/webcams.json`,
          "webcams",
          errors,
          signal,
          placeAttr
        ),
      ]);
      if (!place) return null;

      const liftsRaw = liftsDoc?.lifts ?? [];
      const slopesRaw = slopesDoc?.slopes ?? [];
      const webcamsRaw = webcamsDoc?.webcams ?? [];

      const slopeIdMap = buildIdMap(slopesRaw);
      const liftIdMap = buildIdMap(liftsRaw);

      return {
        name: pickI18n(place, place.name ?? loc.slug),
        homepage: place.homepage ?? "",
        weather: "",
        country: loc.country,
        lifts: liftsRaw.map((l, i) => transformLift(l, i, slopeIdMap, liftIdMap)),
        slopes: slopesRaw.map((s, i) => transformSlope(s, i, slopeIdMap, liftIdMap)),
        streams: webcamsRaw.map(transformStream),
      };
    })
  );

  return { resorts: resorts.filter((r): r is Resort => r !== null), errors };
}
