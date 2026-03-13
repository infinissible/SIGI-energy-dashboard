import React from "react";
import useLivePVData from "@/hooks/useLivePVData";
import useEnergyLatest from "@/hooks/useEnergyLatest";

// ---------------------- Types ----------------------
type ChargerStatus = "Charging" | "Idle" | "Disconnected";

type ChargerSnapshot = {
  id: "EV_L3" | "EV_L2";
  title: string;
  chargerType: string; // Level 2 / Level 3
  deviceType: string;
  status: ChargerStatus;
  watts3PhTotal?: number | null;
  whNet?: number | null;
  whTotal?: number | null;
  loading?: boolean;
};

// ---------------------- Helpers ----------------------
function StatusPill({ status }: { status: ChargerStatus }) {
  const color =
    status === "Charging"
      ? "text-green-700"
      : status === "Idle"
      ? "text-gray-700"
      : "text-red-700";
  return <span className={`${color} font-medium underline`}>{status}</span>;
}

function MetaRow({
  label,
  value,
  valueClass = "",
}: {
  label: string;
  value: React.ReactNode;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between text-sm py-1">
      <div className="text-gray-600">{label}</div>
      <div className={`font-medium text-right ${valueClass}`}>{value}</div>
    </div>
  );
}

function DigitalValue({
  value,
  unit,
  digits = 2,
  loading = false,
}: {
  value: number | null | undefined;
  unit: string;
  digits?: number;
  loading?: boolean;
}) {
  if (loading)
    return (
      <span className="inline-block h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
    );

  if (value == null || isNaN(value)) return "—";

  return (
    <>
      <span className="font-digital text-[17px]">
        {Number(value).toFixed(digits)}
      </span>
      <span className="ml-1 text-sm font-normal text-gray-600">{unit}</span>
    </>
  );
}

// ---------------------- Card ----------------------
function ChargerCard(charger: ChargerSnapshot) {
  return (
    <section className="w-full max-w-[320px] bg-white border border-gray-200 rounded-2xl shadow-sm p-4 space-y-3">
      <h2 className="text-xl font-semibold text-blue-700">{charger.title}</h2>

      <div className="border-t border-gray-200 pt-2 space-y-1">
        <MetaRow label="Charger Type" value={charger.chargerType} />
        <MetaRow
          label="Device Type"
          value={charger.deviceType}
          valueClass="text-blue-700 underline"
        />
        <MetaRow
          label="Status"
          value={
            charger.loading ? (
              <span className="inline-block h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <span
                className={`ml-1 text-base font-digital ${
                  charger.status === "Charging"
                    ? "text-green-600"
                    : charger.status === "Idle"
                    ? "text-yellow-600"
                    : "text-red-600"
                }`}
              >
                {charger.status}
              </span>
            )
          }
        />
      </div>

      <div className="border-t border-gray-200 pt-2 space-y-1">
        <MetaRow
          label="Watts, 3-Ph Total"
          value={
            <DigitalValue
              value={charger.watts3PhTotal}
              unit="kW"
              loading={charger.loading}
            />
          }
        />
        <MetaRow
          label="Whour Net"
          value={
            <DigitalValue
              value={charger.whNet}
              unit="kWh"
              loading={charger.loading}
            />
          }
        />
        <MetaRow
          label="Whour Total"
          value={
            <DigitalValue
              value={charger.whTotal}
              unit="kWh"
              loading={charger.loading}
            />
          }
        />
      </div>
    </section>
  );
}

// ---------------------- Page ----------------------
export default function EVChargers() {
  const { evL3KW, loading: liveLoading } = useLivePVData();
  const { data: energy, loading: energyLoading } = useEnergyLatest();

  const loading = liveLoading || energyLoading;

  const evL3Value = parseFloat(evL3KW);
  const evL3Status: ChargerStatus =
    evL3KW == null ? "Disconnected" : evL3Value > 1.0 ? "Charging" : "Idle";

  const chargers: ChargerSnapshot[] = [
    {
      id: "EV_L3",
      title: "EV Charger - Level 3",
      chargerType: "Level 3",
      deviceType: "Sharkmeter MP200",
      status: evL3Status,
      watts3PhTotal: evL3Value,
      whNet: energy?.evL3?.net_kwh ?? null,
      whTotal: energy?.evL3?.total_kwh ?? null,
      loading,
    },
    {
      id: "EV_L2",
      title: "EV Charger - Level 2",
      chargerType: "Level 2",
      deviceType: "Sharkmeter MP200",
      status: "Disconnected",
      watts3PhTotal: null,
      whNet: null,
      whTotal: null,
      loading,
    },
  ];

  return (
    <main className="w-full max-w-5xl mx-auto px-2 sm:px-4 md:px-6">
      {/* Header */}
      <section className="mb-4 bg-white border border-gray-200 rounded-xl p-4">
        <h1 className="text-3xl text-left font-semibold pb-2 border-b border-gray-200">
          EV Chargers
        </h1>
        <ul className="mt-2 text-[13px] leading-tight space-y-1.5 text-gray-800">
          <li className="flex items-baseline gap-1.5 whitespace-nowrap">
            <span className="text-gray-600">Charger Types:</span>
            <span className="font-medium">Level 2 & Level 3</span>
          </li>
          <li className="flex items-baseline gap-1.5 whitespace-nowrap">
            <span className="text-gray-600">Level 3 Metering:</span>
            <span className="font-medium text-green-500">Active</span>
          </li>
          <li className="flex items-baseline gap-1.5 whitespace-nowrap">
            <span className="text-gray-600 ">Level 2 Metering:</span>
            <span className="font-medium text-red-500">Disconnected</span>
          </li>
        </ul>
      </section>

      <div className="w-full flex justify-center">
        <div
          className="grid grid-cols-1 sm:grid-cols-2 gap-4"
          style={{ width: "656px" }}
        >
          {chargers.map((c) => (
            <ChargerCard key={c.id} {...c} />
          ))}
        </div>
      </div>
    </main>
  );
}
