import React from "react";
import useLivePVData from "@/hooks/useLivePVData";
import useEnergyLatest from "@/hooks/useEnergyLatest";

// ---------------------- Types ----------------------
type BuildingStatus = "Ok" | "Disconnected" | "Error";

type BuildingSnapshot = {
  id: "Building_1084" | "Building_1086" | "Building_1200";
  title: string;
  deviceAddress?: number;
  meterType: string | null;
  status: BuildingStatus;
  cached?: boolean;
  buildingWatts?: number | null;
  hvacWatts?: number | null;
  plugWatts?: number | null;
  whReceived?: number | null;
  whDelivered?: number | null;
  whNet?: number | null;
  whTotal?: number | null;
  loading?: boolean;
};

// ---------------------- Static specs ----------------------
const SPECS: Record<
  BuildingSnapshot["id"],
  Omit<
    BuildingSnapshot,
    | "status"
    | "cached"
    | "buildingWatts"
    | "hvacWatts"
    | "plugWatts"
    | "whReceived"
    | "whDelivered"
    | "whNet"
    | "whTotal"
    | "loading"
  >
> = {
  Building_1084: {
    id: "Building_1084",
    title: "Building 1084 (Admin)",
    deviceAddress: 1,
    meterType: "Sharkmeter MP200",
  },
  Building_1086: {
    id: "Building_1086",
    title: "Building 1086",
    deviceAddress: 1,
    meterType: "Sharkmeter 200S",
  },
  Building_1200: {
    id: "Building_1200",
    title: "Building 1200",
    deviceAddress: 1,
    meterType: "Sharkmeter 200S",
  },
};

// ---------------------- Helpers ----------------------
function StatusPill({ status }: { status: BuildingStatus }) {
  const color =
    status === "Ok"
      ? "text-green-700"
      : status === "Disconnected"
      ? "text-gray-700"
      : "text-red-700";
  return <span className={`${color} font-medium underline`}>{status}</span>;
}

