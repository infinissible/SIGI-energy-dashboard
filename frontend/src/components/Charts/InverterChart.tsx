// components/charts/InverterChart.tsx
import React, { useMemo, useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const SERIES = [
  { key: "total_power", name: "Total PV Gen", color: "#9B2C2C" },
  { key: "pv_1086", name: "Inverter A", color: "#2F855A" },
  { key: "pv_1200", name: "Inverter B", color: "#B7791F" },
  { key: "pv_1084", name: "Inverter C", color: "#2B6CB0" },
] as const;

const systemKeyMap: Record<string, string[]> = {
  "1084": ["pv_1084"],
  "1086": ["pv_1086"],
  "1200": ["pv_1200"],
  all: SERIES.map((s) => s.key),
};

type InverterPowerData = {
  [key: string]: number | string | null;
  time: number;
};

type InverterChartProps = {
  data: InverterPowerData[];
  selectedSystem: string;
  setSelectedSystem: (val: string) => void;
  currentRange: "today" | "3days" | "7days";
  formatTick: (tick: number) => string;
  generateXTicks: () => number[];
};

export default function InverterChart({
  data,
  selectedSystem,
  setSelectedSystem,
  currentRange,
  formatTick,
  generateXTicks,
}: InverterChartProps) {
  const [visibleKeys, setVisibleKeys] = useState<Set<string> | null>(null);

  const defaultVisibleSet = useMemo(() => {
    const preset = new Set<string>(systemKeyMap[selectedSystem] ?? []);
    return preset.size > 0 ? preset : new Set(SERIES.map((s) => s.key));
  }, [selectedSystem]);

  useEffect(() => {
    setVisibleKeys(null);
  }, [selectedSystem, currentRange]);

  const isVisible = (key: string) =>
    visibleKeys === null ? defaultVisibleSet.has(key) : visibleKeys.has(key);

  const handleToggle = (key: string | null) => {
    if (key === null) {
      // "All Series" = literally all lines visible
      setVisibleKeys(new Set(SERIES.map((s) => s.key)));
      return;
    }

    setVisibleKeys((prev) => {
      if (prev === null) return new Set([key]);
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };
  const allActive =
    visibleKeys === null
      ? defaultVisibleSet.size === SERIES.length
      : visibleKeys.size === SERIES.length;

  return (
    <div className="flex h-full">
      <div className="flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid stroke="#E2E8F0" strokeDasharray="2 2" vertical />
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
              domain={[-50, 350]}
              ticks={[-50, 0, 50, 100, 150, 200, 250, 300, 350]}
              tick={({ payload, x, y }) => (
                <text
                  x={x - 5}
                  y={y + 4}
                  textAnchor="end"
                  fontSize={12}
                  fill="#4A5568"
                >
                  {payload.value} kW
                </text>
              )}
            />
            <Tooltip
              labelFormatter={(label) => new Date(label).toLocaleString()}
              wrapperStyle={{ fontSize: 12 }}
            />
            {SERIES.map(({ key, name, color }) =>
              isVisible(key) ? (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={color}
                  name={name}
                  dot={false}
                  strokeWidth={2}
                  isAnimationActive={false}
                  onClick={() => handleToggle(key)}
                  style={{ cursor: "pointer" }}
                />
              ) : null
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="ml-4 w-[140px] flex flex-col justify-start">
        <ul className="flex flex-col gap-2 m-0 p-0 list-none">
          <li
            role="button"
            tabIndex={0}
            onClick={() => handleToggle(null)}
            className={`cursor-pointer px-2 py-1 rounded text-xs font-medium border ${
              allActive
                ? "bg-gray-300 text-slate-700 border-slate-200"
                : "bg-slate-50 text-slate-700 border-slate-50"
            }`}
          >
            All Series
          </li>
          {SERIES.map(({ key, name, color }) => {
            const active = isVisible(key);
            return (
              <li
                key={key}
                role="button"
                tabIndex={0}
                onClick={() => handleToggle(key)}
                className={`cursor-pointer px-1 py-1 rounded text-xs font-medium border flex items-center gap-2 ${
                  active
                    ? "bg-gray-300 text-slate-700 border-slate-200"
                    : "bg-slate-50 text-slate-700 border-slate-50"
                }`}
              >
                <span
                  aria-hidden
                  className="inline-block w-5 h-[2px]"
                  style={{ background: color }}
                />
                <span className="text-left">{name}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
