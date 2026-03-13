import { Info } from "lucide-react";
import * as Tooltip from "@radix-ui/react-tooltip";
import useEnergyToday from "@/hooks/useEnergyToday";

export default function TodaysMetrics() {
  const { loading, data } = useEnergyToday();

  const admin = data?.admin;
  const b1086 = data?.b1086;
  const b1200 = data?.b1200;

  // Helper to sum safely
  const sumOrNull = (...vals: (number | undefined | null)[]) => {
    if (!vals.length) return null;
    const nums = vals.filter(
      (v): v is number => typeof v === "number" && !Number.isNaN(v)
    );
    if (!nums.length) return null;
    return nums.reduce((a, b) => a + b, 0);
  };

  // ---- Totals across all three buildings ----
  const totalLoadKwh =
    admin && b1086 && b1200
      ? sumOrNull(admin.load_kwh, b1086.load_kwh, b1200.load_kwh)
      : null;

  // Prefer pv_energy_today_kwh from backend, else sum building PV
  const totalPVKwh =
    data?.pv_energy_today_kwh ??
    (admin && b1086 && b1200
      ? sumOrNull(
          admin.pv_supplied_kwh,
          b1086.pv_supplied_kwh,
          b1200.pv_supplied_kwh
        )
      : null);

  const totalExportRaw =
    admin && b1086 && b1200
      ? sumOrNull(admin.exported_kwh, b1086.exported_kwh, b1200.exported_kwh)
      : null;

  const totalExportKwh =
    totalExportRaw != null ? Math.abs(totalExportRaw) : null;

  // Strings for display
  const buildingConsumption =
    totalLoadKwh != null ? `${totalLoadKwh.toFixed(2)} kWh` : "--";

  const pvGenerated =
    totalPVKwh != null ? `${totalPVKwh.toFixed(2)} kWh` : "--";

  const energyExported =
    totalExportKwh != null ? `${totalExportKwh.toFixed(2)} kWh` : "--";

  // Simple total-site savings
  const RETAIL_RATE = 0.25;

  const pvGeneratedTotal = totalPVKwh ?? 0;
  const pvExportedTotal = totalExportKwh ?? 0;

  const pvUsedOnsite = pvGeneratedTotal - pvExportedTotal; // kWh used locally

  const estimatedSavings =
    pvUsedOnsite > 0 ? `$${(pvUsedOnsite * RETAIL_RATE).toFixed(2)}` : "--";

  const summaryData = [
    {
      label: "Energy Consumed",
      value: buildingConsumption,
      tooltip: `Total building consumption for CE-CERT today.

    • Includes Building 1084 (Admin), 1086, and 1200
    • For each building:
      Load = PV delivered by its inverter + Net building energy from its Shark meter`,
    },
    {
      label: "PV Generated",
      value: pvGenerated,
      tooltip: `Total AC energy produced by all PV inverters today.

    • Inverter A → Building 1086
    • Inverter B → Building 1200
    • Inverter C → Building 1084 (Admin)
    • Value shown is the sum of A + B + C (converted to kWh)`,
    },
    {
      label: "Energy Exported",
      value: energyExported,
      tooltip: `Total surplus energy exported to the grid today.

    • Sum of exports from Buildings 1084 (Admin), 1086, and 1200
    • Negative values of Net Load represents kWh sent to the grid (export)`,
    },
    {
      label: "Estimated Savings",
      value: estimatedSavings,
      tooltip: `Estimated savings for the entire CE-CERT microgrid.

    Formula:
    • PV Used Onsite = (Total PV Generated − Total Export)
    • Savings = PV Used Onsite × $0.25 per kWh

    This method treats CE-CERT as a single energy system, regardless of building.`,
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow-md py-2 px-2 border border-gray-200">
      <div className="text-sm font-semibold text-gray-700 mb-2">
        CE-CERT Daily Metrics
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm text-gray-800">
        {summaryData.map((item, index) => (
          <div key={index} className="flex flex-col items-center text-center">
            <div className="flex items-center justify-center gap-1">
              <span className="text-sm text-gray-500">{item.label}</span>
              <Tooltip.Provider delayDuration={150}>
                <Tooltip.Root>
                  <Tooltip.Trigger asChild>
                    <span className="cursor-pointer text-gray-400">
                      <Info size={14} />
                    </span>
                  </Tooltip.Trigger>
                  <Tooltip.Portal>
                    <Tooltip.Content
                      className="bg-gray-800 text-white text-sm p-2 rounded shadow-md z-50 whitespace-pre-line"
                      side="top"
                      sideOffset={4}
                    >
                      {item.tooltip}
                      <Tooltip.Arrow className="fill-gray-800" />
                    </Tooltip.Content>
                  </Tooltip.Portal>
                </Tooltip.Root>
              </Tooltip.Provider>
            </div>
            <span className="text-base font-semibold">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
