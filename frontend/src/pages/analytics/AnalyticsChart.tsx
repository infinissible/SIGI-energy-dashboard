// pages/AnalyticsChart.tsx
import React from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

type Series = { key: string; name: string; color: string };

type Props = {
  data: any[];
  seriesCatalog: { key: string; name: string; color: string }[];
  visibleKeys: Set<string> | null;
  onToggle: (key: string | null) => void;
  xTicks: number[];
  formatTick: (n: number) => string;
  isLoading: boolean;
  xDomain: [number, number] | ["auto", "auto"];
  isPVKey?: (key: string) => boolean;
};

export default function AnalyticsChart({
  data,
  seriesCatalog,
  visibleKeys,
  onToggle,
  xTicks,
  formatTick,
  isLoading,
  xDomain,
  isPVKey,
}: Props) {
  const isVisible = (key: string) =>
    visibleKeys === null ? true : visibleKeys.has(key);

  const isPV = (key: string) => (isPVKey ? isPVKey(key) : false);

  const isBuilding = (key: string) =>
    key === "net_admin" || key === "b1086_net" || key === "b1200_net";

  const isMisc = (key: string) =>
    key === "ev_l3" || key === "admin_hvac" || key === "admin_plugs";

  if (isLoading) {
    return (
      <div className="h-[420px] flex items-center justify-center w-full">
        <div className="h-6 w-6 rounded-full border-2 border-gray-300 border-t-gray-700 animate-spin" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-[420px] flex items-center justify-center text-slate-700">
        No data available.
      </div>
    );
  }

  return (
    <div className="flex">
      <div className="flex-1 h-[420px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" />
            <XAxis
              dataKey="time"
              type="number"
              scale="time"
              domain={xDomain}
              ticks={xTicks}
              tickFormatter={formatTick}
              tick={{ fill: "#4A5568", fontSize: 12 }}
            />

            <YAxis
              tick={{ fill: "#4A5568", fontSize: 12 }}
              width={60}
              tickFormatter={(val) => `${val} kW`}
              domain={[-100, 300]}
            />

            <Tooltip
              labelFormatter={(label) => new Date(label).toLocaleString()}
              wrapperStyle={{ fontSize: 12 }}
            />
            {seriesCatalog.map(({ key, name, color }) => {
              if (!isVisible(key)) return null;

              const pv = isPV(key);
              const building = isBuilding(key);
              const misc = isMisc(key);

              const strokeDasharray = pv ? "6 4" : undefined;
              const strokeWidth = misc ? 1 : 2; // misc thinner, others normal
              const dot = false; // no dots at all

              return (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={color}
                  name={name}
                  strokeWidth={strokeWidth}
                  strokeDasharray={strokeDasharray}
                  dot={dot}
                  isAnimationActive={false}
                  onClick={() => onToggle(key)}
                  style={{ cursor: "pointer" }}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="ml-4 w-[180px] flex flex-col">
        <ul className="flex flex-col gap-2 list-none m-0 p-0">
          <li
            role="button"
            tabIndex={0}
            onClick={() => onToggle(null)}
            className={`cursor-pointer px-2 py-1 rounded text-xs font-medium border ${
              visibleKeys === null
                ? "bg-gray-300 text-slate-700 border-slate-200"
                : "bg-slate-50 text-slate-700 border-slate-50"
            }`}
          >
            All Series
          </li>
          {seriesCatalog.map(({ key, name, color }) => {
            const active = visibleKeys === null ? true : visibleKeys.has(key);
            return (
              <li
                key={key}
                role="button"
                tabIndex={0}
                onClick={() => onToggle(key)}
                className={`cursor-pointer px-2 py-1 rounded text-xs font-medium border flex items-center gap-2 ${
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