function MetaRow({
  label,
  value,
  valueClass = "",
}: {
  label: React.ReactNode;
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
function BuildingCard(building: BuildingSnapshot) {
  const hasHvac = building.hvacWatts != null;
  const hasPlugs = building.plugWatts != null;

  const hvacRow = hasHvac ? (
    <MetaRow
      label="HVACs Watts, 3-Ph Total"
      value={
        <DigitalValue
          value={building.hvacWatts}
          unit="kW"
          loading={building.loading}
        />
      }
    />
  ) : (
    // invisible placeholder to preserve height
    <MetaRow
      label={<span className="opacity-0">HVAC placeholder</span>}
      value={<span className="opacity-0">0</span>}
    />
  );

  const plugRow = hasPlugs ? (
    <MetaRow
      label="Plug Loads Watts, 3-Ph Total"
      value={
        <DigitalValue
          value={building.plugWatts}
          unit="kW"
          loading={building.loading}
        />
      }
    />
  ) : (
    // invisible placeholder to preserve height
    <MetaRow
      label={<span className="opacity-0">Plug placeholder</span>}
      value={<span className="opacity-0">0</span>}
    />
  );

  return (
    <section className="w-full max-w-[320px] bg-white border border-gray-200 rounded-2xl shadow-sm p-4 space-y-3">
      <h2 className="text-xl font-semibold text-blue-700">{building.title}</h2>

      {/* Device / comms */}
      <div className="border-t border-gray-200 pt-2 space-y-1">
        <MetaRow
          label="Device Address"
          value={
            building.deviceAddress
              ? `${building.deviceAddress} on RS485 port`
              : "N/A"
          }
        />
        <MetaRow
          label="Device Type"
          value={building.meterType || "N/A"}
          valueClass="text-blue-700 underline"
        />
        <MetaRow
          label="Status"
          value={
            <>
              <StatusPill status={building.status} />
              {building.cached && (
                <span className="text-gray-400 ml-1">(cached)</span>
              )}
            </>
          }
        />
      </div>

      {/* Power readings */}
      <div className="border-t border-gray-200 pt-2 space-y-1">
        <MetaRow
          label="Building Watts, 3-Ph Total"
          value={
            <DigitalValue
              value={building.buildingWatts}
              unit="kW"
              loading={building.loading}
            />
          }
        />
        {hvacRow}
        {plugRow}
      </div>

      {/* Energy readings */}
      <div className="border-t border-gray-200 pt-2 space-y-1">
        <MetaRow
          label="Whour Received"
          value={
            <DigitalValue
              value={building.whReceived}
              unit="kWh"
              loading={building.loading}
            />
          }
        />
        <MetaRow
          label="Whour Delivered"
          value={
            <DigitalValue
              value={building.whDelivered}
              unit="kWh"
              loading={building.loading}
            />
          }
        />
        <MetaRow
          label="Whour Net"
          value={
            <DigitalValue
              value={building.whNet}
              unit="kWh"
              loading={building.loading}
            />
          }
        />
        <MetaRow
          label="Whour Total"
          value={
            <DigitalValue
              value={building.whTotal}
              unit="kWh"
              loading={building.loading}
            />
          }
        />
      </div>
    </section>
  );
}

// ---------------------- Page ----------------------
export default function Buildings() {
  const {
    netFlow,
    adminLoad,
    b1086Load,
    b1200Load,
    hvacKW,
    plugKW,
    loading: liveLoading,
  } = useLivePVData();
  const { loading: energyLoading, data: energy } = useEnergyLatest();
  const loading = liveLoading || energyLoading;

  const safeParse = (s: string | undefined): number | null => {
    if (s == null) return null;
    const v = Number(s);
    return Number.isFinite(v) ? v : null;
  };

  const adminBuildingWatts = safeParse(adminLoad);
  const b1086BuildingWatts = safeParse(b1086Load);
  const b1200BuildingWatts = safeParse(b1200Load);

  const buildings: BuildingSnapshot[] = [
    {
      ...SPECS.Building_1084,
      status: adminBuildingWatts != null ? "Ok" : "Disconnected",
      buildingWatts: adminBuildingWatts,
      hvacWatts: safeParse(hvacKW),
      plugWatts: safeParse(plugKW),
      whReceived: energy?.admin.received_kwh ?? null,
      whDelivered: energy?.admin.delivered_kwh ?? null,
      whNet: energy?.admin.net_kwh ?? null,
      whTotal: energy?.admin.total_kwh ?? null,
      loading,
    },
    {
      ...SPECS.Building_1086,
      status: b1086BuildingWatts != null ? "Ok" : "Disconnected",
      buildingWatts: b1086BuildingWatts,
      // no HVAC / plug meters for this building
      hvacWatts: null,
      plugWatts: null,
      whReceived: energy?.building1086.received_kwh ?? null,
      whDelivered: energy?.building1086.delivered_kwh ?? null,
      whNet: energy?.building1086.net_kwh ?? null,
      whTotal: energy?.building1086.total_kwh ?? null,
      loading,
    },
    {
      ...SPECS.Building_1200,
      status: b1200BuildingWatts != null ? "Ok" : "Disconnected",
      buildingWatts: b1200BuildingWatts,
      hvacWatts: null,
      plugWatts: null,
      whReceived: energy?.building1200.received_kwh ?? null,
      whDelivered: energy?.building1200.delivered_kwh ?? null,
      whNet: energy?.building1200.net_kwh ?? null,
      whTotal: energy?.building1200.total_kwh ?? null,
      loading,
    },
  ];

  return (
    <main className="w-full max-w-5xl mx-auto px-2 sm:px-4 md:px-6">
      {/* Header */}
      <section className="mb-4 bg-white border border-gray-200 rounded-xl p-3">
        <h1 className="text-3xl font-semibold text-left pb-2 border-b border-gray-200">
          Buildings
        </h1>
        <ul className="mt-2 text-[13px] leading-tight space-y-1.5 text-gray-800">
          <li className="flex items-baseline gap-1.5 whitespace-nowrap">
            <span className="text-gray-600">Site Type:</span>
            <span className="font-medium">Commercial</span>
          </li>
          <li className="flex items-baseline gap-1.5 whitespace-nowrap">
            <span className="text-gray-600">Meter Type:</span>
            <span className="font-medium">Sharkmeter MP200 / 200S</span>
          </li>
          <li className="flex items-baseline gap-1.5 whitespace-nowrap">
            <span className="text-gray-600">Total Number of Buildings:</span>
            <span className="font-medium">3</span>
          </li>
        </ul>
      </section>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 place-items-center">
        {buildings.map((b) => (
          <BuildingCard key={b.id} {...b} />
        ))}
      </div>
    </main>
  );
}
