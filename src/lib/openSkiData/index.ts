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
 */

import type { Resort } from "@/data/Util";
import type {
  CountryIndex,
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

async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T | null> {
  try {
    const res = await fetch(url, { signal });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch (err) {
    if ((err as Error).name === "AbortError") throw err;
    return null;
  }
}

export async function loadResortsFromOpenSkiData(
  base: string = DEFAULT_OPEN_SKI_DATA_BASE,
  signal?: AbortSignal
): Promise<Resort[]> {
  const root = base.replace(/\/+$/, "");

  // Stage 1: walk index → countries → regions → places.
  const registry = await fetchJson<RegistryIndex>(`${root}/registry/index.json`, signal);
  if (!registry?.countries) return [];

  type PlaceLocator = { country: string; region: string; slug: string; dirUrl: string };
  const placeLocators: PlaceLocator[] = [];

  const countries = await Promise.all(
    registry.countries.map((c) => fetchJson<CountryIndex>(`${root}/${c.path}`, signal))
  );

  for (let ci = 0; ci < countries.length; ci++) {
    const country = countries[ci];
    const cSlug = registry.countries[ci].country_code;
    if (!country?.regions) continue;

    const regions = await Promise.all(
      country.regions.map((r) => fetchJson<RegionIndex>(`${root}/${r.path}`, signal))
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

  // Stage 2: parallel-fetch each place's 4 files.
  const resorts = await Promise.all(
    placeLocators.map(async (loc): Promise<Resort | null> => {
      const [place, liftsDoc, slopesDoc, webcamsDoc] = await Promise.all([
        fetchJson<RawPlace>(`${loc.dirUrl}/place.json`, signal),
        fetchJson<{ lifts?: RawLift[] }>(`${loc.dirUrl}/lifts.json`, signal),
        fetchJson<{ slopes?: RawSlope[] }>(`${loc.dirUrl}/slopes.json`, signal),
        fetchJson<{ webcams?: RawWebcam[] }>(`${loc.dirUrl}/webcams.json`, signal),
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

  return resorts.filter((r): r is Resort => r !== null);
}
