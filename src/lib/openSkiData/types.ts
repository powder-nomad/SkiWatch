/**
 * Wire shapes for the open-ski-data registry JSON.
 * Loose by design — we ignore fields we don't need.
 */

import type { StreamMetadata } from "@/data/Util";

export type LocalizedRecord = { ko?: string; en?: string; ja?: string };

export type RegistryIndex = {
  countries?: { country_code: string; path: string }[];
};

export type CountryIndex = {
  regions?: { region_slug: string; path: string }[];
};

export type RegionIndex = {
  places?: { place_slug: string; path: string }[];
};

export type RawPlace = {
  place_slug: string;
  name?: string;
  name_i18n?: LocalizedRecord;
  homepage?: string;
};

export type RawLift = {
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

export type RawSlope = {
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

export type RawWebcam = {
  label?: string;
  label_i18n?: LocalizedRecord;
  url?: string;
  type?: string;
  metadata?: StreamMetadata;
};

// A specific point in the open-ski-data registry walk that failed.
// `scope` says what kind of document we were after, `url` is the exact
// URL we tried (so the user/log has something actionable), `placeSlug`
// is filled in when we can attribute the failure to a specific resort
// so /resorts/:slug can render a per-resort warning.
export type LoadErrorScope =
  | "registry"
  | "country"
  | "region"
  | "place"
  | "lifts"
  | "slopes"
  | "webcams";

export type LoadError = {
  scope: LoadErrorScope;
  url: string;
  status?: number;
  message: string;
  placeSlug?: string;
  country?: string;
};

export type LoadResult = {
  resorts: import("@/data/Util").Resort[];
  errors: LoadError[];
};
