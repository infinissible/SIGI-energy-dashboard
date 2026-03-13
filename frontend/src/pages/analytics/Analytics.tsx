// pages/Analytics.tsx
import React, { useEffect, useMemo, useState, useTransition } from "react";
import useInverterPowerData from "@/hooks/useInverterPowerData";
import CustomRange from "./CustomRange";
import AnalyticsChart from "./AnalyticsChart";
import AnalyticsTable from "./AnalyticsTable";
import {
  useDemandKwRange,
  toYMD,
  startOfDayMs,
  endOfDayMs,
} from "@/hooks/useDemandKwRange";

const ANALYTICS_SERIES = [
  { key: "total_power", name: "Total PV Gen", color: "#9B2C2C" },
  { key: "pv_1086", name: "Inverter A (1086)", color: "#2F855A" },
  { key: "pv_1200", name: "Inverter B (1200)", color: "#B7791F" },
  { key: "pv_1084", name: "Inverter C (1084)", color: "#2B6CB0" },

  // ── Building / load series ────────────────────────────────
  { key: "ev_l3", name: "EV Load (L3)", color: "#4299E1" },
  { key: "net_admin", name: "Admin Net Load", color: "#6B46C1" },
  { key: "b1086_net", name: "B1086 Net Load", color: "#2B6CB0" }, // NEW
  { key: "b1200_net", name: "B1200 Net Load", color: "#38A169" }, // NEW
  { key: "admin_hvac", name: "Admin HVACs", color: "#D53F8C" },
  { key: "admin_plugs", name: "Admin Plug Loads", color: "#ED8936" },
] as const;

const isPV = (k: string) => k === "total_power" || k.startsWith("pv_");

type SeriesKey = (typeof ANALYTICS_SERIES)[number]["key"];
type Range = "today" | "3days" | "7days" | "custom";

const isPVKey = (k: SeriesKey) => k === "total_power" || k.startsWith("pv_");

const BUCKET_MS: Record<Exclude<Range, "custom">, number | null> = {
  today: null,
  "3days": 5 * 60_000,
  "7days": 15 * 60_000,
};
const MAX_POINTS_CAP: Record<Exclude<Range, "custom">, number> = {
  today: 3000,
  "3days": 2500,
  "7days": 2000,
};

function aggregateBuckets(raw: any[], bucketMs: number | null): any[] {
  if (!raw || raw.length === 0 || !bucketMs) return raw ?? [];
  const buckets = new Map<number, any[]>();
  for (const d of raw) {
    const t = Number(d.time);
    const bucket = Math.floor(t / bucketMs) * bucketMs;
    const arr = buckets.get(bucket) ?? [];
    arr.push(d);
    buckets.set(bucket, arr);
  }
  const out: any[] = [];
  for (const [bucket, rows] of buckets.entries()) {
    const agg: any = { time: bucket };
    for (const { key } of ANALYTICS_SERIES) {
      let sum = 0;
      let n = 0;
      for (const r of rows) {
        const v = Number(r[key]);
        if (Number.isFinite(v)) {
          sum += v;
          n++;
        }
      }
      agg[key] = n > 0 ? sum / n : 0;
    }
    out.push(agg);
  }
  out.sort((a, b) => a.time - b.time);
  return out;
}

function thinData<T>(arr: T[], maxPoints: number): T[] {
  if (!arr || arr.length <= maxPoints) return arr ?? [];
  const step = Math.ceil(arr.length / maxPoints);
  const out: T[] = [];
  for (let i = 0; i < arr.length; i += step) out.push(arr[i]);
  if (out[out.length - 1] !== arr[arr.length - 1])
    out.push(arr[arr.length - 1]);
  return out;
}

