// components/WeatherStation.tsx
import React from "react";
import { Sun, Cloud, CloudSun, CloudRain } from "lucide-react";
import { useWeatherDailySummary } from "@/hooks/useWeatherDailySummary";

const iconMap = {
  sun: <Sun className="w-6 h-6 text-gray-500" />,
  partly_cloud: <CloudSun className="w-6 h-6 text-gray-500" />,
  cloud: <Cloud className="w-6 h-6 text-gray-500" />,
  rainy: <CloudRain className="w-6 h-6 text-gray-500" />,
  no_data: <div className="w-6 h-6 text-gray-300">—</div>,
};

export default function WeatherStation() {
  const { data, loading } = useWeatherDailySummary(7);

  if (loading) {
    return (
      <div className="text-gray-500 flex items-center gap-2">
        <span className="inline-block h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
        Loading weather...
      </div>
    );
  }

  if (!data || data.length === 0) {
    return <div className="text-gray-500">No weather data available.</div>;
  }

  return (
    <div className="w-full grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
      {data.map((d, i) => (
        <div
          key={d.date ?? i}
          className="bg-white rounded-lg shadow-md p-2 flex flex-col items-center text-sm text-gray-800 border border-gray-200"
        >
          <div className="text-sm text-gray-500 mb-1">{d.dateLabel}</div>
          <div className="mb-1">{iconMap[d.iconKey]}</div>
        </div>
      ))}
    </div>
  );
}
