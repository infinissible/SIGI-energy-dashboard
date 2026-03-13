// hooks/useDailySummary.ts
import { useEffect, useState } from "react";

export type DailySummaryEntry = {
  date: string;
  generated: number;
  consumed: number;
  exported: number;
  savings: number;
};

export type SummaryRange = "today" | "3days" | "7days";

const DAYS_MAP: Record<SummaryRange, number> = {
  today: 1,
  "3days": 3,
  "7days": 7,
};

const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

// NEW: add opts with optional days override
export default function useDailySummary(
  range: SummaryRange = "7days",
  opts?: { days?: number },
) {
  const [data, setData] = useState<DailySummaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const apiBase = import.meta.env.VITE_API_BASE_PATH || "";

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        const days = opts?.days ?? DAYS_MAP[range];
        const res = await fetch(
          `${apiBase}/backend/api/solar/daily-summary?days=${days}`,
        );
        const json = await res.json();

        const normalized = (json || []).map((d: any) => {
          // Admin (1084)
          const adminGen = Number(d.PV_generated) || 0;
          const adminConsumed = Number(d.consumed) || 0;
          const adminExported = Number(d.exported) || 0;
          const adminSavings = Number(d.savings) || 0;

          // Building 1086
          const b1086Gen = Number(d.b1086_PV_generated) || 0;
          const b1086Consumed = Number(d.b1086_consumed) || 0;
          const b1086Exported = Number(d.b1086_exported) || 0;
          const b1086Savings = Number(d.b1086_savings) || 0;

          // Building 1200
          const b1200Gen = Number(d.b1200_PV_generated) || 0;
          const b1200Consumed = Number(d.b1200_consumed) || 0;
          const b1200Exported = Number(d.b1200_exported) || 0;
          const b1200Savings = Number(d.b1200_savings) || 0;

          const generatedRaw = adminGen + b1086Gen + b1200Gen;
          const consumedRaw = adminConsumed + b1086Consumed + b1200Consumed;

          // Export display should be positive magnitude
          const exportedRaw = adminExported + b1086Exported + b1200Exported;

          // Daily "savings" in this chart/table is display-only estimate/sum -> clamp at 0
          const savingsRaw = adminSavings + b1086Savings + b1200Savings;

          const generated = Math.max(0, generatedRaw);
          const consumed = Math.max(0, consumedRaw);
          const exported = Math.max(0, Math.abs(exportedRaw));
          const savings = Math.max(0, savingsRaw);

          return {
            date: d.date,
            generated,
            consumed,
            exported,
            savings,
          } as DailySummaryEntry;
        });

        if (isMounted) setData(normalized);
      } catch (err) {
        console.error("Failed to fetch daily summary:", err);
        if (isMounted) setData([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, REFRESH_INTERVAL_MS);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [apiBase, range, opts?.days]);

  return { data, loading };
}
