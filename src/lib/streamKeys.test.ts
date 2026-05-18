import { describe, expect, it } from "vitest";
import type { Stream } from "@/data/Util";
import { StreamType } from "@/data/Util";
import { getStreamKey, getStreamIdentifier } from "./streamKeys";

// Minimal stream fixture builder — every test customises the bits
// it cares about and leaves the rest at sane defaults.
function makeStream(overrides: Partial<Stream> = {}): Stream {
  return {
    name: { ko: "테스트", en: "Test" },
    type: StreamType.HLS,
    url: "https://example.com/stream.m3u8",
    ...overrides,
  };
}

describe("getStreamKey", () => {
  it("prefers vivaldi serial+channel when metadata is present", () => {
    const stream = makeStream({
      url: "", // url should be ignored when vivaldi metadata exists
      metadata: { vivaldi: { serial: "VIV-12345", channel: 3 } },
    });
    expect(getStreamKey(stream)).toBe("vivaldi:VIV-12345:3");
  });

  it("uses URL when no vivaldi metadata is present", () => {
    const stream = makeStream({ url: "https://example.com/cam-1.m3u8" });
    expect(getStreamKey(stream)).toBe("url:https://example.com/cam-1.m3u8");
  });

  it("falls back to localised name when URL is empty", () => {
    const stream = makeStream({ url: "", name: { ko: "1번 슬로프", en: "Slope 1" } });
    expect(getStreamKey(stream)).toBe("name:1번 슬로프-Slope 1");
  });
});

describe("getStreamIdentifier", () => {
  it("combines resort homepage and stream key", () => {
    const resort = {
      name: { ko: "용평", en: "Yongpyong" },
      homepage: "https://www.yongpyong.co.kr/",
      weather: "",
      lifts: [],
      slopes: [],
      streams: [],
    };
    const stream = makeStream({ url: "https://yongpyong.example/cam.m3u8" });
    expect(getStreamIdentifier(resort, stream)).toBe(
      "https://www.yongpyong.co.kr/::url:https://yongpyong.example/cam.m3u8"
    );
  });
});
