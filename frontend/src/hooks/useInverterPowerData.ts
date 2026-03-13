import { useState, useEffect } from "react";

export type InverterPowerData = {
  time: number;
  pv_1084: number | null; // Inverter C
  pv_1086: number | null; // Inverter A
  pv_1200: number | null; // Inverter B
  total_power: number | null;
  net_admin: number | null;
  ev_l3: number | null;
  admin_hvac: number | null;
  admin_plugs: number | null;
  b1086_net: number | null; // NEW
  b1200_net: number | null; // NEW
};

const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export default function useInverterPowerData(range: string = "today") {
  const [data, setData] = useState<InverterPowerData[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const apiBase = import.meta.env.VITE_API_BASE_PATH || "";

  useEffect(() => {
    let isMounted = true;
    let controller = new AbortController();

    const mapRow = (item: any): InverterPowerData => ({
      time: new Date(item.time).getTime(),
      pv_1084: item.pv_gen_1084 != null ? Number(item.pv_gen_1084) : null,
      pv_1086: item.pv_gen_1086 != null ? Number(item.pv_gen_1086) : null,
      pv_1200: item.pv_gen_1200 != null ? Number(item.pv_gen_1200) : null,
      total_power: item.total_power != null ? Number(item.total_power) : null,
      net_admin: item.net_admin != null ? Number(item.net_admin) : null,
      ev_l3: item.ev_l3 != null ? Number(item.ev_l3) : null,
      admin_hvac: item.admin_hvac != null ? Number(item.admin_hvac) : null,
      admin_plugs: item.admin_plugs != null ? Number(item.admin_plugs) : null,
      b1086_net: item.b1086_net != null ? Number(item.b1086_net) : null, // NEW
      b1200_net: item.b1200_net != null ? Number(item.b1200_net) : null, // NEW
    });

    const fetchRangeData = async (showSpinner = false) => {
      if (showSpinner) setLoading(true);
      try {
        // Refresh controller for each request
        controller.abort();
        controller = new AbortController();

        const res = await fetch(`${apiBase}/backend/api/solar/${range}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const raw = await res.json();
        const formatted: InverterPowerData[] = Array.isArray(raw)
          ? raw.map(mapRow)
          : [];

        if (isMounted) setData(formatted);
      } catch (err: any) {
        // Ignore abort errors; log others
        if (err?.name !== "AbortError") {
          console.error("Failed to fetch data for range:", err);
          if (isMounted) setData([]);
        }
      } finally {
        if (showSpinner && isMounted) setLoading(false);
      }
    };

    // Initial load with spinner
    fetchRangeData(true);

    // Silent background refreshes
    const intervalId = setInterval(
      () => fetchRangeData(false),
      REFRESH_INTERVAL_MS
    );

    return () => {
      isMounted = false;
      clearInterval(intervalId);
      controller.abort();
    };
  }, [range, apiBase]);

  return { data, loading };
}
