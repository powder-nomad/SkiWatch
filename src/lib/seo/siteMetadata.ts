export const siteMetadata = {
  siteName: "SkiWatch",
  baseUrl: "https://powder-nomad.github.io/SkiWatch",
  defaultTitle: "SkiWatch | 한국 스키장 라이브 웹캠 & 슬로프 데이터",
  defaultDescription:
    "한국 주요 스키장의 실시간 웹캠과 슬로프 데이터를 한눈에 확인하고, 리프트·날씨 정보까지 함께 비교하세요.",
  shareImage: "https://powder-nomad.github.io/SkiWatch/favicon.ico",
  shareImageAlt: "SkiWatch logo",
};

export function buildCanonicalUrl(pathname: string) {
  const normalizedPath = pathname === "/" ? "" : pathname;
  return `${siteMetadata.baseUrl}${normalizedPath}`;
}
