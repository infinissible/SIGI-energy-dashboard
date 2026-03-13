import React from "react";

// ---------------------- Types ----------------------
type TrailerStatus = "Disconnected" | "Ok" | "Error";

type TrailerSnapshot = {
  id: string;
  title: string;
  location: string;
  meterType: string | null;
  status: TrailerStatus;
  watts3PhTotal?: number | null;
  whNet?: number | null;
  whTotal?: number | null;
};

// ---------------------- Helpers ----------------------
function StatusPill({ status }: { status: TrailerStatus }) {
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
}: {
  value: number | null | undefined;
  unit: string;
  digits?: number;
}) {
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
function TrailerCard(trailer: TrailerSnapshot) {
  return (
    <section className="w-full max-w-[320px] bg-white border border-gray-200 rounded-2xl shadow-sm p-4 space-y-3">
      <h2 className="text-xl font-semibold text-blue-700">{trailer.title}</h2>

      <div className="border-t border-gray-200 pt-2 space-y-1">
        <MetaRow label="Location" value={trailer.location} />
        <MetaRow
          label="Device Type"
          value={trailer.meterType || "N/A"}
          valueClass="text-blue-700 underline"
        />
        <MetaRow
          label="Status"
          value={<StatusPill status={trailer.status} />}
        />
      </div>

      <div className="border-t border-gray-200 pt-2 space-y-1">
        <MetaRow
          label="Watts, 3-Ph Total"
          value={<DigitalValue value={trailer.watts3PhTotal} unit="kW" />}
        />
        <MetaRow
          label="Whour Net"
          value={<DigitalValue value={trailer.whNet} unit="kWh" />}
        />
        <MetaRow
          label="Whour Total"
          value={<DigitalValue value={trailer.whTotal} unit="kWh" />}
        />
      </div>
    </section>
  );
}

// ---------------------- Page ----------------------
export default function Trailers() {
  const trailers: TrailerSnapshot[] = [
    {
      id: "Trailer_1",
      title: "Trailer 1",
      location: "N/A",
      meterType: null,
      status: "Disconnected",
      watts3PhTotal: null,
      whNet: null,
      whTotal: null,
    },
    {
      id: "Trailer_2",
      title: "Trailer 2",
      location: "N/A",
      meterType: null,
      status: "Disconnected",
      watts3PhTotal: null,
      whNet: null,
      whTotal: null,
    },
  ];

  return (
    <main className="w-full max-w-5xl mx-auto px-2 sm:px-4 md:px-6">
      {/* Header */}
      <section className="mb-4 bg-white border border-gray-200 rounded-xl p-4">
        <h1 className="text-3xl text-left font-semibold pb-2 border-b border-gray-200">
          Trailers
        </h1>
        <ul className="mt-2 text-[13px] leading-tight space-y-1.5 text-gray-800">
          <li className="flex items-baseline gap-1.5 whitespace-nowrap">
            <span className="text-gray-600 ">Total Number of Trailers:</span>
            <span className="font-medium">2</span>
          </li>
        </ul>
      </section>
      {/* Cards */}
      <div className="w-full flex justify-center">
        <div
          className="grid grid-cols-1 sm:grid-cols-2 gap-4"
          style={{ width: "656px" }}
        >
          {trailers.map((t) => (
            <TrailerCard key={t.id} {...t} />
          ))}
        </div>
      </div>
    </main>
  );
}
