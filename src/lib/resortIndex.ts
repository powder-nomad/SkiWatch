import bundledResorts from "@/data/data";
import { Resort, Stream } from "@/data/Util";
import { getStreamIdentifier } from "@/lib/streamKeys";
import { LocalizedText, defaultLocale, getLocalizedText } from "@/lib/i18n/locales";

// Homepage URL → slug. Slugs MUST match open-ski-data's place_slug values
// (Ridgecast keys off these). Four slugs were renamed from the original
// SkiWatch internals to match open-ski-data: oakvalley→oak-valley,
// vivaldi→vivaldi-park, wellihilli→wellihilli-park, phoenix→phoenix-park.
const manualResortSlugs: Record<string, string> = {
  "https://www.konjiamresort.co.kr/main.dev": "konjiam",
  "https://jisanresort.co.kr/w/ski/": "jisan",
  "https://www.sonohotelsresorts.com/skiboard": "vivaldi-park",
  "https://www.elysian.co.kr/": "elysian-gangchon",
  "https://oakvalley.co.kr/ski/introduction/slope": "oak-valley",
  "https://www.wellihillipark.com/snowpark": "wellihilli-park",
  "https://phoenixhnr.co.kr/page/main/pyeongchang?q%5BhmpgDivCd%5D=PP&page=1&size=4": "phoenix-park",
  "https://www.yongpyong.co.kr/kor/skiNboard/introduce.do": "yongpyong",
  "https://www.alpensia.com/main.do": "alpensia",
  "https://www.high1.com/ski/index.do": "high1",
  "https://www.o2resort.com/main.xhtml": "o2",
  "https://mdysresort.com/": "muju",
  "https://www.edenvalley.co.kr/": "eden-valley",
};

type StreamEntry = {
  id: string;
  slug: string;
  stream: Stream;
};

export type ResortEntry = {
  slug: string;
  resort: Resort;
  streams: StreamEntry[];
};

export type ResortIndex = {
  resortEntries: ResortEntry[];
  findResortBySlug: (slug: string) => ResortEntry | undefined;
  getResortSlug: (resort: Resort) => string | undefined;
  findStreamBySlugs: (
    resortSlug: string,
    streamSlug: string
  ) => { resortSlug: string; resort: Resort; stream: Stream; streamId: string } | undefined;
  getRouteForStream: (resort: Resort, stream: Stream) => { resortSlug: string; streamSlug: string } | undefined;
  getRouteForStreamId: (streamId: string) => { resortSlug: string; streamSlug: string } | undefined;
  getStatusKeyForStreamId: (streamId: string) => string | undefined;
  findStreamById: (
    streamId: string
  ) => { resortSlug: string; streamSlug: string; resort: Resort; stream: Stream } | undefined;
  getAllWebcamRouteParams: () => { resort: string; stream: string }[];
  getAllResortSlugs: () => { slug: string }[];
};

function slugify(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
}

function slugifyLocalized(text: LocalizedText | undefined, fallback: string) {
  if (!text) return fallback;
  const value = text.en?.trim() || text.ko?.trim() || getLocalizedText(text, defaultLocale).trim() || fallback;
  const slugged = slugify(value);
  return slugged || fallback;
}

const ensureUnique = (value: string, tracker: Map<string, number>) => {
  const current = tracker.get(value);
  if (current === undefined) {
    tracker.set(value, 1);
    return value;
  }
  const nextCount = current + 1;
  tracker.set(value, nextCount);
  return `${value}-${nextCount}`;
};

