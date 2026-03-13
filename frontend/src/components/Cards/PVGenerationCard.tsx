import { Info } from "lucide-react";
import * as Tooltip from "@radix-ui/react-tooltip";
// import { Link } from "react-router-dom";

type InverterOutput = {
  name: string;
  value: string;
};

type PVGenerationCardProps = {
  currentPower: string;
  inverters: InverterOutput[];
  loading?: boolean;
  pvEnergyToday?: string; // e.g., "12.34"
  utilizationPercent?: string; // e.g., "2.5%"
  systemStatus?: string; // e.g., "Daytime" / "Nighttime"
};

export default function PVGenerationCard({
  currentPower,
  inverters,
  loading,
  pvEnergyToday = "--",
  utilizationPercent = "--",
  systemStatus = "--",
}: PVGenerationCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-4 h-full border border-gray-200">
      <h3 className="text-[16px] font-semibold text-gray-700 mb-4 text-center flex items-center justify-center gap-1">
        Total PV Generation (AC)
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
                {`Total PV Output = Inverter A + B + C real-time power readings                 
                  `}
                <Tooltip.Arrow className="fill-gray-800" />
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>
        </Tooltip.Provider>
      </h3>

      {/* Current Output */}
      <div className="text-center mb-4 relative">
        <div className="relative inline-block">
          <span className="font-digital text-4xl text-blue-900 relative z-10">
            {loading ? (
              <span className="inline-block h-5 w-5 border-4 border-blue-300 border-t-transparent rounded-full animate-spin" />
            ) : (
              currentPower
            )}
          </span>
          <span className="text-xl font-medium ml-1 text-gray-700">kW</span>
          <div
            className="absolute left-1/2 transform -translate-x-1/2"
            style={{
              bottom: "-1px",
              width: "80%",
              height: "6px",
              backgroundColor: "rgba(71,85,105,0.15)",
              borderRadius: "50%",
            }}
          />
        </div>
        <p className="text-sm text-gray-800 mt-2">/ 450 kW (Max)</p>
      </div>

      {/* Inverter Breakdown */}
      <div className="border-t border-b py-1">
        <div className="text-sm text-gray-600 mb-2 text-center flex items-center justify-center gap-1">
          Inverter Output
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
                  {`Each inverter is metered via a SharkMeter100                 
                  `}
                  <Tooltip.Arrow className="fill-gray-800" />
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          </Tooltip.Provider>
        </div>
        {inverters.map(({ name, value }, idx) => (
          <div key={idx} className="flex justify-between items-center">
            <span className="text-sm text-gray-600">{name}:</span>
            <span className="text-lg text-gray-800">
              {loading ? (
                <span className="inline-block h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span className="font-digital">{value}</span>
                  <span className="ml-1 text-sm font-normal text-gray-600">
                    kW
                  </span>
                </>
              )}
            </span>
          </div>
        ))}
      </div>

      {/* PV Summary Info */}
      <div className="border-b py-1">
        <div className="text-sm text-gray-600 mb-2 text-center flex items-center justify-center gap-1">
          PV Summary
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
                  {`• Current / Max Utilization = Current PV generation ÷ Max AC capacity
                  • PV Generation Today = Sum of energy generated by all inverters today
                  • System Status:
                    – Generating if output ≥ 0.5 kW
                    – Idle if output < 0.5 kW
                  `}
                  <Tooltip.Arrow className="fill-gray-800" />
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          </Tooltip.Provider>
        </div>
        {[
          {
            label: "Current/Max Utilization",
            value: utilizationPercent,
            unit: "",
          },
          {
            label: "PV Generation Today",
            value: pvEnergyToday,
            unit: "kWh",
          },
          {
            label: "System Status",
            value: systemStatus,
            unit: "",
            isStatus: true, // custom flag to indicate conditional styling
          },
        ].map(({ label, value, unit }, idx) => (
          <div key={idx} className="flex justify-between items-center">
            <span className="text-sm text-gray-600">{label}:</span>
            <span
              className={`text-lg ${
                label === "System Status"
                  ? value === "Generating"
                    ? "text-green-600"
                    : "text-yellow-600"
                  : "text-gray-800"
              }`}
            >
              {loading ? (
                <span className="inline-block h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span className="font-digital">{value}</span>
                  {unit && (
                    <span className="ml-1 text-sm font-normal text-gray-600">
                      {unit}
                    </span>
                  )}
                </>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
