import { useState, useEffect } from "react";

export type LatestInverterPowerData = {
  time: number;
  pv_1084: number | null;
  pv_1086: number | null;
  pv_1200: number | null;
  total_power: number | null;
  net_admin: number | null;
};

export default function useLatestInverterPowerData() {
  const [data, setData] = useState<LatestInverterPowerData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const apiBase = import.meta.env.VITE_API_BASE_PATH || "";

  useEffect(() => {
    const fetchLatestData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${apiBase}/backend/api/solar/raw/latest`);
        const raw = await res.json();

        const formatted: LatestInverterPowerData = {
          time: new Date(raw.time).getTime(),
          pv_1084: raw.pv_1084 != null ? Number(raw.pv_1084) : null,
          pv_1086: raw.pv_1086 != null ? Number(raw.pv_1086) : null,
          pv_1200: raw.pv_1200 != null ? Number(raw.pv_1200) : null,
          total_power: raw.total_power != null ? Number(raw.total_power) : null,
          net_admin: raw.net_admin != null ? Number(raw.net_admin) : null,
        };

        setData(formatted);
      } catch (err) {
        console.error("Failed to fetch latest inverter power data:", err);
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchLatestData();
  }, [apiBase]);

  return { data, loading };
}