export function createResortIndex(resorts: Resort[]): ResortIndex {
  const resortEntries: ResortEntry[] = resorts.map((resort, index) => {
    const baseSlug = manualResortSlugs[resort.homepage] || slugifyLocalized(resort.name, `resort-${index + 1}`);
    const streamTracker = new Map<string, number>();
    const streams = resort.streams.map((stream, streamIndex) => {
      const slugBase = slugifyLocalized(stream.name, `stream-${streamIndex + 1}`);
      const slug = ensureUnique(slugBase, streamTracker);
      const id = getStreamIdentifier(resort, stream);
      return { slug, stream, id };
    });
    return {
      slug: baseSlug,
      resort,
      streams,
    };
  });

  const entryBySlug = new Map(resortEntries.map((entry) => [entry.slug, entry]));
  // Keyed by Resort object identity rather than homepage. Open-ski-data
  // place.json files frequently have homepage:null (CA/CH/JP placeholders
  // — 13 of 26 places at the time of writing), so all those resorts
  // would collapse to the same "" key. Identity keys avoid the collision
  // and keep getResortSlug correct for every resort.
  const entryByResort = new Map<Resort, ResortEntry>(
    resortEntries.map((entry) => [entry.resort, entry])
  );
  const streamRouteById = new Map<string, { resortSlug: string; streamSlug: string }>();
  const streamById = new Map<
    string,
    { resortSlug: string; streamSlug: string; resort: Resort; stream: Stream }
  >();

  resortEntries.forEach((entry) => {
    entry.streams.forEach((stream) => {
      streamRouteById.set(stream.id, { resortSlug: entry.slug, streamSlug: stream.slug });
      streamById.set(stream.id, {
        resortSlug: entry.slug,
        streamSlug: stream.slug,
        resort: entry.resort,
        stream: stream.stream,
      });
    });
  });

  return {
    resortEntries,
    findResortBySlug: (slug: string) => entryBySlug.get(slug),
    getResortSlug: (resort: Resort) => entryByResort.get(resort)?.slug,
    findStreamBySlugs: (resortSlug: string, streamSlug: string) => {
      const resortEntry = entryBySlug.get(resortSlug);
      if (!resortEntry) {
        return undefined;
      }
      const streamEntry = resortEntry.streams.find((item) => item.slug === streamSlug);
      if (!streamEntry) {
        return undefined;
      }
      return {
        resortSlug: resortEntry.slug,
        resort: resortEntry.resort,
        stream: streamEntry.stream,
        streamId: streamEntry.id,
      };
    },
    getRouteForStream: (resort: Resort, stream: Stream) => {
      const streamId = getStreamIdentifier(resort, stream);
      const route = streamRouteById.get(streamId);
      if (route) {
        return route;
      }
      const entry = entryByResort.get(resort);
      if (!entry) {
        return undefined;
      }
      const streamEntry = entry.streams.find((item: StreamEntry) => item.id === streamId);
      if (!streamEntry) {
        return undefined;
      }
      return {
        resortSlug: entry.slug,
        streamSlug: streamEntry.slug,
      };
    },
    getRouteForStreamId: (streamId: string) => streamRouteById.get(streamId),
    getStatusKeyForStreamId: (streamId: string) => {
      const route = streamRouteById.get(streamId);
      if (!route) {
        return undefined;
      }
      return `${route.resortSlug}/${route.streamSlug}`;
    },
    findStreamById: (streamId: string) => streamById.get(streamId),
    getAllWebcamRouteParams: () =>
      resortEntries.flatMap((entry) =>
        entry.streams.map((stream) => ({
          resort: entry.slug,
          stream: stream.slug,
        }))
      ),
    getAllResortSlugs: () => resortEntries.map(({ slug }) => ({ slug })),
  };
}

const defaultIndex = createResortIndex(bundledResorts);

export const resortEntries = defaultIndex.resortEntries;
export const findResortBySlug = defaultIndex.findResortBySlug;
export const getResortSlug = defaultIndex.getResortSlug;
export const findStreamBySlugs = defaultIndex.findStreamBySlugs;
export const getRouteForStream = defaultIndex.getRouteForStream;
export const getRouteForStreamId = defaultIndex.getRouteForStreamId;
export const getStatusKeyForStreamId = defaultIndex.getStatusKeyForStreamId;
export const findStreamById = defaultIndex.findStreamById;
export const getAllWebcamRouteParams = defaultIndex.getAllWebcamRouteParams;
export const getAllResortSlugs = defaultIndex.getAllResortSlugs;
