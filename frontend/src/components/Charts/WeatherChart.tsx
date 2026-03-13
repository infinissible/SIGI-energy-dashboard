// WeatherChart.tsx
import React, { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const WEATHER_SERIES = [
  { key: "ambient_temp_c", name: "Ambient Temp", color: "#4A90E2" },
  { key: "cell_temp_c", name: "Module Temp", color: "#D0021B" },
  {
    key: "ghr_wm2",
    name: "Global Horizontal Irradiance (GHI)",
    color: "#F5A623",
  },
  { key: "irradiance_wm2", name: "Plane-of-Array (POA)", color: "#7ED321" },
] as const;

type WeatherDataKey = (typeof WEATHER_SERIES)[number]["key"];

export default function WeatherChart({
  data,
  currentRange,
  formatTick,
  generateXTicks,
}: {
  data: any[];
  currentRange: string;
  formatTick: (tick: number) => string;
  generateXTicks: () => number[];
}) {
  const [visibleKeys, setVisibleKeys] = useState<Set<WeatherDataKey> | null>(
    null
  );

  const toggleVisibility = (key: WeatherDataKey) => {
    setVisibleKeys((prev) => {
      if (prev === null) return new Set([key]);
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size === 1) return null;
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const isVisible = (key: WeatherDataKey) =>
    visibleKeys === null || visibleKeys.has(key);

  const renderChart = (
    keys: WeatherDataKey[],
    yAxisUnit: string,
    domain: [number, number],
    ticks: number[]
  ) => (
    <div className="flex h-[200px] mb-6">
      <div className="flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
          >
            <CartesianGrid
              stroke="#E2E8F0"
              strokeDasharray="2 2"
              vertical
              horizontal
            />
            <XAxis
              dataKey="time"
              type="number"
              scale="time"
              domain={
                currentRange === "today"
                  ? [
                      new Date().setHours(0, 0, 0, 0),
                      new Date().setHours(23, 59, 59, 999),
                    ]
                  : ["auto", "auto"]
              }
              ticks={generateXTicks()}
              tickFormatter={formatTick}
              tick={{ fill: "#4A5568", fontSize: 12 }}
            />
            <YAxis
              domain={domain}
              ticks={ticks}
              tick={({ payload, x, y }) => (
                <text
                  x={x - 5}
                  y={y + 4}
                  textAnchor="end"
                  fontSize={12}
                  fill="#4A5568"
                >
                  {payload.value} {yAxisUnit}
                </text>
              )}
            />
            <Tooltip
              labelFormatter={(label) => new Date(label).toLocaleString()}
              wrapperStyle={{ fontSize: 12 }}
            />
            {keys.map((key) => {
              const meta = WEATHER_SERIES.find((s) => s.key === key);
              if (!meta || !isVisible(key)) return null;
              return (
                <Line
                  key={key}
                  dataKey={key}
                  name={meta.name}
                  stroke={meta.color}
                  dot={false}
                  strokeWidth={2}
                  type="monotone"
                  isAnimationActive={false}
                  onClick={() => toggleVisibility(key)}
                  style={{ cursor: "pointer" }}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Right-aligned legend */}
      <div className="ml-4 w-[140px] flex flex-col justify-start">
        <ul className="flex flex-col gap-2 m-0 p-0 list-none">
          {keys.map((key) => {
            const meta = WEATHER_SERIES.find((s) => s.key === key);
            const active = isVisible(key);
            if (!meta) return null;
            return (
              <li
                key={key}
                role="button"
                tabIndex={0}
                onClick={() => toggleVisibility(key)}
                className={`cursor-pointer px-1 py-1 rounded text-xs font-medium border flex items-center gap-2 ${
                  active
                    ? "bg-gray-300 text-slate-700 border-slate-200"
                    : "bg-slate-50 text-slate-700 border-slate-50"
                }`}
              >
                <span
                  aria-hidden
                  className="inline-block w-5 h-[2px]"
                  style={{ background: meta.color }}
                />
                <span className="text-left">{meta.name}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );

  const temperatureKeys: WeatherDataKey[] = ["ambient_temp_c", "cell_temp_c"];
  const irradianceKeys: WeatherDataKey[] = ["ghr_wm2", "irradiance_wm2"];

  return (
    <div className="flex flex-col h-full">
      <h3 className="text-sm font-semibold text-slate-700 mb-1">Temperature</h3>
      {renderChart(temperatureKeys, "°C", [0, 50], [0, 10, 20, 30, 40, 50])}

      <h3 className="text-sm font-semibold text-slate-700 mb-1">Irradiance</h3>
      {renderChart(
        irradianceKeys,
        "W/m²",
        [-50, 1000],
        [0, 200, 400, 600, 800, 1000]
      )}
    </div>
  );
}
