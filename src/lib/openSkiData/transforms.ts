/**
 * Pure transforms from open-ski-data wire shapes → SkiWatch domain types.
 * No I/O; safe to unit-test in isolation.
 */

import {
  Difficulty,
  StreamType,
  type Lift,
  type Slope,
  type Stream,
} from "@/data/Util";
import type { LocalizedText } from "@/lib/i18n/locales";
import type {
  LocalizedRecord,
  RawLift,
  RawSlope,
  RawWebcam,
} from "./types";

const STREAM_TYPE_MAP: Record<string, StreamType> = {
  image: StreamType.External,
  stream: StreamType.HLS,
  hls: StreamType.HLS,
  iframe: StreamType.IFrame,
  youtube: StreamType.IFrame,
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

export function pickI18n(
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

export function buildIdMap(items: { id: string | number }[]): Map<string, number> {
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

function mapDifficulty(value: string | null | undefined): Difficulty {
  if (!value) return Difficulty.BEGINNER;
  return DIFFICULTY_MAP[value] ?? Difficulty.BEGINNER;
}

function mapStreamType(value: string | undefined): StreamType {
  if (!value) return StreamType.Unavailable;
  return STREAM_TYPE_MAP[value] ?? StreamType.Unavailable;
}

// "link" entries in the registry are URL-based; classify by URL/metadata
// rather than by static type string. Anything else falls through to the
// static map.
function resolveStreamType(rec: RawWebcam): StreamType {
  if (rec.type === "link") {
    if (rec.url?.includes("youtube.com/embed/")) return StreamType.IFrame;
    if (rec.metadata?.vivaldi) return StreamType.Vivaldi;
    return StreamType.External;
  }
  return mapStreamType(rec.type);
}

export function transformLift(
  rec: RawLift,
  idx: number,
  slopeIdMap: Map<string, number>,
  liftIdMap: Map<string, number>
): Lift {
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

export function transformSlope(
  rec: RawSlope,
  idx: number,
  slopeIdMap: Map<string, number>,
  liftIdMap: Map<string, number>
): Slope {
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

export function transformStream(rec: RawWebcam): Stream {
  return {
    name: pickI18n(rec, rec.label ?? "Stream"),
    type: resolveStreamType(rec),
    url: rec.url ?? "",
    ...(rec.metadata ? { metadata: rec.metadata } : {}),
  };
}
