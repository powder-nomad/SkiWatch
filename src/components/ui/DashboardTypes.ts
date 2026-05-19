import { Stream } from "@/data/Util";

export type DashboardItemType = "webcam" | "weather";

export type DashboardItem = {
  id: string;
  type: DashboardItemType;
  resortSlug: string;
  label: string;
  colSpan: number;
  rowSpan: number;
  // Specific to webcam
  stream?: Stream;
};
