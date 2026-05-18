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
 * Same source-of-truth pattern Ridgecast uses, so the registry on
 * open-ski-data drives every consumer. No derived JSON committed.
 *
 * The mapping (open-ski-data shape → SkiWatch `Resort`) is identical to
 * `open-ski-data/scripts/export-skiwatch.mjs`; both stay in sync if the
 * upstream schema ever evolves.
 */

import {
  Difficulty,
  StreamType,
  type Lift,
  type Resort,
  type Slope,
  type Stream,
} from "@/data/Util";
import type { LocalizedText } from "@/lib/i18n/locales";

export const DEFAULT_OPEN_SKI_DATA_BASE =
  "https://raw.githubusercontent.com/powder-nomad/open-ski-data/main";

const STREAM_TYPE_MAP: Record<string, StreamType> = {
  image: StreamType.External,
  stream: StreamType.HLS,
  hls: StreamType.HLS,
  iframe: StreamType.IFrame,
  external: StreamType.External,
  unavailable: StreamType.Unavailable,
  vivaldi: StreamType.Vivaldi,
};

const DIFFICULTY_MAP: Record<string, Difficulty> = {
  super_beginner: Difficulty.BEGINNER,
  beginner: Difficulty.BEGINNER,
  beginner_intermediate: Difficulty.BE_IN,
  intermediate: Difficulty.INTERMEDIATE,
  intermediate_advanced: Difficulty.IN_AD,
  advanced: Difficulty.ADVANCED,
  expert: Difficulty.EXPERT,
  pro: Difficulty.EXPERT,
  terrain_park: Difficulty.PARK,
  backcountry: Difficulty.EXPERT,
};

// ─── Wire shapes (loose; we ignore fields we don't need) ──────────────

type LocalizedRecord = { ko?: string; en?: string; ja?: string };

type RegistryIndex = {
  countries?: { country_code: string; path: string }[];
};
type CountryIndex = {
  regions?: { region_slug: string; path: string }[];
};
type RegionIndex = {
  places?: { place_slug: string; path: string }[];
};

type RawPlace = {
  place_slug: string;
  name?: string;
  name_i18n?: LocalizedRecord;
  homepage?: string;
};

type RawLift = {
  id: string | number;
  name?: string;
  name_i18n?: LocalizedRecord;
  capacity_per_hour?: number | null;
  length_m?: number | null;
  vertical_m?: number | null;
  seats?: number | null;
  cabin_count?: number | null;
  speed_mps?: number | null;
  connected_slope_ids?: (string | number)[];
  connected_lift_ids?: (string | number)[];
};

type RawSlope = {
  id: string | number;
  name?: string;
  name_i18n?: LocalizedRecord;
  difficulty?: string | null;
  length_m?: number | null;
  width_m?: number | null;
  area_m2?: number | null;
  elevation_m?: number | null;
  min_angle_deg?: number | null;
  avg_angle_deg?: number | null;
  max_angle_deg?: number | null;
  connected_slope_ids?: (string | number)[];
  connected_lift_ids?: (string | number)[];
};

type RawWebcam = {
  label?: string;
  label_i18n?: LocalizedRecord;
  url?: string;
  type?: string;
};

// ─── Helpers ─────────────────────────────────────────────────────────

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

function pickI18n(
  source: { name?: string; name_i18n?: LocalizedRecord; label?: string; label_i18n?: LocalizedRecord },
  fallback: string
): LocalizedText {
  const i18n: LocalizedRecord =
    (source as { name_i18n?: LocalizedRecord }).name_i18n ??
    (source as { label_i18n?: LocalizedRecord }).label_i18n ??
    {};
  const base =
    (source as { name?: string }).name ??
    (source as { label?: string }).label ??
    fallback;
  return {
    ko: i18n.ko ?? base,
    en: i18n.en ?? base,
    ja: i18n.ja ?? base,
  };
}

function buildIdMap(items: { id: string | number }[]): Map<string, number> {
  const map = new Map<string, number>();
  items.forEach((item, idx) => {
    const key = String(item.id);
    if (!map.has(key)) map.set(key, idx);
  });
  return map;
}

function rewriteIds(refs: (string | number)[] | undefined, map: Map<string, number>): number[] {
  if (!refs) return [];
  return refs
    .map((ref) => map.get(String(ref)))
    .filter((n): n is number => typeof n === "number");
}

function transformLift(rec: RawLift, idx: number, slopeIdMap: Map<string, number>, liftIdMap: Map<string, number>): Lift {
  return {
    id: idx,
    name: pickI18n(rec, `Lift ${idx + 1}`),
    length: rec.length_m ?? 0,
    elevation: rec.vertical_m ?? undefined,
    seats: rec.seats ?? undefined,
    cabinNum: rec.cabin_count ?? undefined,
    speed: rec.speed_mps ?? undefined,
    rideTime: undefined,
    capacity: rec.capacity_per_hour ?? undefined,
    connectedSlopeIds: rewriteIds(rec.connected_slope_ids, slopeIdMap),
    connectedLiftIds: rewriteIds(rec.connected_lift_ids, liftIdMap),
  };
}

function mapDifficulty(value: string | null | undefined): Difficulty {
  if (!value) return Difficulty.BEGINNER;
  return DIFFICULTY_MAP[value] ?? Difficulty.BEGINNER;
}

function mapStreamType(value: string | undefined): StreamType {
  if (!value) return StreamType.Unavailable;
  return STREAM_TYPE_MAP[value] ?? StreamType.Unavailable;
}

function transformSlope(rec: RawSlope, idx: number, slopeIdMap: Map<string, number>, liftIdMap: Map<string, number>): Slope {
  return {
    id: idx,
    name: pickI18n(rec, `Slope ${idx + 1}`),
    difficulty: mapDifficulty(rec.difficulty),
    length: rec.length_m ?? undefined,
    width: rec.width_m ?? undefined,
    area: rec.area_m2 ?? undefined,
    elevation: rec.elevation_m ?? undefined,
    minAngle: rec.min_angle_deg ?? undefined,
    avgAngle: rec.avg_angle_deg ?? undefined,
    maxAngle: rec.max_angle_deg ?? undefined,
    connectedSlopeIds: rewriteIds(rec.connected_slope_ids, slopeIdMap),
    connectedLiftIds: rewriteIds(rec.connected_lift_ids, liftIdMap),
  };
}

function transformStream(rec: RawWebcam): Stream {
  return {
    name: pickI18n(rec, rec.label ?? "Stream"),
    type: mapStreamType(rec.type),
    url: rec.url ?? "",
  };
}

// ─── Main loader ─────────────────────────────────────────────────────

export async function loadResortsFromOpenSkiData(
  base: string = DEFAULT_OPEN_SKI_DATA_BASE,
  signal?: AbortSignal
): Promise<Resort[]> {
  const root = base.replace(/\/+$/, "");

  // Stage 1: walk index → countries → regions → places (4 small JSONs per level).
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
        // placeRef.path is like 'registry/kr/gangwon/yongpyong/place.json'.
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
        weather: "",  // legacy; Ridgecast keys off place_slug now
        country: loc.country,  // "kr" / "jp" / "ch" / "ca" — drives the country filter chips
        lifts: liftsRaw.map((l, i) => transformLift(l, i, slopeIdMap, liftIdMap)),
        slopes: slopesRaw.map((s, i) => transformSlope(s, i, slopeIdMap, liftIdMap)),
        streams: webcamsRaw.map(transformStream),
      };
    })
  );

  return resorts.filter((r): r is Resort => r !== null);
}
