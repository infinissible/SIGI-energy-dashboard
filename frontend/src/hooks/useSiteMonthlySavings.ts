// hooks/useSiteMonthlySavings.ts
import { useEffect, useState } from "react";

type Building = 1084 | 1086 | 1200;

type MonthlySavingsRow = {
  month: string; // "YYYY-MM"
  total_savings_$: number | null;
};

const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

// Convert "YYYY-MM" -> "MM-YYYY" to match MonthlyMetrics keys
function toMonthKey(yyyyMm: string): string {
  const [y, m] = yyyyMm.split("-");
  if (!y || !m) return yyyyMm;
  return `${m}-${y}`;
}

// Clamp negatives for 1086/1200 only (per your preference)
function normalizeTotalSavings(building: Building, value: number): number {
  if (building === 1086 || building === 1200) return Math.max(0, value);
  return value;
}

async function fetchBuildingMonthlySavings(
  apiBase: string,
  building: Building,
  limit: number,
): Promise<MonthlySavingsRow[]> {
  const res = await fetch(
    `${apiBase}/backend/api/solar/savings/months?building=${building}&limit=${limit}`,
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return Array.isArray(json) ? (json as MonthlySavingsRow[]) : [];
}

/**
 * Site-level monthly savings (sum of 1084 + 1086 + 1200) keyed by "MM-YYYY"
 * for use in MonthlyMetrics.
 *
 * - Uses billing savings from MySQL when available (e.g., 12-2025)
 * - Months earlier than startMonth are filtered out ("2025-11" default)
 * - Refreshes every 5 minutes (same pattern as other hooks)
 */
export default function useSiteMonthlySavings(opts?: {
  startMonth?: string; // default "2025-11" (YYYY-MM)
  limit?: number; // default 240
  refreshMs?: number; // default 5min
}) {
  const apiBase = import.meta.env.VITE_API_BASE_PATH || "";
  const startMonth = opts?.startMonth ?? "2025-11";
  const limit = opts?.limit ?? 240;
  const refreshMs = opts?.refreshMs ?? REFRESH_INTERVAL_MS;

  const [data, setData] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    const fetchAll = async () => {
      try {
        setLoading(true);

        const [r1084, r1086, r1200] = await Promise.all([
          fetchBuildingMonthlySavings(apiBase, 1084, limit),
          fetchBuildingMonthlySavings(apiBase, 1086, limit),
          fetchBuildingMonthlySavings(apiBase, 1200, limit),
        ]);

        if (!isMounted) return;

        const agg: Record<string, number> = {};

        const addRows = (building: Building, rows: MonthlySavingsRow[]) => {
          for (const r of rows) {
            const month = r?.month;
            if (!month || month < startMonth) continue; // "YYYY-MM" compares correctly
            const key = toMonthKey(month);

            const raw = Number((r as any).total_savings_$ ?? 0);
            const val = normalizeTotalSavings(building, raw);

            agg[key] = (agg[key] ?? 0) + val;
          }
        };

        addRows(1084, r1084);
        addRows(1086, r1086);
        addRows(1200, r1200);

        setData(agg);
      } catch (e) {
        console.error("Failed to fetch site monthly savings:", e);
        if (isMounted) setData({});
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchAll();
    const interval = setInterval(fetchAll, refreshMs);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [apiBase, startMonth, limit, refreshMs]);

  return { data, loading };
}
