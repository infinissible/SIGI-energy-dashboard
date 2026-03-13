import { useState, useEffect } from "react";

export type WeatherDataPoint = {
  time: number;
  ambient_temp_c: number;
  cell_temp_c: number;
  ghr_wm2: number;
  irradiance_wm2: number;
};

export default function useWeatherData(
  range: "today" | "3days" | "7days" = "today"
) {
  const [data, setData] = useState<WeatherDataPoint[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const apiBase = import.meta.env.VITE_API_BASE_PATH || "";

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `${apiBase}/backend/api/solar/weather/${range}`
        );
        const json = await res.json();

        const parsed: WeatherDataPoint[] = (json ?? [])
          .map(
            (item: any): WeatherDataPoint => ({
              time: Number(item.time), // backend already returns epoch ms
              ambient_temp_c: Number(item.ambient_temp_c),
              cell_temp_c: Number(item.cell_temp_c),
              ghr_wm2: Number(item.ghr_wm2),
              irradiance_wm2: Number(item.irradiance_wm2),
            })
          )
          .sort((a: WeatherDataPoint, b: WeatherDataPoint) => a.time - b.time);

        if (isMounted) setData(parsed);
      } catch (e) {
        console.error("Failed to fetch weather data:", e);
        if (isMounted) setData([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();
    const intervalId = setInterval(fetchData, 5 * 60 * 1000);

    return () => {
      clearInterval(intervalId);
      isMounted = false;
    };
  }, [range, apiBase]);

  return { data, loading };
}
