import React from "react";
import useLivePVData from "@/hooks/useLivePVData";
import { Info } from "lucide-react";
import * as Tooltip from "@radix-ui/react-tooltip";

export default function EVChargers() {
  const { loading, evL3KW } = useLivePVData();

  const breakdown = [
    {
      label: "Level 3",
      status: !loading && (
        <span
          className={`ml-1 text-base ${
            Number(evL3KW) > 1.0
              ? " text-green-600 font-digital"
              : " text-yellow-600 font-digital"
          }`}
        >
          {Number(evL3KW) > 1.0 ? "Charging" : "Idle"}
        </span>
      ),
      value: loading ? (
        <span className="inline-block h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
      ) : (
        <>
          <span className="font-digital">{Number(evL3KW || 0).toFixed(2)}</span>
          <span className="ml-1 text-sm font-normal text-gray-600">kW</span>
        </>
      ),
    },
    {
      label: "Level 2",
      status: null,
      value: loading ? (
        <span className="inline-block h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
      ) : (
        <>
          <span className="font-digital">--</span>
          <span className="ml-1 text-sm font-normal text-gray-600">kW</span>
        </>
      ),
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow-md p-2 h-full border border-gray-200">
      <div className="flex items-center justify-center mb-2 space-x-1">
        <h3 className="text-sm font-semibold text-gray-700 text-center">
          EV Charger
        </h3>
        <Tooltip.Provider delayDuration={150}>
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <span className="cursor-pointer text-gray-400">
                <Info size={14} />
              </span>
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content
                className="bg-gray-800 text-white text-sm p-2 rounded shadow-md z-50 whitespace-pre-line max-w-xs"
                side="top"
                sideOffset={4}
              >
                {`• Only Level 3 charger is metered
                  • Displays “Charging” when power > 1.00 kW
                  • Displays “Idle” when power ≤ 1.00 kW`}
                <Tooltip.Arrow className="fill-gray-800" />
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>
        </Tooltip.Provider>
      </div>

      <div className=" text-sm mt-2 text-gray-600">
        {breakdown.map(({ label, status, value }, idx) => (
          <div key={idx} className="flex justify-between items-center">
            <div className="flex items-center space-x-1">
              <span className="text-sm text-gray-600">{label}:</span>
              {status}
            </div>
            <span className="text-lg text-gray-800">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