export default function Analytics() {
  const [currentRange, setCurrentRange] = useState<Range>("today");
  const [isPending, startTransition] = useTransition();

  // Preset fetch
  const fetchRange =
    currentRange === "custom" ? ("7days" as const) : currentRange;
  const { data: presetRows, loading: presetLoading } =
    useInverterPowerData(fetchRange);

  // Defaults for custom
  const today = new Date();
  const defaultEndStr = toYMD(today);
  const defaultStart = new Date(today);
  defaultStart.setDate(defaultStart.getDate() - 1);
  const defaultStartStr = toYMD(defaultStart);

  const [customStart, setCustomStart] = useState(defaultStartStr);
  const [customEnd, setCustomEnd] = useState(defaultEndStr);

  // Custom fetch
  const {
    rows: customRows,
    loading: customLoading,
    error: customError,
    earliest,
    latest,
  } = useDemandKwRange(
    currentRange === "custom" ? customStart : undefined,
    currentRange === "custom" ? customEnd : undefined
  );

  // Legend state
  const [visibleKeys, setVisibleKeys] = useState<Set<SeriesKey> | null>(null);
  useEffect(() => setVisibleKeys(null), [currentRange]);
  const handleToggle = (key: SeriesKey | null) => {
    startTransition(() => {
      if (key === null) return setVisibleKeys(null);
      setVisibleKeys((prev) => {
        if (prev === null) return new Set<SeriesKey>([key]);
        const next = new Set(prev);
        next.has(key) ? next.delete(key) : next.add(key);
        return next.size === ANALYTICS_SERIES.length ? null : next;
      });
    });
  };

  const dataSourceRows: any[] =
    currentRange === "custom" ? customRows ?? [] : presetRows ?? [];

  // Processed data (includes PV clamp)
  const data = useMemo(() => {
    let base = dataSourceRows;

    base = (base ?? []).map((r: any) => ({
      ...r,
      time:
        typeof r.time === "string"
          ? Date.parse(r.time) // ISO -> epoch ms
          : Number(r.time), // already number or numeric string
    }));

    if (currentRange === "custom") {
      const s = startOfDayMs(customStart);
      const e = endOfDayMs(customEnd);
      base = base.filter((d) => {
        const t = Number(d.time);
        return Number.isFinite(t) && t >= s && t <= e;
      });
    }

    let bucketMs: number | null = null;
    if (currentRange === "custom") {
      const s = startOfDayMs(customStart);
      const e = endOfDayMs(customEnd);
      const span = e - s;
      const dayMs = 24 * 60 * 60 * 1000;
      bucketMs =
        span <= dayMs
          ? BUCKET_MS["today"]
          : span <= 3 * dayMs
          ? BUCKET_MS["3days"]
          : BUCKET_MS["7days"];
    } else {
      bucketMs = BUCKET_MS[currentRange as Exclude<Range, "custom">];
    }

    const aggregated = aggregateBuckets(base, bucketMs);
    const maxPoints =
      currentRange === "custom"
        ? (() => {
            const s = startOfDayMs(customStart);
            const e = endOfDayMs(customEnd);
            const days = Math.max(1, Math.ceil((e - s) / (24 * 3600 * 1000)));
            if (days <= 1) return MAX_POINTS_CAP["today"];
            if (days <= 3) return MAX_POINTS_CAP["3days"];
            return MAX_POINTS_CAP["7days"];
          })()
        : MAX_POINTS_CAP[currentRange as Exclude<Range, "custom">];

    const thinned = thinData(aggregated, maxPoints);

    return thinned.map((d) => {
      const out: any = { ...d };
      for (const { key } of ANALYTICS_SERIES) {
        const val = Number(d[key]);
        if (!Number.isFinite(val)) {
          out[key] = null;
          continue;
        }
        const rounded = Math.round(val * 100) / 100;
        out[key] = isPVKey(key) ? Math.max(0, rounded) : rounded;
      }
      out.dateStr = new Date(d.time).toLocaleString();
      return out;
    });
  }, [dataSourceRows, currentRange, customStart, customEnd]);

  const isCustomSpanOneDay = useMemo(() => {
    const s = startOfDayMs(customStart);
    const e = endOfDayMs(customEnd);
    return e - s <= 24 * 3600 * 1000;
  }, [customStart, customEnd]);

  const formatTick = (tick: number) => {
    const date = new Date(tick);
    const showTime =
      currentRange === "today" ||
      (currentRange === "custom" && isCustomSpanOneDay);
    return showTime
      ? date.toLocaleTimeString([], { hour: "2-digit" })
      : date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  const xTicks = useMemo(() => {
    if (!data || data.length === 0) return [];
    const ticks: number[] = [];
    if (currentRange === "today") {
      const base = new Date();
      base.setHours(0, 0, 0, 0);
      for (let i = 0; i <= 24; i += 6) {
        const t = new Date(base);
        t.setHours(i);
        ticks.push(t.getTime());
      }
    } else if (currentRange === "custom") {
      const start = new Date(startOfDayMs(customStart));
      const end = new Date(endOfDayMs(customEnd));
      if (isCustomSpanOneDay) {
        const cur = new Date(start);
        cur.setMinutes(0, 0, 0);
        for (let h = 0; h < 24; h += 3) {
          const t = new Date(cur);
          t.setHours(h);
          if (t >= start && t <= end) ticks.push(t.getTime());
        }
      } else {
        const cur = new Date(start);
        cur.setHours(0, 0, 0, 0);
        while (cur <= end) {
          ticks.push(cur.getTime());
          cur.setDate(cur.getDate() + 1);
        }
      }
    } else {
      const start = new Date(data[0].time);
      const end = new Date(data[data.length - 1].time);
      const cur = new Date(start);
      cur.setHours(0, 0, 0, 0);
      while (cur <= end) {
        ticks.push(cur.getTime());
        cur.setDate(cur.getDate() + 1);
      }
    }
    return ticks;
  }, [data, currentRange, customStart, customEnd, isCustomSpanOneDay]);

  const tableSeries = useMemo(
    () =>
      ANALYTICS_SERIES.filter((s) =>
        visibleKeys === null ? true : visibleKeys.has(s.key)
      ),
    [visibleKeys]
  );

  const totalsMW = useMemo(() => {
    const sumsKW: Partial<Record<SeriesKey, number>> = {};
    for (const { key } of ANALYTICS_SERIES) sumsKW[key] = 0;
    for (const row of data ?? []) {
      for (const { key } of ANALYTICS_SERIES) {
        const v = Number(row[key]);
        if (Number.isFinite(v)) sumsKW[key]! += v;
      }
    }
    const out: Partial<Record<SeriesKey, number>> = {};
    for (const { key } of ANALYTICS_SERIES) {
      out[key] = Math.round(((sumsKW[key] ?? 0) / 1000) * 100) / 100;
    }
    return out;
  }, [data]);

  const isLoading = currentRange === "custom" ? customLoading : presetLoading;

  const xDomain: [number, number] | ["auto", "auto"] = useMemo(() => {
    if (currentRange === "today") {
      return [
        new Date().setHours(0, 0, 0, 0),
        new Date().setHours(23, 59, 59, 999),
      ] as [number, number];
    }
    return ["auto", "auto"] as const;
  }, [currentRange]);

  function downloadCSV(rows: any[], filename: string) {
    if (!rows || rows.length === 0) return;

    // Pick which fields you want to export
    const columns = [
      { key: "time", label: "Timestamp" },
      { key: "dateStr", label: "Local Time" },
      { key: "total_power", label: "Total PV Gen (kW)" },
      { key: "pv_1086", label: "Inverter A (1086)" },
      { key: "pv_1200", label: "Inverter B (1200)" },
      { key: "pv_1084", label: "Inverter C (1084)" },
      { key: "ev_l3", label: "EV Load (L3)" },
      { key: "net_admin", label: "Admin Net Load" },
      { key: "b1086_net", label: "B1086 Net Load" },
      { key: "b1200_net", label: "B1200 Net Load" },
      { key: "admin_hvac", label: "Admin HVACs" },
      { key: "admin_plugs", label: "Admin Plug Loads" },
    ];

    const header = columns.map((c) => c.label).join(",");

    const escapeCell = (value: unknown) => {
      if (value === null || value === undefined) return "";
      const s = String(value);
      // basic CSV escaping
      if (s.includes('"') || s.includes(",") || s.includes("\n")) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const lines = rows.map((row) =>
      columns
        .map((c) => {
          if (c.key === "time") {
            // export ISO string for time if you like
            const t = Number(row.time);
            return escapeCell(
              Number.isFinite(t) ? new Date(t).toISOString() : ""
            );
          }
          return escapeCell(row[c.key as keyof typeof row]);
        })
        .join(",")
    );

    const csv = [header, ...lines].join("\r\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  const handleDownloadCustomCSV = () => {
    if (currentRange !== "custom" || !data || data.length === 0) return;

    const filename = `analytics_${customStart}_to_${customEnd}.csv`;
    downloadCSV(data, filename);
  };

  return (
    <section className="w-full max-w-6xl mx-auto bg-white rounded-lg shadow p-6 border border-gray-200 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-700">Analytics</h2>
        <div className="flex items-center gap-2">
          {(["today", "3days", "7days", "custom"] as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => startTransition(() => setCurrentRange(r))}
              className={`px-3 py-1.5 text-xs rounded border transition ${
                currentRange === r
                  ? "bg-gray-800 text-white border-gray-700"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
              }`}
            >
              {r === "today"
                ? "Today"
                : r === "3days"
                ? "3 Days"
                : r === "7days"
                ? "7 Days"
                : "Custom"}
            </button>
          ))}
        </div>
      </div>

      {/* Date range (custom only) */}
      {currentRange === "custom" && (
        <>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <CustomRange
              earliest={earliest}
              latest={latest}
              initialStart={customStart}
              initialEnd={customEnd}
              onApply={(start, end) => {
                if (currentRange !== "custom") setCurrentRange("custom");
                setCustomStart(start);
                setCustomEnd(end);
              }}
            />

            <button
              type="button"
              onClick={handleDownloadCustomCSV}
              disabled={!data || data.length === 0}
              className="px-3 py-1.5 text-xs rounded border bg-white text-gray-700 border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Download CSV
            </button>
          </div>

          {customError ? (
            <div className="text-sm text-red-600 mt-2">{customError}</div>
          ) : null}
        </>
      )}

      {/* Chart */}
      <AnalyticsChart
        data={data}
        seriesCatalog={ANALYTICS_SERIES as any}
        visibleKeys={visibleKeys as any}
        onToggle={(k) => handleToggle(k as SeriesKey | null)}
        xTicks={xTicks}
        formatTick={formatTick}
        isLoading={isLoading}
        xDomain={xDomain}
        isPVKey={(k) => isPVKey(k as SeriesKey)}
      />

      {/* Table */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold">Data Table</h3>
          <span className="text-[11px] text-slate-500">
            Totals clamp PV to ≥ 0; totals shown in MW (2 decimals).
          </span>
        </div>
        <AnalyticsTable
          data={data}
          tableSeries={tableSeries as any}
          totalsMW={totalsMW as any}
          isLoading={isLoading}
        />
      </div>
    </section>
  );
}
