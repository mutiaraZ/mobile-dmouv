import { API_TOKEN, BACKEND_URL } from "./config";

export type PersonStatus = "detected" | "not-detected";
export type PowerStatus = "on" | "off";
export type DeviceName = "lamp" | "fan";

type BackendState = {
  person_detected: boolean;
  devices: Record<
    DeviceName,
    {
      mode: "auto" | "manual";
      state: "ON" | "OFF" | null;
      off_in_sec?: number | null;
    }
  >;
};

export type DeviceSnapshot = {
  power: PowerStatus;
  personStatus: PersonStatus;
  isAutoMode: boolean;
  offInSec: number | null;
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

// ------------------------------------------------------------------
// Baca status satu perangkat (lamp / fan)
// ------------------------------------------------------------------
export const fetchDevice = async (device: DeviceName): Promise<DeviceSnapshot> => {
  const { state } = await request<{ state: BackendState }>("/api/device/status");
  const dev = state.devices[device];
  return {
    power: dev.state === "ON" ? "on" : "off",
    personStatus: state.person_detected ? "detected" : "not-detected",
    isAutoMode: dev.mode === "auto",
    offInSec: dev.off_in_sec ?? null,
  };
};

// ------------------------------------------------------------------
// Kirim perintah. Backend meneruskan ke Raspi via Socket.IO / MQTT.
// Perintah power otomatis memindahkan perangkat ke mode manual di backend.
// ------------------------------------------------------------------
export const updateDevice = async (
  device: DeviceName,
  payload: { power?: PowerStatus; isAutoMode?: boolean }
): Promise<void> => {
  if (payload.isAutoMode !== undefined) {
    await request("/api/device/mode", {
      method: "POST",
      body: { device, mode: payload.isAutoMode ? "auto" : "manual" },
    });
  }
  if (payload.power !== undefined) {
    await request("/api/device/control", {
      method: "POST",
      body: { device, command: payload.power.toUpperCase() },
    });
  }
};