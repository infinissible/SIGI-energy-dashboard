import React from "react";
import { useMonthlySavings } from "@/hooks/useMonthlySavings";
import useSiteMonthlySavings from "@/hooks/useSiteMonthlySavings";

function fmtCurrency(v: number | null | undefined) {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(v);
}

function fmtSavingsCurrency(v: number | null | undefined) {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  const n = Math.max(0, Number(v));
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(n);
}

function fmtNumber(v: number | null | undefined, unit?: string) {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  const s = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(
    v,
  );
  return unit ? `${s} ${unit}` : s;
}

function formatMonthLabel(yyyyMm: string) {
  const [y, m] = yyyyMm.split("-").map(Number);
  if (!y || !m) return yyyyMm;
  const d = new Date(y, m - 1, 1);
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(d);
}

function formatMonthDropdown(yyyyMm: string) {
  const [y, m] = yyyyMm.split("-");
  if (!y || !m) return yyyyMm;
  return `${m}-${y}`;
}

function getSeasonFromMonth(yyyyMm: string) {
  const [yStr, mStr] = yyyyMm.split("-");
  const y = Number(yStr);
  const m = Number(mStr);
  if (!y || !m) return "—";

  const d = new Date(y, m - 1, 1);
  const summerStart = new Date(y, 5, 1); // Jun 1
  const summerEnd = new Date(y, 8, 30); // Sep 30
  return d >= summerStart && d <= summerEnd ? "Summer" : "Winter";
}

/**
 * SAM annual estimates from provided sheet (per building)
 * 1084: 55,048
 * 1086: 33,780
 * 1200: 20,193
 * Annual total = 109,021
 *
 * Historical base for 2015..2025 inclusive = 11 years
 */
const SAM_ANNUAL_TOTAL_ALL_BUILDINGS = 55048 + 33780 + 20193; // 109,021
const SAM_HISTORICAL_BASE_2015_TO_2025 = SAM_ANNUAL_TOTAL_ALL_BUILDINGS * 11; // 1,199,231

