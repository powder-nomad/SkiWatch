import { LocalizedText } from "@/lib/i18n/locales";

export enum StreamType {
    HLS,
    IFrame,
    External,
    Unavailable,
    Vivaldi,
}

export type Resort = {
    name: LocalizedText;
    homepage: string;
    weather: string;
    // ISO 3166-1 alpha-2 country code (lowercase): "kr", "jp", "ch", "ca".
    // Optional for backwards compat with the bundled fallback dataset
    // (all KR) — openSkiData populates it for the live registry.
    country?: string;
    lifts: Lift[];
    slopes: Slope[];
    streams: Stream[];
}

export type Lift = {
    id: number;
    name: LocalizedText;
    length: number; // m
    elevation: number | undefined;
    seats: number | undefined;
    cabinNum: number | undefined;
    speed: number | undefined; // m/s
    rideTime: number | undefined; // seconds
    capacity: number | undefined; // ppl/hour
    connectedSlopeIds: number[];
    connectedLiftIds: number[];
}

export type Slope = {
    id: number;
    name: LocalizedText;
    difficulty: Difficulty;
    length: number | undefined; // m
    width: number | undefined; // m
    area: number | undefined; //  m^2
    elevation: number | undefined; // m
    minAngle: number | undefined; // degree
    avgAngle: number | undefined; // degree
    maxAngle: number | undefined; // degree
    connectedSlopeIds: number[];
    connectedLiftIds: number[];
}

export enum Difficulty {
    BEGINNER, BE_IN, INTERMEDIATE, IN_AD, ADVANCED, EXPERT, PARK
}

export type StreamMetadata = {
    vivaldi?: {
        channel: number;
        serial: string;
        token?: string;
    };
};

export type Stream = {
    name: LocalizedText;
    type: StreamType;
    url: string;
    metadata?: StreamMetadata;
}

export function degreeToPercent(degree: number) {
    return Math.tan(degree / 180 * Math.PI) * 100;
}

export function percentToDegree(percent: number) {
    return Math.atan(percent / 100) / Math.PI * 180;
}
