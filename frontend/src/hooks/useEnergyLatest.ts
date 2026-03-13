// hooks/useEnergyLatest.ts
import { useEffect, useState } from "react";

const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

type LatestEnergyRow = {
  time: string; // ISO
  InverterA_1086_received: number | null;
  InverterA_1086_delivered: number | null;
  InverterA_1086_net: number | null;
  InverterA_1086_total: number | null;
  InverterB_1200_received: number | null;
  InverterB_1200_delivered: number | null;
  InverterB_1200_net: number | null;
  InverterB_1200_total: number | null;
  InverterC_1084_received: number | null;
  InverterC_1084_delivered: number | null;
  InverterC_1084_net: number | null;
  InverterC_1084_total: number | null;
  Admin_1084_received: number | null;
  Admin_1084_delivered: number | null;
  Admin_1084_net: number | null;
  Admin_1084_total: number | null;
  EV_L3_net: number | null;
  EV_L3_total: number | null;
  // NEW: building meters
  B1086_received: number | null;
  B1086_delivered: number | null;
  B1086_net: number | null;
  B1086_total: number | null;

  B1200_received: number | null;
  B1200_delivered: number | null;
  B1200_net: number | null;
  B1200_total: number | null;
};

export type EnergyLatestData = {
  time: string;
  Inverter_A: {
    received_kwh: number | null;
    delivered_kwh: number | null;
    net_kwh: number | null;
    total_kwh: number | null;
  };
  Inverter_B: {
    received_kwh: number | null;
    delivered_kwh: number | null;
    net_kwh: number | null;
    total_kwh: number | null;
  };
  Inverter_C: {
    received_kwh: number | null;
    delivered_kwh: number | null;
    net_kwh: number | null;
    total_kwh: number | null;
  };
  admin: {
    received_kwh: number | null;
    delivered_kwh: number | null;
    net_kwh: number | null;
    total_kwh: number | null;
  };
  // NEW: building meters, exposed cleanly
  building1086: {
    received_kwh: number | null;
    delivered_kwh: number | null;
    net_kwh: number | null;
    total_kwh: number | null;
  };
  building1200: {
    received_kwh: number | null;
    delivered_kwh: number | null;
    net_kwh: number | null;
    total_kwh: number | null;
  };
  evL3: { net_kwh: number | null; total_kwh: number | null };
  raw: LatestEnergyRow;
};

function n(x: any): number | null {
  const v = x == null ? null : Number(x);
  return Number.isFinite(v) ? v : null;
}

export default function useEnergyLatest() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<EnergyLatestData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const apiBase = import.meta.env.VITE_API_BASE_PATH || "";

  const fetchData = async () => {
    try {
      setError(null);
      const res = await fetch(
        `${apiBase}/backend/api/solar/sharks/energy/latest`
      );
      const json = await res.json();
      if (json?.error) {
        setError(json.error);
        setData(null);
        return;
      }

      const row: LatestEnergyRow = {
        time: json.time,
        InverterA_1086_received: n(json.InverterA_1086_received),
        InverterA_1086_delivered: n(json.InverterA_1086_delivered),
        InverterA_1086_net: n(json.InverterA_1086_net),
        InverterA_1086_total: n(json.InverterA_1086_total),

        InverterB_1200_received: n(json.InverterB_1200_received),
        InverterB_1200_delivered: n(json.InverterB_1200_delivered),
        InverterB_1200_net: n(json.InverterB_1200_net),
        InverterB_1200_total: n(json.InverterB_1200_total),

        InverterC_1084_received: n(json.InverterC_1084_received),
        InverterC_1084_delivered: n(json.InverterC_1084_delivered),
        InverterC_1084_net: n(json.InverterC_1084_net),
        InverterC_1084_total: n(json.InverterC_1084_total),

        Admin_1084_received: n(json.Admin_1084_received),
        Admin_1084_delivered: n(json.Admin_1084_delivered),
        Admin_1084_net: n(json.Admin_1084_net),
        Admin_1084_total: n(json.Admin_1084_total),

        EV_L3_net: n(json.EV_L3_net),
        EV_L3_total: n(json.EV_L3_total),

        B1086_received: n(json.B1086_received),
        B1086_delivered: n(json.B1086_delivered),
        B1086_net: n(json.B1086_net),
        B1086_total: n(json.B1086_total),

        B1200_received: n(json.B1200_received),
        B1200_delivered: n(json.B1200_delivered),
        B1200_net: n(json.B1200_net),
        B1200_total: n(json.B1200_total),
      };

      setData({
        time: row.time,
        Inverter_A: {
          received_kwh: row.InverterA_1086_received,
          delivered_kwh: row.InverterA_1086_delivered,
          net_kwh: row.InverterA_1086_net,
          total_kwh: row.InverterA_1086_total,
        },
        Inverter_B: {
          received_kwh: row.InverterB_1200_received,
          delivered_kwh: row.InverterB_1200_delivered,
          net_kwh: row.InverterB_1200_net,
          total_kwh: row.InverterB_1200_total,
        },
        Inverter_C: {
          received_kwh: row.InverterC_1084_received,
          delivered_kwh: row.InverterC_1084_delivered,
          net_kwh: row.InverterC_1084_net,
          total_kwh: row.InverterC_1084_total,
        },
        admin: {
          received_kwh: row.Admin_1084_received,
          delivered_kwh: row.Admin_1084_delivered,
          net_kwh: row.Admin_1084_net,
          total_kwh: row.Admin_1084_total,
        },
        building1086: {
          received_kwh: row.B1086_received,
          delivered_kwh: row.B1086_delivered,
          net_kwh: row.B1086_net,
          total_kwh: row.B1086_total,
        },
        building1200: {
          received_kwh: row.B1200_received,
          delivered_kwh: row.B1200_delivered,
          net_kwh: row.B1200_net,
          total_kwh: row.B1200_total,
        },
        evL3: { net_kwh: row.EV_L3_net, total_kwh: row.EV_L3_total },
        raw: row,
      });
    } catch (e) {
      console.error("Failed to fetch latest energy:", e);
      setError("Failed to fetch latest energy");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [apiBase]);

  return { loading, data, error, refresh: fetchData };
}
