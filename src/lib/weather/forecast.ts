type KmaItem = {
  category: string;
  fcstValue: string;
  fcstDate: string;
  fcstTime: string;
};

export type WeatherCondition = "clear" | "cloudy" | "overcast" | "rain" | "snow" | "mixed" | "unknown";

export type ForecastSlot = {
  key: string;
  date: string;
  time: string;
  temperature?: number;
  precipitationType?: number;
  precipitationProbability?: number;
  precipitation?: number;
  precipitationRain?: number;
  precipitationSnow?: number;
  humidity?: number;
  sky?: number;
  windSpeed?: number;
  condition: WeatherCondition;
};

export type WeatherSummary = {
  condition: WeatherCondition;
  label: string;
  temperature?: number;
  humidity?: number;
  windSpeed?: number;
  precipitationText?: string;
  observedAt?: string;
};

export type WeatherResult = {
  summary: WeatherSummary;
  hourly: ForecastSlot[];
  raw: unknown;
};

const ZERO_LIKE_VALUES = new Set(["-", "0", "0.0", "강수없음", "적설없음", "강수 없음", "적설 없음"]);
const SNOW_MM_PER_CM = 10;

const CONDITION_LABELS: Record<WeatherCondition, string> = {
  clear: "Clear",
  cloudy: "Cloudy",
  overcast: "Overcast",
  rain: "Rain",
  snow: "Snow",
  mixed: "Rain/Snow",
  unknown: "—",
};

function getCondition(pty?: number, sky?: number): WeatherCondition {
  if (pty !== undefined && pty > 0) {
    if (pty === 1 || pty === 4 || pty === 5 || pty === 6) {
      return "rain";
    }
    if (pty === 3 || pty === 7) {
      return "snow";
    }
    return "mixed";
  }
  if (sky === 1) return "clear";
  if (sky === 3) return "cloudy";
  if (sky === 4) return "overcast";
  return "unknown";
}

function getPrecipitationText(pty?: number) {
  if (pty === undefined || pty === 0) return undefined;
  if (pty === 1) return "Rain";
  if (pty === 2) return "Rain/Snow";
  if (pty === 3) return "Snow";
  if (pty === 4) return "Shower";
  if (pty === 5) return "Drizzle";
  if (pty === 6) return "Freezing Rain";
  if (pty === 7) return "Snow";
  return "Precipitation";
}

function toSlotKey(item: KmaItem) {
  return `${item.fcstDate}${item.fcstTime}`;
}

function normalizeItems(items: KmaItem[]): ForecastSlot[] {
  const map = new Map<string, ForecastSlot>();
  items.forEach((item) => {
    const key = toSlotKey(item);
    const slot = map.get(key) ?? {
      key,
      date: item.fcstDate,
      time: item.fcstTime,
      condition: "unknown" as WeatherCondition,
    };
    const value = toNumber(item.fcstValue);
    switch (item.category) {
      case "T1H":
      case "TMP":
        slot.temperature = value;
        break;
      case "PTY":
        slot.precipitationType = value !== undefined ? Math.round(value) : undefined;
        break;
      case "SKY":
        slot.sky = value !== undefined ? Math.round(value) : undefined;
        break;
      case "REH":
        slot.humidity = value;
        break;
      case "POP":
        slot.precipitationProbability = clampPercentage(value);
        break;
      case "RN1":
      case "PCP": {
        const precipitation = toPrecipitation(item.fcstValue);
        if (precipitation !== undefined) {
          slot.precipitationRain = precipitation;
        }
        break;
      }
      case "SNO": {
        const snow = toPrecipitation(item.fcstValue);
        if (snow !== undefined) {
          slot.precipitationSnow = snow;
          if (snow > 0 && (!slot.precipitationType || slot.precipitationType === 0)) {
            slot.precipitationType = 3;
          }
        }
        break;
      }
      case "WSD":
        slot.windSpeed = value;
        break;
      default:
        break;
    }
    const rain = slot.precipitationRain ?? 0;
    const snow = slot.precipitationSnow ?? 0;
    if (slot.precipitationRain !== undefined || slot.precipitationSnow !== undefined) {
      slot.precipitation = rain + snow * SNOW_MM_PER_CM;
    }
    slot.condition = getCondition(slot.precipitationType, slot.sky);
    map.set(key, slot);
  });
  return Array.from(map.values()).sort((a, b) => (a.key > b.key ? 1 : -1));
}

