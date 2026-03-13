import React, { useMemo, useState } from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import useDailySummary, { SummaryRange } from "@/hooks/useDailySummary";
import useEnergyToday from "@/hooks/useEnergyToday";
import WeatherStation from "./Weather";

function formatTodayLabel() {
  const d = new Date();
  const month = d.toLocaleString("en-US", { month: "short" });
  const day = String(d.getDate()).padStart(2, "0"); // match "%b %d, %Y"
  return `${month} ${day}, ${d.getFullYear()}`;
}

export default function SummaryAndTrends() {
  // Always 7 days for this report
  const { data: dailySummary, loading: loadingSummary } =
    useDailySummary("7days");

  // Live “today” totals (admin + 1086 + 1200)
  const { data: energyToday, loading: loadingToday } = useEnergyToday();

  const chartData = useMemo(() => {
    // Start with 7-day historical totals (already aggregated in hook)
    let out = [...dailySummary];

    if (energyToday) {
      const todayLabel = formatTodayLabel();

      const admin = energyToday.admin;
      const b1086 = energyToday.b1086;
      const b1200 = energyToday.b1200;

      const buildings = [admin, b1086, b1200].filter(
        (b): b is NonNullable<typeof b> => !!b
      );

      const totalPV = buildings.reduce(
        (sum, b) => sum + (b.pv_supplied_kwh || 0),
        0
      );
      const totalConsumed = buildings.reduce(
        (sum, b) => sum + (b.load_kwh || 0),
        0
      );
      const totalExport = buildings.reduce(
        (sum, b) => sum + Math.abs(b.exported_kwh || 0),
        0
      );

      const RETAIL_RATE = 0.25;
      const totalSavings = buildings.reduce((sum, b) => {
        const pv = b.pv_supplied_kwh || 0;
        const expAbs = Math.abs(b.exported_kwh || 0);
        const selfUse = Math.max(0, pv - expAbs);
        return sum + selfUse * RETAIL_RATE;
      }, 0);

      const todayRow = {
        date: todayLabel,
        generated: Number(totalPV.toFixed(2)),
        consumed: Number(totalConsumed.toFixed(2)),
        exported: Number(totalExport.toFixed(2)),
        savings: Number(totalSavings.toFixed(2)),
      };

      const idx = out.findIndex((d) => d.date === todayLabel);
      if (idx >= 0) out[idx] = todayRow;
      else out.push(todayRow);
    }

    // Backend already limits to last 7 days; if it ever returns more, keep last 7.
    if (out.length > 7) {
      out = out.slice(out.length - 7);
    }

    return out;
  }, [dailySummary, energyToday]);

  const loading = loadingSummary || loadingToday;

  return (
    <section className="w-full bg-white rounded-lg shadow p-4 pt-4 space-y-2 border border-gray-200">
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 25, right: 0, left: 10, bottom: 0 }}
          >
            {/* Centered chart title */}
            <text
              x="50%"
              y={0}
              textAnchor="middle"
              dominantBaseline="hanging"
              className="recharts-text"
              style={{ fontSize: 14, fontWeight: 700, fill: "#374151" }}
            >
              All Buildings and Inverters (Last 7 Days)
            </text>

            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 13 }} />
            <YAxis
              yAxisId="left"
              unit=" kWh"
              tick={{ fontSize: 13 }}
              width={50}
              domain={[0, 4000]}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tickFormatter={(v) => `$${v}`}
              tick={{ fontSize: 13 }}
              width={50}
            />
            <Tooltip
              formatter={(value: any, name: any) =>
                name === "Savings" ? [`$${value}`, name] : [value, name]
              }
              contentStyle={{ fontSize: "13px" }}
              itemStyle={{ fontSize: "13px" }}
            />
            <Legend wrapperStyle={{ fontSize: "13px" }} iconSize={12} />

            <Bar
              dataKey="consumed"
              barSize={14}
              fill="#f28e8e"
              name="Energy Consumed"
              yAxisId="left"
            />
            <Bar
              dataKey="generated"
              barSize={14}
              fill="#82ca9d"
              name="PV Generated"
              yAxisId="left"
            />
            <Bar
              dataKey="exported"
              barSize={14}
              fill="#8884d8"
              name="Energy Exported"
              yAxisId="left"
            />
            <Line
              type="monotone"
              dataKey="savings"
              stroke="#ffc658"
              name="Savings"
              yAxisId="right"
              strokeWidth={2}
              dot={{ r: 3, stroke: "#ffc658", strokeWidth: 1, fill: "white" }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <WeatherStation />
    </section>
  );
}
