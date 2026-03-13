// components/charts/Chart.tsx
import React, { useState, useEffect } from "react";
import ClipLoader from "react-spinners/ClipLoader";
import InverterChart from "./InverterChart";
import BuildingChart from "./BuildingChart";
import WeatherChart from "./WeatherChart";
import useInverterPowerData from "@/hooks/useInverterPowerData";
import useWeatherData from "@/hooks/useWeatherData";

type Tab = "inverter" | "building" | "weather";

export default function Chart({
  selectedSystem,
  setSelectedSystem,
}: {
  selectedSystem: string;
  setSelectedSystem: (val: string) => void;
}) {
  const [selectedTab, setSelectedTab] = useState<Tab>("inverter");
  const [currentRange, setCurrentRange] = useState<"today" | "3days" | "7days">(
    "today"
  );

  useEffect(() => {
    // Building-related keys → Building tab, everything else → Inverter tab
    const buildingKeys = ["b1084", "b1086", "b1200", "ev_l3"];

    if (buildingKeys.includes(selectedSystem)) {
      setSelectedTab("building");
    } else {
      setSelectedTab("inverter");
    }
  }, [selectedSystem]);

  const { data: inverterData, loading: inverterLoading } =
    useInverterPowerData(currentRange);
  const { data: weatherData, loading: weatherLoading } =
    useWeatherData(currentRange);

  const chartTitleMap: Record<Tab, string> = {
    inverter: "Inverter Power",
    building: "Building Loads",
    weather: "Weather Station",
  };

  const formatTick = (tick: number) => {
    const date = new Date(tick);
    return currentRange === "today"
      ? date.toLocaleTimeString([], { hour: "numeric" })
      : date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  const generateXTicks = () => {
    const source = selectedTab === "weather" ? weatherData : inverterData;
    if (!source || source.length === 0) return [];
    const ticks: number[] = [];
    if (currentRange === "today") {
      const base = new Date();
      base.setHours(0, 0, 0, 0);
      for (let i = 0; i <= 24; i += 6) {
        const t = new Date(base);
        t.setHours(i);
        ticks.push(t.getTime());
      }
    } else {
      const times = source.map((d: any) => d.time);
      const start = new Date(times[0]);
      const end = new Date(times[times.length - 1]);
      const cur = new Date(start);
      cur.setHours(0, 0, 0, 0);
      while (cur <= end) {
        ticks.push(cur.getTime());
        cur.setDate(cur.getDate() + 1);
      }
    }
    return ticks;
  };

  const loading =
    (selectedTab === "inverter" && inverterLoading) ||
    (selectedTab === "building" && inverterLoading) ||
    (selectedTab === "weather" && weatherLoading);

  return (
    <div className="relative flex flex-col w-full mb-6 shadow-lg rounded bg-white font-sans border border-gray-200">
      <div className="rounded-t px-4 py-3 bg-transparent border-b border-gray-200">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex items-center gap-2">
            {(["inverter", "building", "weather"] as Tab[]).map((key) => (
              <button
                key={key}
                onClick={() => setSelectedTab(key)}
                className={`px-3 py-1.5 text-xs rounded border transition ${
                  selectedTab === key
                    ? "bg-gray-800 text-white border-gray-700"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                }`}
              >
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </button>
            ))}
          </div>

          {/* Chart title centered */}
          <h2 className="text-sm sm:text-base font-semibold text-slate-700 mx-auto">
            {chartTitleMap[selectedTab]}
          </h2>

          {/* Range buttons */}
          <div className="flex flex-wrap justify-end gap-2">
            {["today", "3days", "7days"].map((range) => {
              const isActive = currentRange === range;
              return (
                <button
                  key={range}
                  onClick={() => setCurrentRange(range as any)}
                  disabled={loading}
                  className={`px-3 py-1 text-xs font-semibold rounded border transition
        ${loading ? "opacity-50 cursor-not-allowed" : ""}
        ${
          isActive
            ? "bg-gray-800 text-white border-gray-700"
            : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
        }`}
                >
                  {range === "today"
                    ? "Today"
                    : range === "3days"
                    ? "3 Days"
                    : "7 Days"}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="p-4 flex-auto h-[400px]">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <ClipLoader color="#999999" size={80} />
          </div>
        ) : selectedTab === "inverter" ? (
          inverterData && inverterData.length > 0 ? (
            <InverterChart
              data={inverterData}
              selectedSystem={selectedSystem}
              setSelectedSystem={setSelectedSystem}
              currentRange={currentRange}
              formatTick={formatTick}
              generateXTicks={generateXTicks}
            />
          ) : (
            <div className="text-center text-slate-700 text-sm">
              No inverter data available.
            </div>
          )
        ) : selectedTab === "building" ? (
          inverterData && inverterData.length > 0 ? (
            <BuildingChart
              data={inverterData}
              selectedSystem={selectedSystem}
              currentRange={currentRange}
              formatTick={formatTick}
              generateXTicks={generateXTicks}
            />
          ) : (
            <div className="text-center text-slate-700 text-sm">
              No building data available.
            </div>
          )
        ) : weatherData && weatherData.length > 0 ? (
          <WeatherChart
            data={weatherData}
            currentRange={currentRange}
            formatTick={formatTick}
            generateXTicks={generateXTicks}
          />
        ) : (
          <div className="text-center text-slate-700 text-sm">
            No weather data available.
          </div>
        )}
      </div>
    </div>
  );
}
