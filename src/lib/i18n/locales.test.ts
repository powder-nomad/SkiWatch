import { describe, expect, it } from "vitest";
import { getLocalizedText } from "./locales";

describe("getLocalizedText", () => {
  it("returns the requested locale when present", () => {
    expect(getLocalizedText({ ko: "용평", en: "Yongpyong" }, "en")).toBe("Yongpyong");
    expect(getLocalizedText({ ko: "용평", en: "Yongpyong" }, "ko")).toBe("용평");
  });

  it("falls back to default locale (ko) when requested locale is absent", () => {
    expect(getLocalizedText({ ko: "용평" }, "en")).toBe("용평");
    expect(getLocalizedText({ ko: "용평" }, "ja")).toBe("용평");
  });

  it("falls back to a custom fallback locale when supplied", () => {
    expect(getLocalizedText({ en: "Yongpyong" }, "ja", "en")).toBe("Yongpyong");
  });

  it("falls back to the first available value when neither requested nor fallback is present", () => {
    expect(getLocalizedText({ ja: "ヨンピョン" }, "en")).toBe("ヨンピョン");
  });

  it("returns empty string for an empty LocalizedText object", () => {
    expect(getLocalizedText({}, "ko")).toBe("");
  });
});
