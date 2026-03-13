// hooks/useMonthlySavings.ts
import { useEffect, useMemo, useState } from "react";

type Building = 1084 | 1086 | 1200;

/** New 1084 summary row (trimmed table) */
export type Savings1084Row = {
  month: string; // YYYY-MM
  total_kw_w_pv: number | null;
  total_kw_wo_pv: number | null;
  pv_net_kwh: number | null;
  total_kwh_w_pv: number | null;
  total_kwh_wo_pv: number | null;
  network_w_pv: number | null;
  network_wo_pv: number | null;
  total_kw_savings_$: number | null;
  total_kwh_savings_$: number | null;
  network_savings_$: number | null;
  total_savings_$: number | null;
};

/** New 1086/1200 summary row (trimmed TOU table) */
export type Savings1086_1200Row = {
  month: string; // YYYY-MM

  on_kw_w_pv: number | null;
  mid_kw_w_pv: number | null;
  off_kw_w_pv: number | null;

  on_kw_wo_pv: number | null;
  mid_kw_wo_pv: number | null;
  off_kw_wo_pv: number | null;

  on_kwh_w_pv: number | null;
  mid_kwh_w_pv: number | null;
  off_kwh_w_pv: number | null;

  on_pv_kwh: number | null;
  mid_pv_kwh: number | null;
  off_pv_kwh: number | null;

  on_kwh_wo_pv: number | null;
  mid_kwh_wo_pv: number | null;
  off_kwh_wo_pv: number | null;

  total_kw_savings_$: number | null;
  total_kwh_savings_$: number | null;

  network_w_pv: number | null;
  network_wo_pv: number | null;
  network_savings_$: number | null;

  total_savings_$: number | null;
};

export type MonthlySavingsRow = Savings1084Row | Savings1086_1200Row;

/** Type guard for 1084 summary shape */
export function is1084Row(row: MonthlySavingsRow): row is Savings1084Row {
  return "pv_net_kwh" in row;
}

export function useMonthlySavings(options?: {
  startMonth?: string; // default "2025-11"
  defaultBuilding?: Building; // default 1084
  limit?: number; // default 120
}) {
  const startMonth = options?.startMonth ?? "2025-11";
  const limit = options?.limit ?? 120;

  const [building, setBuilding] = useState<Building>(
    options?.defaultBuilding ?? 1084,
  );

  const [rows, setRows] = useState<MonthlySavingsRow[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const apiBase = import.meta.env.VITE_API_BASE_PATH || "";
  const savingsBase = `${apiBase}/backend/api/solar/savings`;

  const filteredRows = useMemo(() => {
    const r = rows.filter((x) => x.month >= startMonth);
    r.sort((a, b) => (a.month < b.month ? 1 : a.month > b.month ? -1 : 0));
    return r;
  }, [rows, startMonth]);

  const selectedRow = useMemo(() => {
    if (!selectedMonth) return null;
    return filteredRows.find((r) => r.month === selectedMonth) ?? null;
  }, [filteredRows, selectedMonth]);

  useEffect(() => {
    let isMounted = true;

    const fetchMonths = async (b: Building) => {
      setLoading(true);
      setError("");

      try {
        const res = await fetch(
          `${savingsBase}/months?building=${b}&limit=${limit}`,
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const json = await res.json();
        const data: MonthlySavingsRow[] = Array.isArray(json) ? json : [];

        if (!isMounted) return;

        setRows(data);

        const latest = data
          .map((d) => d.month)
          .filter((m) => typeof m === "string" && m >= startMonth)
          .sort()
          .pop();

        setSelectedMonth((prev) =>
          prev && prev >= startMonth ? prev : (latest ?? ""),
        );
      } catch (e: any) {
        console.error("Failed to fetch monthly savings:", e);
        if (!isMounted) return;
        setError(e?.message ?? "Failed to load savings months");
        setRows([]);
        setSelectedMonth("");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchMonths(building);

    return () => {
      isMounted = false;
    };
  }, [building, limit, startMonth, savingsBase]);

  return {
    building,
    setBuilding,
    rows: filteredRows,
    selectedMonth,
    setSelectedMonth,
    selectedRow,
    loading,
    error,
    is1084Row,
    reload: () => {
      setBuilding((b) => b);
    },
  };
}
