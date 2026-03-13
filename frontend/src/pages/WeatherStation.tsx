// components/WeatherStation.tsx
import React from "react";
import { Sun, Cloud, CloudSun, CloudRain } from "lucide-react";
import { useWeatherDailySummary } from "@/hooks/useWeatherDailySummary";

const iconMap: Record<string, React.ReactNode> = {
  sun: <Sun className="w-5 h-5 text-gray-500" />,
  partly_cloud: <CloudSun className="w-5 h-5 text-gray-500" />,
  cloud: <Cloud className="w-5 h-5 text-gray-500" />,
  rainy: <CloudRain className="w-5 h-5 text-gray-500" />,
  no_data: <div className="w-6 h-6 text-gray-300">—</div>,
};

function toNum(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function fmt(v: unknown, digits = 0) {
  const n = toNum(v);
  return n == null
    ? "—"
    : n.toLocaleString(undefined, { maximumFractionDigits: digits });
}
function pair(v1: unknown, v2: unknown, digits = 0) {
  return `${fmt(v1, digits)} / ${fmt(v2, digits)}`;
}
function pct(v: unknown) {
  const n = toNum(v);
  return n == null ? "—" : `${Math.round(n)}%`;
}

export default function WeatherStation() {
  const { data, loading } = useWeatherDailySummary(7);

  return (
    <main className="w-full max-w-7xl mx-auto px-2 sm:px-4 md:px-6">
      {/* Header */}
      <section className="mb-4 bg-white border border-gray-200 rounded-xl p-3">
        <h1 className="text-3xl font-semibold text-left pb-2 border-b border-gray-200">
          Weather Station
        </h1>
        <ul className="mt-2 text-[13px] leading-tight space-y-1.5 text-gray-800 text-left">
          <li>
            <span className="text-gray-600">&lt;Data Collection&gt;</span>
          </li>
          <li>
            <span className="font-medium">
              Weather Station 1: Ambient Temp (°F), Cell Temp (°F), Global
              Horizontal Irradiance (GHI, W/m²)
            </span>
          </li>
          <li>
            <span className="font-medium">
              Weather Station 2: Plane-of-Array Irradiance (POA, W/m²)
            </span>
          </li>
        </ul>
      </section>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-700 border-b border-gray-200">
              <tr>
                <th className="px-3 py-2 text-left align-bottom">
                  <div className="font-semibold">Date</div>
                  <div className="text-[11px] text-gray-500 leading-tight">
                    &nbsp;
                  </div>
                </th>
                <th className="px-3 py-2 text-left align-bottom">
                  <div className="font-semibold">Icon</div>
                  <div className="text-[11px] text-gray-500 leading-tight">
                    &nbsp;
                  </div>
                </th>

                <th className="px-3 py-2 text-right align-bottom">
                  <div className="font-semibold">Ambient Temp (°C)</div>
                  <div className="text-[11px] text-gray-500 leading-tight">
                    min / max
                  </div>
                </th>

                <th className="px-3 py-2 text-right align-bottom">
                  <div className="font-semibold">Cell Temp (°C)</div>
                  <div className="text-[11px] text-gray-500 leading-tight">
                    min / max
                  </div>
                </th>

                <th className="px-3 py-2 text-right align-bottom">
                  <div className="font-semibold">GHR (W/m²)</div>
                  <div className="text-[11px] text-gray-500 leading-tight">
                    avg / max
                  </div>
                </th>

                <th className="px-3 py-2 text-right align-bottom">
                  <div className="font-semibold">Irradiance (W/m²)</div>
                  <div className="text-[11px] text-gray-500 leading-tight">
                    avg / max
                  </div>
                </th>

                <th className="px-3 py-2 text-right align-bottom">
                  <div className="font-semibold">Data Points</div>
                  <div className="text-[11px] text-gray-500 leading-tight">
                    &nbsp;
                  </div>
                </th>
                <th className="px-3 py-2 text-right align-bottom">
                  <div className="font-semibold">Completeness</div>
                  <div className="text-[11px] text-gray-500 leading-tight">
                    &nbsp;
                  </div>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200 text-gray-900">
              {!data || data.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-3 py-6 text-center text-gray-500"
                  >
                    No weather data available.
                  </td>
                </tr>
              ) : (
                data.map((d, i) => (
                  <tr key={d.date ?? i} className="hover:bg-gray-50">
                    <td className="px-3 py-2 whitespace-nowrap">
                      {d.dateLabel}
                    </td>
                    <td className="px-3 py-2">
                      {iconMap[d.iconKey] ?? iconMap.cloud}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {pair(d.ambient_min_c, d.ambient_max_c, 1)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {pair(d.cell_min_c, d.cell_max_c, 1)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {pair(d.ghr_avg_wm2, d.ghr_max_wm2, 0)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {pair(d.irr_avg_wm2, d.irr_max_wm2, 0)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {fmt(d.samples_count)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {pct(d.completeness_pct)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {loading && (
          <div className="px-3 py-2 border-t border-gray-200 text-xs text-gray-500 flex items-center gap-2">
            <span className="inline-block h-3 w-3 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
            refreshing…
          </div>
        )}
      </div>
    </main>
  );
}