function TableCard({
  title,
  headers,
  rows,
}: {
  title?: string;
  headers: React.ReactNode[];
  rows: Array<Array<React.ReactNode>>;
  layout?: "two" | "three";
}) {
  return (
    <section className="mb-4">
      {title && (
        <h2 className="text-sm font-semibold text-gray-800 mb-2">{title}</h2>
      )}

      <div className="rounded-lg border border-gray-200 bg-white overflow-x-auto">
        <table className="w-auto table-fixed text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {headers.map((h, idx) => (
                <th
                  key={`${h}-${idx}`}
                  className={[
                    "px-3 py-2 text-left font-medium text-gray-700",
                    idx === 0 ? "pl-2" : "",
                  ].join(" ")}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b last:border-b-0 border-gray-100">
                {r.map((cell, j) => (
                  <td
                    key={j}
                    className={[
                      "px-3 py-2 text-gray-900 align-top text-left",
                      j === 0
                        ? "pl-2 font-medium break-words"
                        : "whitespace-nowrap",
                    ].join(" ")}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function Savings() {
  const {
    building,
    setBuilding,
    rows,
    selectedMonth,
    setSelectedMonth,
    selectedRow,
    loading,
    error,
    is1084Row,
    reload,
  } = useMonthlySavings({
    startMonth: "2025-11",
    defaultBuilding: 1084,
    limit: 120,
  });

  // Add actual monthly billing-based savings from Jan 2026 onward
  const { data: siteMonthly, loading: siteLoading } = useSiteMonthlySavings({
    startMonth: "2026-01",
    limit: 240,
  });

  const actualSavingsFrom2026 = Object.values(siteMonthly).reduce(
    (acc, v) => acc + (Number(v) || 0),
    0,
  );

  const totalSavingsSince2014 =
    SAM_HISTORICAL_BASE_2015_TO_2025 + actualSavingsFrom2026;

  const pvColLabel = (
    <span className="inline-block leading-tight">
      With PV
      <br />
      <span className="text-xs text-gray-500">(Actual)</span>
    </span>
  );

  const noPvColLabel = (
    <span className="inline-block leading-tight">
      Without PV
      <br />
      <span className="text-xs text-gray-500">(Estimated)</span>
    </span>
  );

  const inverterLabel =
    building === 1084
      ? "PV Generation (Inverter C)"
      : building === 1086
        ? "PV Generation (Inverter A)"
        : "PV Generation (Inverter B)";

  return (
    <main className="w-full max-w-5xl mx-auto px-2 sm:px-4 md:px-6">
      {/* Header */}
      <section className="mb-4 bg-white border border-gray-200 rounded-xl p-3 text-left">
        <h1 className="text-3xl font-semibold pb-2 border-b border-gray-200">
          Savings
        </h1>

        <p className="mt-3 text-sm text-gray-700 leading-relaxed">
          This page presents energy and cost savings derived from on-site solar
          production across the three monitored buildings:{" "}
          <span className="font-medium">
            Building 1084 (Demand Basis), Building 1086 (TOU Basis), and
            Building 1200 (TOU Basis)
          </span>
          .
        </p>

        <p className="mt-2 text-sm text-gray-700 leading-relaxed">
          Savings are calculated from meter data collected from the buildings
          (consumed kW and kWh) and from inverter meters (PV generation). The{" "}
          <span className="font-medium">Without Solar (Estimated)</span> values
          are derived from the meter data to estimate what usage would have been
          without PV, and savings are calculated from the difference.
        </p>

        <p className="mt-2 text-sm text-gray-700 leading-relaxed">
          <span className="font-semibold">
            Monthly calculations are performed for the full selected month (from
            the first day through the last day of the month). Actual utility
            bills use a different billing cycle date range.
          </span>{" "}
        </p>
      </section>

      {/* Controls */}
      <section className="mb-4 bg-white border border-gray-200 rounded-xl p-1 pl-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Left: Savings to Date (2 lines, larger, with breathing room) */}
          <div className="pl-1 sm:pl-2 pr-2 shrink-0">
            <div className="text-lg text-gray-900 font-bold">
              Savings to Date
            </div>
            <div className="text-lg sm:text-2xl font-bold text-gray-900 leading-tight">
              {siteLoading ? "—" : fmtCurrency(totalSavingsSince2014)}
            </div>
          </div>

          {/* Center: building buttons */}
          <div className="sm:flex-1 flex justify-center">
            <div className="flex flex-wrap gap-2 sm:flex-nowrap">
              {[1084, 1086, 1200].map((b) => {
                const active = building === b;
                return (
                  <button
                    key={b}
                    onClick={() => setBuilding(b as any)}
                    className={[
                      "px-3 py-2 rounded-lg text-sm border transition whitespace-nowrap",
                      active
                        ? "bg-gray-900 text-white border-gray-900"
                        : "bg-white text-gray-900 border-gray-200 hover:bg-gray-50",
                    ].join(" ")}
                  >
                    Building {b}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: month controls */}
          <div className="flex items-center gap-2 sm:justify-end shrink-0">
            <label className="text-sm text-gray-600 whitespace-nowrap">
              Month
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
              disabled={loading || rows.length === 0}
            >
              {rows.length === 0 ? (
                <option value="">No months</option>
              ) : (
                rows.map((r) => (
                  <option key={r.month} value={r.month}>
                    {formatMonthDropdown(r.month)}
                  </option>
                ))
              )}
            </select>

            <button
              onClick={reload}
              className="px-3 py-2 rounded-lg text-sm border border-gray-200 hover:bg-gray-50 whitespace-nowrap"
              disabled={loading}
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Status */}
        <div className="mt-3 text-sm">
          {loading && <div className="text-gray-500">Loading savings…</div>}
          {error && <div className="text-red-600">{error}</div>}
          {!loading && !error && rows.length === 0 && (
            <div className="text-gray-600">
              No savings data available (filtered from 2025-11).
            </div>
          )}
        </div>
      </section>

      {/* Selected month display */}
      <section className="bg-white border border-gray-200 rounded-xl p-3">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-xl font-semibold text-gray-900">
            {selectedMonth ? formatMonthLabel(selectedMonth) : "Select a month"}
          </h2>

          {building !== 1084 && selectedMonth && (
            <div className="text-sm text-gray-600">
              Season:{" "}
              <span className="font-medium text-gray-900">
                {getSeasonFromMonth(selectedMonth)}
              </span>
            </div>
          )}
        </div>

        {!selectedRow ? (
          <div className="text-gray-600 text-sm">
            Select a month to view savings.
          </div>
        ) : is1084Row(selectedRow) ? (
          <div className="flex flex-wrap justify-between items-start gap-3">
            {/* Monthly Savings */}
            <div className="w-auto shrink-0">
              <TableCard
                title="Monthly Savings"
                layout="two"
                headers={["Metric", "Value"]}
                rows={[
                  [
                    "Demand Savings",
                    fmtSavingsCurrency(
                      (selectedRow as any)["total_kw_savings_$"],
                    ),
                  ],
                  [
                    "Energy Savings",
                    fmtSavingsCurrency(
                      (selectedRow as any)["total_kwh_savings_$"],
                    ),
                  ],
                  [
                    "Network Savings",
                    fmtSavingsCurrency(
                      (selectedRow as any)["network_savings_$"],
                    ),
                  ],
                  [
                    "Total Savings",
                    fmtSavingsCurrency((selectedRow as any)["total_savings_$"]),
                  ],
                ]}
              />
            </div>

            {/* Building meters */}
            <div className="w-auto shrink-0">
              <TableCard
                title="Building 1084 Meters"
                layout="three"
                headers={["Meter / Basis", pvColLabel, noPvColLabel]}
                rows={[
                  [
                    "Total Demand (kW)",
                    fmtNumber((selectedRow as any).total_kw_w_pv, "kW"),
                    fmtNumber((selectedRow as any).total_kw_wo_pv, "kW"),
                  ],
                  [
                    "Total Energy (kWh)",
                    fmtNumber((selectedRow as any).total_kwh_w_pv, "kWh"),
                    fmtNumber((selectedRow as any).total_kwh_wo_pv, "kWh"),
                  ],
                  [
                    "Network Demand (kW)",
                    fmtNumber((selectedRow as any).network_w_pv, "kW"),
                    fmtNumber((selectedRow as any).network_wo_pv, "kW"),
                  ],
                ]}
              />
            </div>

            {/* Inverter */}
            <div className="w-auto shrink-0">
              <TableCard
                title={inverterLabel}
                layout="two"
                headers={["Metric", "Value"]}
                rows={[
                  [
                    "PV Generation",
                    fmtNumber((selectedRow as any).pv_net_kwh, "kWh"),
                  ],
                ]}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap justify-between items-start gap-3">
            {/* Monthly Savings */}
            <div className="w-auto shrink-0">
              <TableCard
                title="Monthly Savings"
                layout="two"
                headers={["Metric", "Value"]}
                rows={[
                  [
                    "Demand Savings",
                    fmtSavingsCurrency(
                      (selectedRow as any)["total_kw_savings_$"],
                    ),
                  ],
                  [
                    "Energy Savings",
                    fmtSavingsCurrency(
                      (selectedRow as any)["total_kwh_savings_$"],
                    ),
                  ],
                  [
                    "Network Savings",
                    fmtSavingsCurrency(
                      (selectedRow as any)["network_savings_$"],
                    ),
                  ],
                  [
                    "Total Savings",
                    fmtSavingsCurrency((selectedRow as any)["total_savings_$"]),
                  ],
                ]}
              />
            </div>

            {/* Building meters */}
            <div className="w-auto shrink-0">
              <TableCard
                title={`Building ${building} Meters`}
                layout="three"
                headers={["Meter / Basis", pvColLabel, noPvColLabel]}
                rows={[
                  [
                    "On-Peak Demand (kW)",
                    fmtNumber((selectedRow as any).on_kw_w_pv, "kW"),
                    fmtNumber((selectedRow as any).on_kw_wo_pv, "kW"),
                  ],
                  [
                    "Mid-Peak Demand (kW)",
                    fmtNumber((selectedRow as any).mid_kw_w_pv, "kW"),
                    fmtNumber((selectedRow as any).mid_kw_wo_pv, "kW"),
                  ],
                  [
                    "Off-Peak Demand (kW)",
                    fmtNumber((selectedRow as any).off_kw_w_pv, "kW"),
                    fmtNumber((selectedRow as any).off_kw_wo_pv, "kW"),
                  ],
                  [
                    "On-Peak Energy (kWh)",
                    fmtNumber((selectedRow as any).on_kwh_w_pv, "kWh"),
                    fmtNumber((selectedRow as any).on_kwh_wo_pv, "kWh"),
                  ],
                  [
                    "Mid-Peak Energy (kWh)",
                    fmtNumber((selectedRow as any).mid_kwh_w_pv, "kWh"),
                    fmtNumber((selectedRow as any).mid_kwh_wo_pv, "kWh"),
                  ],
                  [
                    "Off-Peak Energy (kWh)",
                    fmtNumber((selectedRow as any).off_kwh_w_pv, "kWh"),
                    fmtNumber((selectedRow as any).off_kwh_wo_pv, "kWh"),
                  ],
                  [
                    "Network Demand (kW)",
                    fmtNumber((selectedRow as any).network_w_pv, "kW"),
                    fmtNumber((selectedRow as any).network_wo_pv, "kW"),
                  ],
                ]}
              />
            </div>

            {/* Inverter */}
            <div className="w-auto shrink-0">
              <TableCard
                title={inverterLabel}
                layout="two"
                headers={["Metric", "Value"]}
                rows={[
                  [
                    "On-Peak PV Generation",
                    fmtNumber((selectedRow as any).on_pv_kwh, "kWh"),
                  ],
                  [
                    "Mid-Peak PV Generation",
                    fmtNumber((selectedRow as any).mid_pv_kwh, "kWh"),
                  ],
                  [
                    "Off-Peak PV Generation",
                    fmtNumber((selectedRow as any).off_pv_kwh, "kWh"),
                  ],
                ]}
              />
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
