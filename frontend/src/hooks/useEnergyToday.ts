// hooks/useEnergyToday.ts
import { useEffect, useState } from "react";

const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

type BuildingEnergy = {
  load_kwh: number; // Energy consumed
  pv_supplied_kwh: number; // PV supplied
  exported_kwh: number; // Exported (can be negative in raw data)
};

type EnergyData = {
  energy_load_kwh: number; // Admin consumption
  pv_supplied_kwh: number; // Admin PV supplied
  exported_kwh: number; // Admin export
  e_1084_delivered_kwh?: number;
  e_1086_delivered_kwh?: number;
  e_1200_delivered_kwh?: number;
  pv_energy_today_kwh?: number; // All inverters combined
  estimated_savings_usd?: number;

  // New: per-building breakdown
  admin: BuildingEnergy; // Building 1084 (Admin)
  b1086: BuildingEnergy; // Building 1086
  b1200: BuildingEnergy; // Building 1200
};

export default function useEnergyToday() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<EnergyData | null>(null);

  const apiBase = import.meta.env.VITE_API_BASE_PATH || "";

  const fetchData = async () => {
    try {
      const res = await fetch(`${apiBase}/backend/api/solar/sharks/energy`);
      const json = await res.json();

      // --- PV delivered today (per inverter) ---
      const pv1084 = Number(json.e_1084_delivered_kwh) || 0;
      const pv1086 = Number(json.e_1086_delivered_kwh) || 0;
      const pv1200 = Number(json.e_1200_delivered_kwh) || 0;

      // --- Admin building (1084) ---
      const adminTotalConsRaw = Number(json.admin_total_consumption_kwh);
      const adminNet = Number(json.e_admin_net_kwh) || 0;
      const adminLoad = !Number.isNaN(adminTotalConsRaw)
        ? adminTotalConsRaw
        : pv1084 + adminNet;

      const adminExported = Number(json.exported_kwh) || 0;

      // --- Building 1086 ---
      const b1086TotalConsRaw = Number(json.b1086_total_consumption_kwh);
      const b1086Net = Number(json.e_b1086_net_kwh) || 0;
      const b1086PV = Number(json.b1086_pv_supplied_kwh ?? pv1086) || 0;
      const b1086Load = !Number.isNaN(b1086TotalConsRaw)
        ? b1086TotalConsRaw
        : b1086PV + b1086Net;
      const b1086Exported = Number(json.b1086_exported_kwh) || 0;

      // --- Building 1200 ---
      const b1200TotalConsRaw = Number(json.b1200_total_consumption_kwh);
      const b1200Net = Number(json.e_b1200_net_kwh) || 0;
      const b1200PV = Number(json.b1200_pv_supplied_kwh ?? pv1200) || 0;
      const b1200Load = !Number.isNaN(b1200TotalConsRaw)
        ? b1200TotalConsRaw
        : b1200PV + b1200Net;
      const b1200Exported = Number(json.b1200_exported_kwh) || 0;

      // --- Totals (all inverters) ---
      const totalPV = pv1084 + pv1086 + pv1200;

      // --- Estimated savings (Admin only, same logic as before) ---
      const RETAIL_RATE = 0.25; // $/kWh
      const estimatedSavings = parseFloat(
        ((pv1084 - Math.abs(adminExported)) * RETAIL_RATE).toFixed(2),
      );

      // Backward-compatible admin summary:
      const adminLoadRounded = parseFloat(adminLoad.toFixed(2));

      setData({
        ...json,
        // original fields for Admin-only components
        energy_load_kwh: adminLoadRounded,
        pv_supplied_kwh: pv1084,
        exported_kwh: adminExported,
        pv_energy_today_kwh: parseFloat(totalPV.toFixed(2)),
        estimated_savings_usd: estimatedSavings,

        // new multi-building structure
        admin: {
          load_kwh: parseFloat(Math.max(0, adminLoad).toFixed(2)),
          pv_supplied_kwh: parseFloat(Math.max(0, pv1084).toFixed(2)),
          exported_kwh: parseFloat(adminExported.toFixed(2)), // keep signed, UI converts to abs
        },
        b1086: {
          load_kwh: parseFloat(Math.max(0, b1086Load).toFixed(2)),
          pv_supplied_kwh: parseFloat(Math.max(0, b1086PV).toFixed(2)),
          exported_kwh: parseFloat(b1086Exported.toFixed(2)), // keep signed
        },
        b1200: {
          load_kwh: parseFloat(Math.max(0, b1200Load).toFixed(2)),
          pv_supplied_kwh: parseFloat(Math.max(0, b1200PV).toFixed(2)),
          exported_kwh: parseFloat(b1200Exported.toFixed(2)), // keep signed
        },
      });
    } catch (err) {
      console.error("Failed to fetch today's energy:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(); // initial load
    const interval = setInterval(fetchData, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval); // cleanup
  }, [apiBase]);

  return { loading, data };
}
