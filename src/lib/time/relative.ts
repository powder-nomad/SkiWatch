import type { Locale } from "@/lib/i18n/locales";

// Format a wall-clock instant relative to "now" using the browser's
// Intl.RelativeTimeFormat. Returns localised text like:
//   "moments ago" / "방금 전" / "たった今"
//   "2 minutes ago" / "2분 전" / "2分前"
//   "3 hours ago" / "3시간 전" / "3時間前"
// Falls back to a localised date string for anything ≥ 7 days ago.
//
// `now` is a parameter (not Date.now()) so callers can drive the value
// from a useNow tick to keep the label fresh without prop-drilling.
export function formatRelative(
  input: string | Date,
  locale: Locale,
  now: number = Date.now(),
): string {
  const ts = input instanceof Date ? input.getTime() : Date.parse(input);
  if (!Number.isFinite(ts)) return "";
  const intlLocale =
    locale === "ko" ? "ko-KR" : locale === "ja" ? "ja-JP" : "en-US";
  const rtf = new Intl.RelativeTimeFormat(intlLocale, { numeric: "auto" });
  const diffMs = ts - now;
  const absSec = Math.abs(diffMs) / 1000;
  if (absSec < 30) return rtf.format(0, "second"); // "now" / "방금 전"
  if (absSec < 60) return rtf.format(Math.round(diffMs / 1000), "second");
  if (absSec < 3600) return rtf.format(Math.round(diffMs / 60000), "minute");
  if (absSec < 86_400) return rtf.format(Math.round(diffMs / 3_600_000), "hour");
  if (absSec < 7 * 86_400) return rtf.format(Math.round(diffMs / 86_400_000), "day");
  // For older instants, fall back to a date format users can read.
  return new Intl.DateTimeFormat(intlLocale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(ts));
}
