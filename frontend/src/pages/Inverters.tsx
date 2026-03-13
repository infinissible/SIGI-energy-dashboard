import React from "react";
import useLivePVData from "@/hooks/useLivePVData";
import useEnergyLatest from "@/hooks/useEnergyLatest";

// ---------------------- Types ----------------------
type InverterStatus = "Ok" | "Disconnected" | "Error";

type InverterSnapshot = {
  id: "Inverter_A" | "Inverter_B" | "Inverter_C";
  title: string;

  // RS485 / meter info
  deviceAddress: number; // 1, 2, 3...
  meterType: string; // "Sharkmeter 100"

  // Inverter hardware
  inverterModel: string; // "AE 260TX" / "AE 100TX"
  inverterRatingKW: number; // 260 / 100

  // Array layout
  numberOfStrings: number;
  numberOfPanels: number;

  // Runtime
  status: InverterStatus;
  cached?: boolean;

  // Live power (kW)
  watts3PhTotal?: number | null;

  // Energy (kWh)
  whReceived?: number | null; // we'll display as kWh in the UI
  whDelivered?: number | null; // (keeping field names for minimal churn)
  whNet?: number | null;
  whTotal?: number | null;
};

// ---------------------- Static system info (header) ----------------------
const PV_PANEL_MODEL = "Talesun TP660P-240W";
const PV_PANELS_TOTAL = 2142;
const SYSTEM_RATINGS = {
  stcDCkW: 514.08,
  cecDCkW: 463.1,
  cecACkW: 450.257,
};

// ---------------------- Fixed hardware specs (no status here) ----------------------
type FixedSpec = Pick<
  InverterSnapshot,
  | "id"
  | "title"
  | "deviceAddress"
  | "meterType"
  | "inverterModel"
  | "inverterRatingKW"
  | "numberOfStrings"
  | "numberOfPanels"
>;

const SPECS: Record<InverterSnapshot["id"], FixedSpec> = {
  Inverter_A: {
    id: "Inverter_A",
    title: "Inverter A",
    deviceAddress: 1,
    meterType: "Sharkmeter 100",
    inverterModel: "AE 260TX",
    inverterRatingKW: 180,
    numberOfStrings: 60,
    numberOfPanels: 840,
  },
  Inverter_B: {
    id: "Inverter_B",
    title: "Inverter B",
    deviceAddress: 2,
    meterType: "Sharkmeter 100",
    inverterModel: "AE 100TX",
    inverterRatingKW: 100,
    numberOfStrings: 33,
    numberOfPanels: 462,
  },
  Inverter_C: {
    id: "Inverter_C",
    title: "Inverter C",
    deviceAddress: 3,
    meterType: "Sharkmeter 100",
    inverterModel: "AE 100TX",
    inverterRatingKW: 180,
    numberOfStrings: 60,
    numberOfPanels: 840,
  },
};

// ---------------------- Helpers ----------------------
function fmt(value: number | null | undefined, unit = "", digits = 0) {
  if (value === null || value === undefined) return "—";
  const num = Number(value);
  const txt = num.toLocaleString(undefined, { maximumFractionDigits: digits });
  return unit ? `${txt} ${unit}` : txt;
}

function StatusPill({ status }: { status: InverterStatus }) {
  const color =
    status === "Ok"
      ? "text-green-700"
      : status === "Disconnected"
      ? "text-gray-700"
      : "text-red-700";
  return <span className={`${color} font-medium underline`}>{status}</span>;
}

// Row: label left, value right
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
      <div className="text-gray-600 text-left">{label}</div>
      <div className={`text-right font-medium ${valueClass}`}>{value}</div>
    </div>
  );
}

function InverterCard(inv: InverterSnapshot & { loading?: boolean }) {
  return (
    <section className="w-full max-w-[320px] bg-white border border-gray-200 rounded-2xl shadow-sm p-4 space-y-3">
      {/* Title */}
      <h2 className="text-xl font-semibold text-blue-700">{inv.title}</h2>

      {/* Device / comms */}
      <div className="border-t border-gray-200 pt-2 space-y-1">
        <MetaRow
          label="Device Address"
          value={`${inv.deviceAddress} on RS485 port`}
        />
        <MetaRow
          label="Device Type"
          value={inv.meterType}
          valueClass="text-blue-700 underline"
        />
        <MetaRow
          label="Status"
          value={
            <>
              <StatusPill status={inv.status} />
              {inv.cached && (
                <span className="text-gray-400 ml-1">(cached)</span>
              )}
            </>
          }
        />
      </div>

      {/* Hardware / array */}
      <div className="border-t border-gray-200 pt-2 space-y-1">
        <MetaRow label="Inverter Model" value={inv.inverterModel} />
        <MetaRow
          label="Inverter Rating"
          value={fmt(inv.inverterRatingKW, "kW")}
        />
        <MetaRow
          label="Number of Strings"
          value={inv.numberOfStrings.toLocaleString()}
        />
        <MetaRow
          label="Number of Panels"
          value={inv.numberOfPanels.toLocaleString()}
        />
      </div>

      {/* Measurements */}
      <div className="border-t border-gray-200 pt-2 space-y-1">
        {/* Real-time power (kW) */}
        <MetaRow
          label="Watts, 3-Ph Total"
          value={
            inv.loading ? (
              <span className="inline-block h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            ) : inv.watts3PhTotal == null ? (
              "—"
            ) : (
              <>
                <span className="font-digital text-[17px]">
                  {Number(inv.watts3PhTotal).toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })}
                </span>
                <span className="ml-1 text-sm font-normal text-gray-600">
                  kW
                </span>
              </>
            )
          }
        />

        {/* Energy rows — keep kWh; value only is digital */}
        <MetaRow
          label="Whour Received"
          value={
            inv.loading ? (
              <span className="inline-block h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            ) : inv.whReceived == null ? (
              "—"
            ) : (
              <>
                <span className="font-digital text-[17px]">
                  {Number(inv.whReceived).toFixed(2)}
                </span>
                <span className="ml-1 text-sm font-normal text-gray-600">
                  kWh
                </span>
              </>
            )
          }
        />
        <MetaRow
          label="Whour Delivered"
          value={
            inv.loading ? (
              <span className="inline-block h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            ) : inv.whDelivered == null ? (
              "—"
            ) : (
              <>
                <span className="font-digital text-[17px]">
                  {Number(inv.whDelivered).toFixed(2)}
                </span>
                <span className="ml-1 text-sm font-normal text-gray-600">
                  kWh
                </span>
              </>
            )
          }
        />
        <MetaRow
          label="Whour Net"
          value={
            inv.loading ? (
              <span className="inline-block h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            ) : inv.whNet == null ? (
              "—"
            ) : (
              <>
                <span className="font-digital text-[17px]">
                  {Number(inv.whNet).toFixed(2)}
                </span>
                <span className="ml-1 text-sm font-normal text-gray-600">
                  kWh
                </span>
              </>
            )
          }
        />
        <MetaRow
          label="Whour Total"
          value={
            inv.loading ? (
              <span className="inline-block h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            ) : inv.whTotal == null ? (
              "—"
            ) : (
              <>
                <span className="font-digital text-[17px]">
                  {Number(inv.whTotal).toFixed(2)}
                </span>
                <span className="ml-1 text-sm font-normal text-gray-600">
                  kWh
                </span>
              </>
            )
          }
        />
      </div>
    </section>
  );
}

