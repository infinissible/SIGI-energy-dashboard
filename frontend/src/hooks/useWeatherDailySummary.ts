// hooks/useWeatherDailySummary.ts
import { useState, useEffect } from "react";

export type IconKey = "sun" | "partly_cloud" | "cloud" | "rainy" | "no_data";

export type WeatherDailySummary = {
  date: string; // "YYYY-MM-DD" (from DATE_FORMAT in SQL)
  ambient_min_c: number | string;
  ambient_max_c: number | string;
  ambient_avg_c: number | string;
  cell_min_c: number | string;
  cell_max_c: number | string;
  cell_avg_c: number | string;
  ghr_min_wm2: number | string;
  ghr_max_wm2: number | string;
  ghr_avg_wm2: number | string;
  irr_min_wm2: number | string;
  irr_max_wm2: number | string;
  irr_avg_wm2: number | string;
  samples_count?: number | string;
  completeness_pct?: number | string;
  updated_at_utc?: string;
  dateLabel: string; // "Aug 15"
  iconKey: IconKey;
};

const ICON_THRESHOLDS = {
  rainyAvgCap: 150,
  rainyMaxCap: 400,
  sunAvg: 600,
  sunMax: 800,
  clarityRatioSun: 0.55,
  cloudAvg: 250,
  clarityRatioPartly: 0.3,
};

function pickIconFromIrradiance(
  irrAvg: number,
  irrMax: number,
  ghrAvg: number
): IconKey {
  const t = ICON_THRESHOLDS;
  const avg = irrAvg || 0;
  const max = irrMax || 0;
  const ratio = max > 0 ? avg / max : 0;

  if (avg <= t.rainyAvgCap && max <= t.rainyMaxCap) return "rainy";
  if (avg >= t.sunAvg || max >= t.sunMax || ratio >= t.clarityRatioSun)
    return "sun";
  if (avg >= t.cloudAvg || ratio >= t.clarityRatioPartly) return "partly_cloud";
  return "cloud";
}

function toShortLabelYYYYMMDD(dateStr: string): string {
  // dateStr guaranteed "YYYY-MM-DD"
  const [y, m, d] = dateStr.split("-").map(Number);
  const js = new Date(y, (m ?? 1) - 1, d ?? 1);
  return js.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// Helper to decide if this row really has no usable data
function isNoData(row: any): boolean {
  const irrAvg = row?.irr_avg_wm2;
  const irrMax = row?.irr_max_wm2;
  const ghrAvg = row?.ghr_avg_wm2;
  const ambientMin = row?.ambient_min_c;
  const cellMin = row?.cell_min_c;

  const samples = row?.samples_count;
  const samplesNum = samples != null && samples !== "" ? Number(samples) : NaN;

  const allKeyFieldsNull =
    irrAvg == null &&
    irrMax == null &&
    ghrAvg == null &&
    ambientMin == null &&
    cellMin == null;

  const noSamples = !Number.isFinite(samplesNum) || samplesNum === 0;

  return allKeyFieldsNull || noSamples;
}

// Single mapping function used for both initial load and refresh
function mapWeatherRow(row: any): WeatherDailySummary {
  const date = String(row?.date ?? ""); // "YYYY-MM-DD"

  const irrAvgNum = Number(row?.irr_avg_wm2);
  const irrMaxNum = Number(row?.irr_max_wm2);
  const ghrAvgNum = Number(row?.ghr_avg_wm2);

  const noData = isNoData(row);

  const iconKey: IconKey = noData
    ? "no_data"
    : pickIconFromIrradiance(
        Number.isFinite(irrAvgNum) ? irrAvgNum : 0,
        Number.isFinite(irrMaxNum) ? irrMaxNum : 0,
        Number.isFinite(ghrAvgNum) ? ghrAvgNum : 0
      );

  return {
    ...row,
    date,
    dateLabel: toShortLabelYYYYMMDD(date),
    iconKey,
  };
}

export function useWeatherDailySummary(days = 7) {
  const [data, setData] = useState<WeatherDailySummary[]>([]);
  const [loading, setLoading] = useState(false);
  const apiBase = import.meta.env.VITE_API_BASE_PATH || "";

  useEffect(() => {
    let alive = true;

    const fetchDaily = async (withLoading: boolean) => {
      if (withLoading) setLoading(true);
      try {
        const res = await fetch(`${apiBase}/backend/api/solar/weather/daily`);
        const json = await res.json();
        const mapped: WeatherDailySummary[] = (
          Array.isArray(json) ? json : []
        ).map(mapWeatherRow);
        if (alive) {
          // backend already returns 7 most recent ASC, but just in case:
          setData(mapped.slice(-days));
        }
      } catch (e) {
        console.error("Failed to fetch weather summary:", e);
        if (alive && withLoading) setData([]);
      } finally {
        if (alive && withLoading) setLoading(false);
      }
    };

    // initial load
    fetchDaily(true);

    // 5-minute refresh
    const id = setInterval(() => {
      fetchDaily(false);
    }, 5 * 60 * 1000);

    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [days, apiBase]);

  return { data, loading };
}
