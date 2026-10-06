import { fetchHistory, HistoryRow } from "@/api/history";
import socketService from "@/services/socket";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const PAGE = 100;
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const pad = (n: number) => String(n).padStart(2, "0");

const merge = (a: HistoryRow[], b: HistoryRow[]) => {
  const map = new Map<number, HistoryRow>();
  [...a, ...b].forEach((r) => map.set(r.id, r));
  return [...map.values()].sort(
    (x, y) => +new Date(y.created_at) - +new Date(x.created_at) || y.id - x.id
  );
};

export type HistoryDay = {
  date: string;
  logs: {
    id: number;
    type: HistoryRow["event_type"];
    source: HistoryRow["source"];
    message: string;
    time: string;
  }[];
};

export const groupByDay = (rows: HistoryRow[]): HistoryDay[] => {
  const days: HistoryDay[] = [];
  let lastKey = "";
  for (const r of rows) {
    const d = new Date(r.created_at); // otomatis ke zona waktu perangkat (WIB)
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (key !== lastKey) {
      days.push({
        date: `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`,
        logs: [],
      });
      lastKey = key;
    }
    days[days.length - 1].logs.push({
      id: r.id,
      type: r.event_type,
      source: r.source,
      message: r.message,
      time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
    });
  }
  return days;
};

export function useHistory() {
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const mounted = useRef(true);

  const load = useCallback(async (replace: boolean) => {
    try {
      const res = await fetchHistory(PAGE);
      if (!mounted.current) return;
      setRows((prev) => (replace ? res.items : merge(prev, res.items)));
      if (replace) setHasMore(res.has_more);
      setError(null);
    } catch (e) {
      if (mounted.current) {
        setError(e instanceof Error ? e.message : "Failed to load history");
      }
    }
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load(true);
    if (mounted.current) setRefreshing(false);
  }, [load]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || rows.length === 0) return;
    setLoadingMore(true);
    try {
      const res = await fetchHistory(PAGE, rows[rows.length - 1].created_at);
      if (!mounted.current) return;
      setRows((prev) => merge(prev, res.items));
      setHasMore(res.has_more);
    } catch (e) {
      if (mounted.current) {
        setError(e instanceof Error ? e.message : "Failed to load more");
      }
    } finally {
      if (mounted.current) setLoadingMore(false);
    }
  }, [loadingMore, hasMore, rows]);

  useEffect(() => {
    mounted.current = true;
    load(true).finally(() => {
      if (mounted.current) setLoading(false);
    });

    socketService.connect();
    const socket = socketService.getSocket();
    setLive(!!socket?.connected);

    const onRow = (row: HistoryRow) => setRows((prev) => merge(prev, [row]));
    const onConnect = () => {
      setLive(true);
      load(false); // tambal event yang terlewat saat koneksi putus
    };
    const onDisconnect = () => setLive(false);

    socket?.on("history_event", onRow);
    socket?.on("connect", onConnect);
    socket?.on("disconnect", onDisconnect);

    return () => {
      mounted.current = false;
      // off() per handler: jangan removeAllListeners/disconnect, socket dipakai layar kamera
      socket?.off("history_event", onRow);
      socket?.off("connect", onConnect);
      socket?.off("disconnect", onDisconnect);
    };
  }, [load]);

  const days = useMemo(() => groupByDay(rows), [rows]);

  return { days, loading, refreshing, loadingMore, hasMore, error, live, refresh, loadMore };
}