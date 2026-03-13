// components/charts/BuildingChart.tsx
import React, { useMemo, useState, useEffect } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

const BUILDING_SERIES = [
  { key: "ev_l3", name: "EV Load (L3)", color: "#4299E1" },
  { key: "net_admin", name: "Admin Net Load", color: "#6B46C1" },
  { key: "b1086_net", name: "B1086 Net Load", color: "#2B6CB0" }, // NEW
  { key: "b1200_net", name: "B1200 Net Load", color: "#38A169" }, // NEW
  { key: "admin_hvac", name: "Admin HVACs", color: "#D53F8C" },
  { key: "admin_plugs", name: "Admin Plug Loads", color: "#ED8936" },
] as const;

type BuildingKey = (typeof BUILDING_SERIES)[number]["key"];

const BUILDING_SYSTEM_KEY_MAP: Record<string, BuildingKey[]> = {
  b1084: ["net_admin"], // Admin building
  b1086: ["b1086_net"], // Building 1086
  b1200: ["b1200_net"], // Building 1200
  ev_l3: ["ev_l3"], // EV Charger L3 only
  all: BUILDING_SERIES.map((s) => s.key),
};

type Props = {
  data: any[];
  currentRange: "today" | "3days" | "7days";
  formatTick: (tick: number) => string;
  generateXTicks: () => number[];
  selectedSystem: string;
};

export default function BuildingChart({
  data,
  currentRange,
  formatTick,
  generateXTicks,
  selectedSystem,
}: Props) {
  // null = "all default series visible"
  const [visibleKeys, setVisibleKeys] = useState<Set<BuildingKey> | null>(null);

  const defaultVisibleSet = useMemo<Set<BuildingKey>>(() => {
    const keys =
      BUILDING_SYSTEM_KEY_MAP[selectedSystem] ??
      BUILDING_SERIES.map((s) => s.key);
    return new Set(keys);
  }, [selectedSystem]);

  useEffect(() => {
    // Reset visibility when the time range OR selected system changes
    setVisibleKeys(null);
  }, [currentRange, selectedSystem]);

  const isVisible = (key: BuildingKey) =>
    visibleKeys === null ? defaultVisibleSet.has(key) : visibleKeys.has(key);

  const handleToggle = (key: BuildingKey | null) => {
    if (key === null) {
      // "All Series" = literally all building series
      setVisibleKeys(new Set<BuildingKey>(BUILDING_SERIES.map((s) => s.key)));
      return;
    }
    setVisibleKeys((prev) => {
      if (prev === null) return new Set<BuildingKey>([key]);
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };
  const allActive =
    visibleKeys === null
      ? defaultVisibleSet.size === BUILDING_SERIES.length
      : visibleKeys.size === BUILDING_SERIES.length;

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
            {BUILDING_SERIES.map(({ key, name, color }) =>
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
          {BUILDING_SERIES.map(({ key, name, color }) => {
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