function normalizeRawItem(item: any): KmaItem | null {
  if (!item) return null;
  const category = item.category ?? item.Category;
  const fcstValue =
    item.fcstValue ?? item.fcstvalue ?? item.FcstValue ?? item.obsrValue ?? item.obsrvalue ?? item.ObsrValue;
  const fcstDate =
    item.fcstDate ?? item.fcstdate ?? item.FcstDate ?? item.baseDate ?? item.base_date ?? item.BaseDate;
  const fcstTime =
    item.fcstTime ?? item.fcsttime ?? item.FcstTime ?? item.baseTime ?? item.base_time ?? item.BaseTime;

  if (!category || fcstValue === undefined || !fcstDate || !fcstTime) {
    return null;
  }

  return {
    category: String(category),
    fcstValue: String(fcstValue),
    fcstDate: String(fcstDate),
    fcstTime: String(fcstTime),
  };
}

function extractItems(data: any): KmaItem[] {
  if (!data) return [];
  const response = data.response ?? data.Response ?? data;
  const body = response?.body;
  const items = body?.items?.item ?? body?.Items?.Item ?? [];
  if (Array.isArray(items)) {
    return (items as any[])
      .map(normalizeRawItem)
      .filter(Boolean) as KmaItem[];
  }
  return [];
}

export function parseWeatherResponse(payload: any): WeatherResult {
  const items = extractItems(payload);
  const slots = normalizeItems(items);
  const firstSlot = slots[0];
  const precipitationText = getPrecipitationText(firstSlot?.precipitationType);
  const summary: WeatherSummary = {
    condition: firstSlot?.condition ?? "unknown",
    label: CONDITION_LABELS[firstSlot?.condition ?? "unknown"],
    temperature: firstSlot?.temperature,
    humidity: firstSlot?.humidity,
    windSpeed: firstSlot?.windSpeed,
    precipitationText,
    observedAt: firstSlot ? `${firstSlot.date} ${firstSlot.time}` : undefined,
  };

  return {
    summary,
    hourly: slots,
    raw: payload,
  };
}

// ── Ridgecast v2 envelope parsers ─────────────────────────────────────
// The hook now calls these. The legacy KMA parser above is retained
// only to keep older imports compiling during the cutover.

export const RIDGECAST_WEATHER_MAP: Record<string, WeatherCondition> = {
  clear: "clear",
  mostly_clear: "clear",
  partly_cloudy: "cloudy",
  mostly_cloudy: "overcast",
  overcast: "overcast",
  rain: "rain",
  drizzle: "rain",
  thunderstorm: "rain",
  snow: "snow",
  sleet: "mixed",
  fog: "unknown",
  unknown: "unknown",
};

export const RIDGECAST_PRECIP_TYPE_MAP: Record<string, number | undefined> = {
  none: 0,
  rain: 1,
  sleet: 2,
  snow: 3,
  drizzle: 5,
};

export const RIDGECAST_SKY_MAP: Record<string, number | undefined> = {
  clear: 1,
  mostly_clear: 1,
  partly_cloudy: 3,
  mostly_cloudy: 3,
  overcast: 4,
};

export function ridgecastCondition(weather: string | undefined | null): WeatherCondition {
  if (!weather) return "unknown";
  return RIDGECAST_WEATHER_MAP[weather] ?? "unknown";
}

export function ridgecastDateTimeParts(iso: string | undefined): { date: string; time: string; key: string } {
  if (!iso) return { date: "", time: "", key: "" };
  // ISO 8601: "2026-05-13T12:00:00Z" or with offset. Strip non-digits to derive
  // SkiWatch's compact YYYYMMDDhhmm key.
  const compact = iso.replace(/[^0-9]/g, "");
  const date = compact.slice(0, 8);
  const time = compact.slice(8, 12);
  return { date, time, key: `${date}${time}` };
}

type RidgecastWeatherPayload = {
  observed_at?: string;
  source?: string;
  temp_c?: number | null;
  humidity_pct?: number | null;
  wind_mps?: number | null;
  precip_mm_1h?: number | null;
  precip_type?: string | null;
  snow_cm_1h?: number | null;
  weather?: string | null;
};

type RidgecastForecastEntry = {
  valid_at?: string;
  temp_c?: number | null;
  humidity_pct?: number | null;
  wind_mps?: number | null;
  precip_mm?: number | null;
  precip_probability_pct?: number | null;
  precip_type?: string | null;
  snow_cm?: number | null;
  weather?: string | null;
};

type RidgecastForecastPayload = {
  forecast?: RidgecastForecastEntry[];
};