export default function Inverters() {
  // live PV via websocket (kW)
  const { inverters: liveList, loading: liveLoading } = useLivePVData();

  // latest energy (kWh counters)
  const { loading: energyLoading, data: energy } = useEnergyLatest();

  // Build a small map from liveList for quick lookup (use inverters[].online)
  const liveMap: Record<
    string,
    { value: string; online?: boolean } | undefined
  > = {};
  for (const row of liveList) {
    if (row.name.startsWith("Inverter A"))
      liveMap.Inverter_A = { value: row.value, online: (row as any).online };
    if (row.name.startsWith("Inverter B"))
      liveMap.Inverter_B = { value: row.value, online: (row as any).online };
    if (row.name.startsWith("Inverter C"))
      liveMap.Inverter_C = { value: row.value, online: (row as any).online };
  }

  // helper to parse numeric or null (for card watts3PhTotal which expects number | null)
  const parseValue = (v?: string) => {
    if (!v || v === "—") return null;
    const n = parseFloat(String(v));
    return Number.isFinite(n) ? n : null;
  };

  const cards: InverterSnapshot[] = (
    [SPECS.Inverter_A, SPECS.Inverter_B, SPECS.Inverter_C] as const
  ).map((spec) => {
    const mapEntry =
      spec.id === "Inverter_A"
        ? liveMap.Inverter_A
        : spec.id === "Inverter_B"
        ? liveMap.Inverter_B
        : liveMap.Inverter_C;
    const kw = mapEntry ? parseValue(mapEntry.value) : null;
    const online = !!mapEntry?.online;

    const status: InverterStatus = online ? "Ok" : "Disconnected";

    const eg =
      spec.id === "Inverter_A"
        ? energy?.Inverter_A
        : spec.id === "Inverter_B"
        ? energy?.Inverter_B
        : energy?.Inverter_C;

    return {
      ...spec,
      status,
      watts3PhTotal: kw,
      whReceived: eg?.received_kwh ?? null,
      whDelivered: eg?.delivered_kwh ?? null,
      whNet: eg?.net_kwh ?? null,
      whTotal: eg?.total_kwh ?? null,
    };
  });

  const loading = liveLoading || energyLoading;

  return (
    <main className="w-full max-w-5xl mx-auto px-2 sm:px-4 md:px-6">
      {/* Header */}
      <section className="mb-4 bg-white border border-gray-200 rounded-xl p-3">
        <h1 className="text-3xl font-semibold text-left pb-2 border-b border-gray-200">
          Inverters
        </h1>
        <ul className="mt-2 text-[13px] leading-tight space-y-1.5 text-gray-800">
          <li className="flex items-baseline gap-1.5 whitespace-nowrap">
            <span className="text-gray-600">Panel Installation Type:</span>
            <span className="font-medium">Carport</span>
          </li>
          <li className="flex items-baseline gap-1.5 whitespace-nowrap">
            <span className="text-gray-600">PV Panel Model:</span>
            <span className="font-medium">{PV_PANEL_MODEL}</span>
          </li>
          <li className="flex items-baseline gap-1.5 whitespace-nowrap">
            <span className="text-gray-600">Total Number of Panels:</span>
            <span className="font-medium">
              {PV_PANELS_TOTAL.toLocaleString()}
            </span>
          </li>
          <li className="flex items-baseline gap-1.5 whitespace-nowrap">
            <span className="text-gray-600">
              California Energy Commission (CEC) Rating:
            </span>
            <span className="font-medium">
              {fmt(SYSTEM_RATINGS.cecDCkW, "kW")} DC,{" "}
              {fmt(SYSTEM_RATINGS.cecACkW, "kW")} AC
            </span>
          </li>
        </ul>
      </section>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 place-items-center">
        {cards.map((inv) => (
          <InverterCard key={inv.id} {...inv} loading={loading} />
        ))}
      </div>
    </main>
  );
}
