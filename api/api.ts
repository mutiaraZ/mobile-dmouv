type PersonStatus = "detected" | "not-detected";
type LampStatus = "on" | "off";
type FanStatus = "on" | "off";

// Satu sumber kebenaran untuk person status
let sharedPersonStatus: PersonStatus = "not-detected";

// ✅ Fungsi ini dipanggil dari CameraStream saat deteksi berhasil
export const updatePersonStatus = (status: PersonStatus) => {
  sharedPersonStatus = status;
  mockLampDatabase.personStatus = status;
  mockFanDatabase.personStatus = status;
  console.log("[API] Person status updated:", status);
};

let mockLampDatabase: {
  lampStatus: LampStatus;
  personStatus: PersonStatus;
  isAutoMode: boolean;
} = {
  lampStatus: "off",
  personStatus: sharedPersonStatus,
  isAutoMode: false,
};

let mockFanDatabase: {
  fanStatus: FanStatus;
  personStatus: PersonStatus;
  isAutoMode: boolean;
} = {
  fanStatus: "off",
  personStatus: sharedPersonStatus,
  isAutoMode: false,
};

export const fetchDeviceStatus = (): Promise<typeof mockLampDatabase> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      mockLampDatabase.personStatus = sharedPersonStatus;
      resolve(mockLampDatabase);
    }, 500);
  });
};

export const updateLampState = (newState: {
  lampStatus?: LampStatus;
  isAutoMode?: boolean;
}): Promise<{ success: boolean }> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      mockLampDatabase = { ...mockLampDatabase, ...newState };
      resolve({ success: true });
    }, 300);
  });
};

export const fetchFanStatus = (): Promise<typeof mockFanDatabase> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      mockFanDatabase.personStatus = sharedPersonStatus;
      resolve(mockFanDatabase);
    }, 500);
  });
};

export const updateFanState = (newState: {
  fanStatus?: FanStatus;
  isAutoMode?: boolean;
}): Promise<{ success: boolean }> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      mockFanDatabase = { ...mockFanDatabase, ...newState };
      resolve({ success: true });
    }, 300);
  });
};