export function parseRidgecastWeather(payload: any): WeatherResult {
  const data = payload as RidgecastWeatherPayload;
  const condition = ridgecastCondition(data?.weather);
  const precipText = getPrecipitationText(
    data?.precip_type ? RIDGECAST_PRECIP_TYPE_MAP[data.precip_type] : undefined
  );
  const { date, time, key } = ridgecastDateTimeParts(data?.observed_at);

  const slot: ForecastSlot = {
    key: key || "now",
    date,
    time,
    temperature: data?.temp_c ?? undefined,
    humidity: data?.humidity_pct ?? undefined,
    windSpeed: data?.wind_mps ?? undefined,
    precipitation: data?.precip_mm_1h ?? undefined,
    precipitationSnow: data?.snow_cm_1h ?? undefined,
    precipitationType: data?.precip_type ? RIDGECAST_PRECIP_TYPE_MAP[data.precip_type] : undefined,
    sky: data?.weather ? RIDGECAST_SKY_MAP[data.weather] : undefined,
    condition,
  };

  const summary: WeatherSummary = {
    condition,
    label: CONDITION_LABELS[condition],
    temperature: slot.temperature,
    humidity: slot.humidity,
    windSpeed: slot.windSpeed,
    precipitationText: precipText,
    observedAt: data?.observed_at,
  };

  return { summary, hourly: [slot], raw: payload };
}

export function parseRidgecastForecast(payload: any): WeatherResult {
  const data = payload as RidgecastForecastPayload;
  const entries = Array.isArray(data?.forecast) ? data.forecast : [];

  const slots: ForecastSlot[] = entries.map((entry) => {
    const condition = ridgecastCondition(entry.weather);
    const { date, time, key } = ridgecastDateTimeParts(entry.valid_at);
    return {
      key: key || (entry.valid_at ?? ""),
      date,
      time,
      temperature: entry.temp_c ?? undefined,
      humidity: entry.humidity_pct ?? undefined,
      windSpeed: entry.wind_mps ?? undefined,
      precipitation: entry.precip_mm ?? undefined,
      precipitationProbability: clampPercentage(entry.precip_probability_pct ?? undefined),
      precipitationSnow: entry.snow_cm ?? undefined,
      precipitationType: entry.precip_type ? RIDGECAST_PRECIP_TYPE_MAP[entry.precip_type] : undefined,
      sky: entry.weather ? RIDGECAST_SKY_MAP[entry.weather] : undefined,
      condition,
    };
  });

  const first = slots[0];
  const summary: WeatherSummary = {
    condition: first?.condition ?? "unknown",
    label: CONDITION_LABELS[first?.condition ?? "unknown"],
    temperature: first?.temperature,
    humidity: first?.humidity,
    windSpeed: first?.windSpeed,
    precipitationText: getPrecipitationText(first?.precipitationType),
    observedAt: entries[0]?.valid_at,
  };

  return { summary, hourly: slots, raw: payload };
}

export function formatKstSlot(slot: ForecastSlot) {
  const time = slot.time;
  if (!time) return "";
  const hours = time.slice(0, 2);
  const minutes = time.slice(2, 4);
  return `${hours}:${minutes}`;
}

export function conditionLabel(condition: WeatherCondition) {
  return CONDITION_LABELS[condition];
}

function toNumber(value: string | undefined) {
  if (value === undefined || value === null) return undefined;
  const trimmed = String(value).trim();
  if (!trimmed || trimmed === "-" || trimmed.toLowerCase() === "null") {
    return undefined;
  }
  if (trimmed.includes("미만")) {
    const match = trimmed.match(/-?\d+(?:\.\d+)?/);
    if (match) {
      const parsed = Number(match[0]);
      if (Number.isNaN(parsed)) {
        return undefined;
      }
      return Number((parsed / 2).toFixed(1));
    }
  }
  const directNumber = trimmed.match(/^-?\d+(?:\.\d+)?$/);
  if (directNumber) {
    return Number(directNumber[0]);
  }

  const rangeMatch = trimmed.match(/(-?\d+(?:\.\d+)?)[^\d.\-+]+(-?\d+(?:\.\d+)?)/);
  if (rangeMatch) {
    const first = Number(rangeMatch[1]);
    const second = Number(rangeMatch[2]);
    if (!Number.isNaN(first) && !Number.isNaN(second)) {
      const avg = (first + second) / 2;
      return Number(avg.toFixed(1));
    }
  }
  const match = trimmed.match(/-?\d+(?:\.\d+)?/);
  if (!match) return undefined;
  const parsed = Number(match[0]);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function toPrecipitation(value: string | undefined) {
  if (value === undefined || value === null) return undefined;
  const trimmed = String(value).trim();
  if (!trimmed) return undefined;
  if (ZERO_LIKE_VALUES.has(trimmed)) {
    return 0;
  }
  const parsed = toNumber(trimmed);
  if (parsed !== undefined) {
    return parsed < 0 ? 0 : parsed;
  }
  return undefined;
}

function clampPercentage(value: number | undefined) {
  if (value === undefined || Number.isNaN(value)) return undefined;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
}
