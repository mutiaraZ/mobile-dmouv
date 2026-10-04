import { API_TOKEN, BACKEND_URL } from "./config";

export type PersonStatus = "detected" | "not-detected";
export type LampStatus = "on" | "off";
export type FanStatus = "on" | "off";

type DeviceName = "lamp" | "fan";

// Bentuk state dari backend (CommandGenerator.snapshot())
type BackendState = {
  person_detected: boolean;
  devices: Record<DeviceName, { mode: "auto" | "manual"; state: "ON" | "OFF" | null }>;
};

// ------------------------------------------------------------------
// HTTP helper
// ------------------------------------------------------------------
const request = async <T>(
  path: string,
  options: { method?: "GET" | "POST"; body?: unknown } = {}
): Promise<T> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(`${BACKEND_URL}${path}`, {
      method: options.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        ...(API_TOKEN ? { "X-Auth-Token": API_TOKEN } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.success === false) {
      throw new Error(data.message || `HTTP ${res.status}`);
    }
    return data as T;
  } finally {
    clearTimeout(timer);
  }
};

const getState = async (): Promise<BackendState> => {
  const data = await request<{ state: BackendState }>("/api/device/status");
  return data.state;
};

const toPerson = (s: BackendState): PersonStatus =>
  s.person_detected ? "detected" : "not-detected";

// ------------------------------------------------------------------
// LAMPU
// ------------------------------------------------------------------
export const fetchDeviceStatus = async () => {
  const s = await getState();
  return {
    lampStatus: (s.devices.lamp.state === "ON" ? "on" : "off") as LampStatus,
    personStatus: toPerson(s),
    isAutoMode: s.devices.lamp.mode === "auto",
  };
};

export const updateLampState = (newState: {
  lampStatus?: LampStatus;
  isAutoMode?: boolean;
}) => updateDevice("lamp", newState.lampStatus, newState.isAutoMode);

// ------------------------------------------------------------------
// KIPAS
// ------------------------------------------------------------------
export const fetchFanStatus = async () => {
  const s = await getState();
  return {
    fanStatus: (s.devices.fan.state === "ON" ? "on" : "off") as FanStatus,
    personStatus: toPerson(s),
    isAutoMode: s.devices.fan.mode === "auto",
  };
};

export const updateFanState = (newState: {
  fanStatus?: FanStatus;
  isAutoMode?: boolean;
}) => updateDevice("fan", newState.fanStatus, newState.isAutoMode);

// ------------------------------------------------------------------
// Kirim perintah ke backend (HTTP). Backend yang meneruskan ke Raspi via Socket.IO.
// ------------------------------------------------------------------
const updateDevice = async (
  device: DeviceName,
  power?: "on" | "off",
  isAutoMode?: boolean
): Promise<{ success: boolean }> => {
  if (isAutoMode !== undefined) {
    await request("/api/device/mode", {
      method: "POST",
      body: { device, mode: isAutoMode ? "auto" : "manual" },
    });
  }
  if (power !== undefined) {
    // Perintah manual: otomatis memindahkan perangkat ke mode manual di backend
    await request("/api/device/control", {
      method: "POST",
      body: { device, command: power.toUpperCase() },
    });
  }
  return { success: true };
};
