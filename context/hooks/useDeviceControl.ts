import type {
    DeviceName,
    DeviceSnapshot,
    PersonStatus,
    PowerStatus,
} from "@/api/api";
import { fetchDevice, updateDevice } from "@/api/api";
import { useCallback, useEffect, useRef, useState } from "react";

const POLL_MS = 3000;
const COMMAND_ERROR_MS = 6000;

export function useDeviceControl(
  device: DeviceName,
  onAutoModeChange: (isAuto: boolean) => void
) {
  const [power, setPower] = useState<PowerStatus>("off");
  const [personStatus, setPersonStatus] = useState<PersonStatus>("not-detected");
  const [offInSec, setOffInSec] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [connectionError, setConnectionError] = useState(false);
  const [commandError, setCommandError] = useState<string | null>(null);

  const seqRef = useRef(0);
  const mountedRef = useRef(true);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onAutoRef = useRef(onAutoModeChange);
  onAutoRef.current = onAutoModeChange;

  const apply = useCallback((s: DeviceSnapshot) => {
    setPower(s.power);
    setPersonStatus(s.personStatus);
    setOffInSec(s.offInSec);
    onAutoRef.current(s.isAutoMode);
  }, []);

  // Hasil fetch dibuang kalau sementara itu ada perintah baru (hasilnya sudah basi).
  const refresh = useCallback(async () => {
    const seq = seqRef.current;
    let snap: DeviceSnapshot;
    try {
      snap = await fetchDevice(device);
    } catch (e) {
      if (mountedRef.current) setConnectionError(true);
      throw e;
    }
    if (!mountedRef.current) return;
    setConnectionError(false);
    if (seq !== seqRef.current) return;
    apply(snap);
  }, [device, apply]);

  useEffect(() => {
    mountedRef.current = true;

    (async () => {
      try {
        await refresh();
      } catch (e) {
        console.error("Fetch initial status error:", e);
      } finally {
        if (mountedRef.current) setIsLoading(false);
      }
    })();

    const id = setInterval(() => {
      refresh().catch((e) => console.error("Fetch status update error:", e));
    }, POLL_MS);

    return () => {
      mountedRef.current = false;
      clearInterval(id);
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    };
  }, [refresh]);

  const showCommandError = useCallback((message: string) => {
    setCommandError(message);
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    errorTimerRef.current = setTimeout(() => {
      if (mountedRef.current) setCommandError(null);
    }, COMMAND_ERROR_MS);
  }, []);

  const send = useCallback(
    async (
      optimistic: () => void,
      payload: { power?: PowerStatus; isAutoMode?: boolean },
      errorMessage: string
    ) => {
      seqRef.current += 1; // buang polling yang sedang berjalan
      setIsSending(true);
      setCommandError(null);
      optimistic();

      try {
        await updateDevice(device, payload);
      } catch (e) {
        console.error(errorMessage, e);
        const detail = e instanceof Error && e.message ? ` (${e.message})` : "";
        showCommandError(`${errorMessage}${detail}`);
      }

      // Apapun hasilnya, ambil kondisi sebenarnya dari backend.
      try {
        seqRef.current += 1; // buang polling yang sempat berangkat selama request
        await refresh();
      } catch (e) {
        console.error("Re-sync failed:", e);
      } finally {
        if (mountedRef.current) setIsSending(false);
      }
    },
    [device, refresh, showCommandError]
  );

  const setAutoMode = useCallback(
    (isAuto: boolean) =>
      send(
        () => onAutoRef.current(isAuto),
        { isAutoMode: isAuto },
        "Failed to update automatic mode."
      ),
    [send]
  );

  const setPowerState = useCallback(
    (next: PowerStatus) =>
      send(() => setPower(next), { power: next }, `Failed to update ${device} status.`),
    [send, device]
  );

  const error =
    commandError ?? (connectionError ? "Cannot reach the server. Check the backend and IP." : null);

  return {
    power,
    personStatus,
    offInSec,
    isLoading,
    isSending,
    error,
    setAutoMode,
    setPowerState,
  };
}