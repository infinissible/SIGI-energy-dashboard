// hooks/useDemandKwRange.ts
import { useEffect, useState } from "react";

export type Row = {
  time: number;
  pv_1086: number | null;
  pv_1200: number | null;
  pv_1084: number | null;
  total_power: number | null;
  net_admin: number | null;
  ev_l3: number | null;
  admin_hvac: number | null;
  admin_plugs: number | null;
};

type RangeResponse = {
  rows?: Row[];
  error?: string;
  earliest?: string; // from backend
  latest?: string; // from backend
};

function apiRoot(base: string) {
  const b = (base || "").replace(/\/$/, "");
  return `${b}/backend/api/solar`;
}

// --- Local date helpers (exported) ---
export function toYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseYMD(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, 0, 0, 0, 0);
}

export function startOfDayMs(ymd: string): number {
  return new Date(`${ymd}T00:00:00`).getTime();
}

export function endOfDayMs(ymd: string): number {
  return new Date(`${ymd}T23:59:59.999`).getTime();
}

/** Clamp end within a 7-day inclusive window and <= max */
export function clampEndFor7DayWindow(start: Date, end: Date, max: Date): Date {
  const cap = new Date(start);
  cap.setDate(cap.getDate() + 6); // 7-day inclusive window
  let e = end > cap ? cap : end;
  if (e > max) e = max;
  if (e < start) e = start;
  return e;
}

export function useDemandKwRange(start?: string, end?: string) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [earliest, setEarliest] = useState<string | undefined>(undefined);
  const [latest, setLatest] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiBase = (import.meta as any).env?.VITE_API_BASE_PATH ?? "";
  const baseUrl = `${apiRoot(apiBase)}/sharks/demand`;

  useEffect(() => {
    let abort = false;
    (async () => {
      try {
        const r = await fetch(baseUrl, {
          credentials: "same-origin",
          headers: { Accept: "application/json" },
        });
        const j: RangeResponse = await r.json();
        if (abort) return;
        // Even if not 200, the route returns meta; but guard anyway
        if (j?.earliest) setEarliest(j.earliest);
        if (j?.latest) setLatest(j.latest);
      } catch {
        // metadata fetch is best-effort; don’t surface a blocking error here
      }
    })();
    return () => {
      abort = true;
    };
  }, [baseUrl]);

  useEffect(() => {
    if (!start || !end) return; // only fetch when custom range is selected

    let abort = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const url = `${baseUrl}?start=${encodeURIComponent(
          start
        )}&end=${encodeURIComponent(end)}`;
        const r = await fetch(url, {
          credentials: "same-origin",
          headers: { Accept: "application/json" },
        });
        const j: RangeResponse = await r.json();
        if (abort) return;

        if (!r.ok || j.error) {
          setRows(null);
          setEarliest(j.earliest);
          setLatest(j.latest);
          setError(j?.error || `Failed (HTTP ${r.status})`);
          return;
        }

        setRows(Array.isArray(j.rows) ? j.rows : []);
        setEarliest(j.earliest);
        setLatest(j.latest);
      } catch {
        if (!abort) setError("Network error");
      } finally {
        if (!abort) setLoading(false);
      }
    })();

    return () => {
      abort = true;
    };
  }, [baseUrl, start, end]);

  return { rows, earliest, latest, loading, error };
}
