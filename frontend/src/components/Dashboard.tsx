import { useState, useEffect } from "react";
import HeaderStats from "./HeaderStats";

export default function Dashboard() {
  //   const [solarRaw, setSolarRaw] = useState([]);
  //   const [solarSummary, setSolarSummary] = useState({});
  //   const [weather, setWeather] = useState({});
  //   const [loading, setLoading] = useState(true);

  //   const [chartData, setChartData] = useState([]);
  //   const [chartLoading, setChartLoading] = useState(false);
  //   const [currentRange, setCurrentRange] = useState("today");

  //   const apiBase = process.env.REACT_APP_API_BASE || "";

  //   const fetchData = async () => {
  //     try {
  //       setLoading(true);
  //       const [rawRes, summaryRes, weatherRes] = await Promise.all([
  //         fetch(`${apiBase}/backend/api/solar/raw/latest`),
  //         fetch(`${apiBase}/backend/api/solar/summary`),
  //         fetch(`${apiBase}/backend/api/solar/weather/latest`),
  //       ]);

  //       const [rawData, summaryData, weatherData] = await Promise.all([
  //         rawRes.json(),
  //         summaryRes.json(),
  //         weatherRes.json(),
  //       ]);

  //       setSolarRaw(Array.isArray(rawData) ? rawData : [rawData]);
  //       setSolarSummary(summaryData);
  //       setWeather(weatherData);
  //     } catch (err) {
  //       console.error("Dashboard fetch error:", err);
  //     } finally {
  //       setLoading(false);
  //     }
  //   };

  //   const fetchChartData = async (range = "today") => {
  //     setChartLoading(true);
  //     setCurrentRange(range);

  //     try {
  //       const res = await fetch(`${apiBase}/backend/api/solar/${range}`);
  //       const data = await res.json();

  //       const formatted = data.map((item) => ({
  //         time: new Date(item.time).getTime(),
  //         pv_1084: item.pv_gen_1084 != null ? Number(item.pv_gen_1084) : null,
  //         pv_1086: item.pv_gen_1086 != null ? Number(item.pv_gen_1086) : null,
  //         pv_1200: item.pv_gen_1200 != null ? Number(item.pv_gen_1200) : null,
  //         total_power: item.total_power != null ? Number(item.total_power) : null,
  //         net_1084: item.net_1084 != null ? Number(item.net_1084) : null,
  //       }));

  //       setChartData(formatted);
  //     } catch (err) {
  //       console.error("Chart data fetch error:", err);
  //       setChartData([]);
  //     } finally {
  //       setChartLoading(false);
  //     }
  //   };

  //   useEffect(() => {
  //     fetchData();
  //     fetchChartData("today");
  //     const interval = setInterval(fetchData, 60000);
  //     return () => clearInterval(interval);
  //   }, []);

  return (
    <div className="flex flex-col md:flex-row gap-2">
      <div className="bg-white rounded-xl shadow-lg p-6 w-full">
        <HeaderStats
        //   rawData={solarRaw}
        //   summaryData={solarSummary}
        //   weatherData={weather}
        //   loading={loading}
        //   chartData={chartData}
        //   chartLoading={chartLoading}
        //   currentRange={currentRange}
        //   onRangeChange={fetchChartData}
        />
      </div>
    </div>
  );
}
