import { request } from "./api";

export type HistoryType =
  | "motion"
  | "lamp-on"
  | "lamp-off"
  | "fan-on"
  | "fan-off"
  | "schedule";

export type HistoryRow = {
  id: number;
  event_type: HistoryType;
  device: "lamp" | "fan" | null;
  source: "manual" | "auto" | "schedule" | "system";
  message: string;
  reason: string | null;
  created_at: string;
};

export const fetchHistory = async (limit = 100, before?: string) => {
  const qs = `?limit=${limit}${before ? `&before=${encodeURIComponent(before)}` : ""}`;
  return request<{ success: boolean; items: HistoryRow[]; has_more: boolean }>(
    `/api/history${qs}`
  );
};