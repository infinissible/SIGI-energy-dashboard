import { Info } from "lucide-react";
import * as Tooltip from "@radix-ui/react-tooltip";

type BuildingId = "1084" | "1086" | "1200";

type BuildingCardProps = {
  buildingLabel: string;
  pvSourceLabel?: string;
  currentLoad: string; // kW
  pvGeneration: string; // kW (e.g., Inverter C)
  netFlow: string; // kW (Export)
  todayLoad: string; // kWh
  todayPV: string; // kWh
  todayExport: string; // kWh
  solarPercent: string; // %
  loading?: boolean;

  // NEW: controlled building selector
  selectedBuilding: BuildingId;
  onSelectBuilding: (id: BuildingId) => void;
};

export default function BuildingCard({
  buildingLabel,
  pvSourceLabel,
  currentLoad,
  pvGeneration,
  netFlow,
  todayLoad,
  todayPV,
  todayExport,
  solarPercent,
  loading = false,
  selectedBuilding,
  onSelectBuilding,
}: BuildingCardProps) {
  const numericLoad = parseFloat(currentLoad);
  const numericPV = parseFloat(pvGeneration);

  const liveSolarPercent =
    !loading && numericLoad > 0
      ? `${Math.max(
          0,
          Math.min(100, (Math.min(numericPV, numericLoad) / numericLoad) * 100)
        ).toFixed(1)}%`
      : "0.0%";

  return (
    <div className="bg-white rounded-lg shadow-md p-4 h-full border border-gray-200">
      {/* Title with tooltip */}
      <h3 className="text-[16px] font-semibold text-gray-700 mb-2 text-center flex items-center justify-center gap-1">
        {buildingLabel}
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
                {`This section shows live power and daily energy for the selected building.
                  `}
                <Tooltip.Arrow className="fill-gray-800" />
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>
        </Tooltip.Provider>
      </h3>

      {/* Building selector buttons */}
      <div className="flex justify-center space-x-1 mb-4">
        {(["1084", "1086", "1200"] as BuildingId[]).map((bld) => {
          const isActive = selectedBuilding === bld;
          return (
            <button
              key={bld}
              onClick={() => onSelectBuilding(bld)}
              className={`px-2 py-[2px] text-xs rounded border transition
                ${
                  isActive
                    ? "bg-gray-800 text-white border-gray-700"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                }`}
            >
              [{bld}]
            </button>
          );
        })}
      </div>

      {/* Demand Now Section */}
      <div className="border-t border-b py-1 ">
        <div className="text-sm text-gray-600  mb-2 flex items-center justify-center gap-1">
          Demand Now
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
                  {`• PV to Building = Real-time power supplied by Inverter C (PV system)
                    • Building Load = PV to Building + Import from Grid (if any)
                    • Net Flow = Real-time power sent to (+) or drawn from (–) the grid
                    • Solar Contribution = min(PV to Building, Load) ÷ Load (%)
              `}
                  <Tooltip.Arrow className="fill-gray-800" />
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          </Tooltip.Provider>
        </div>

        {[
          {
            label: `PV (${pvSourceLabel}) to Building`,
            value: pvGeneration,
            unit: "kW",
          },
          { label: "Building Load", value: currentLoad, unit: "kW" },

          { label: "Net Flow", value: netFlow, unit: "kW" },
        ].map(({ label, value, unit }, idx) => {
          const isNetFlow = label === "Net Flow";
          const numeric = parseFloat(value);
          const isExport = isNetFlow && numeric < 0;
          const isImport = isNetFlow && numeric > 0;

          const dynamicLabel = isNetFlow
            ? `Net Flow (${isExport ? "Export" : isImport ? "Import" : ""})`
            : label;

          const valueClass = isNetFlow
            ? isExport
              ? "text-green-600"
              : isImport
              ? "text-red-600"
              : "text-gray-800"
            : "text-gray-800";

          return (
            <div key={idx} className="flex justify-between items-center">
              <span className="text-sm text-gray-600">{dynamicLabel}:</span>

              <span className={`text-lg ${valueClass}`}>
                {loading ? (
                  <span className="inline-block h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span className="font-digital">{value}</span>
                    <span className="ml-1 text-sm font-normal text-gray-600">
                      {unit}
                    </span>
                  </>
                )}
              </span>
            </div>
          );
        })}

        {/* Solar Now */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Solar Contribution</span>
          <span className="text-lg text-green-600">
            <span className="font-digital">{liveSolarPercent}</span>
          </span>
        </div>
      </div>

      {/* Energy Today Section */}
      <div className="border-b py-1">
        <div className="text-sm text-gray-700 mb-2 flex items-center justify-center gap-1">
          Energy Today
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
                  {`• PV Supplied = Total energy delivered by an inverter
                  • Energy Consumed = Inverter Energy Delivered + Admin Net Energy                     
                    - Based on Inverter C and Admin net meter readings  
                  • To Grid = Surplus energy exported from the building to the grid
                  • Solar Converage = (Energy Consumed ÷ PV Supplied) × 100 (% of PV used onsite)
                  `}
                  <Tooltip.Arrow className="fill-gray-800" />
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          </Tooltip.Provider>
        </div>
        {[
          { label: "PV Supplied", value: todayPV, unit: "kWh" },
          { label: "Energy Consumed", value: todayLoad, unit: "kWh" },

          {
            label: "To Grid",
            value: Math.abs(parseFloat(todayExport)).toFixed(2),
            unit: "kWh",
          },
        ].map(({ label, value, unit }, idx) => (
          <div key={idx} className="flex justify-between items-center">
            <span className="text-sm text-gray-600">{label}:</span>
            <span className="text-lg text-gray-800">
              {loading ? (
                <span className="inline-block h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span className="font-digital">{value}</span>
                  <span className="ml-1 text-sm font-normal text-gray-600">
                    {unit}
                  </span>
                </>
              )}
            </span>
          </div>
        ))}

        {/* Solar Today */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Solar Coverage</span>
          <span className="text-lg text-green-600">
            <span className="font-digital">{solarPercent}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
