import { Stream, StreamType } from "../Util";

// Source: https://www.yongpyong.co.kr/kor/guide/realTimeNews/ypResortWebcam.do
// The resort moved from /Ycam1/camNN.stream/playlist.m3u8 (now 401) to
// /camNN/index.m3u8 and renumbered the cameras, so labels follow the
// official page, not the old numbers.
export const streams: Stream[] = [
    {
        name: {
            ko: "옐로우 슬로프",
            en: "Yellow Slope",
            ja: "イエロー コース"
        },
        type: StreamType.HLS,
        url: "https://live.yongpyong.co.kr/cam11/index.m3u8"
    },
    {
        name: {
            ko: "베이스 전경 / 레드 슬로프",
            en: "Base Overview / Red Slope",
            ja: "ベース全景 ／ レッド コース"
        },
        type: StreamType.HLS,
        url: "https://live.yongpyong.co.kr/cam08/index.m3u8"
    },
    {
        name: {
            ko: "발왕산 氣 스카이워크",
            en: "Balwangsan Sky Walk",
            ja: "バルワンサン スカイウォーク"
        },
        type: StreamType.HLS,
        url: "https://live.yongpyong.co.kr/cam01/index.m3u8"
    },
    {
        name: {
            ko: "발왕산 천년주목숲길",
            en: "Balwangsan Yew Forest Trail",
            ja: "バルワンサン イチイの森の道"
        },
        type: StreamType.HLS,
        url: "https://live.yongpyong.co.kr/cam02/index.m3u8"
    },
    {
        name: {
            ko: "모나용평 진입로",
            en: "Mona Yongpyong Entrance",
            ja: "モナ ヨンピョン 入口"
        },
        type: StreamType.HLS,
        url: "https://live.yongpyong.co.kr/cam05/index.m3u8"
    },
];
