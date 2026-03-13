// MonthlyMetrics.tsx
import React, { useState, useMemo, useEffect } from "react";
import { Info } from "lucide-react";
import * as Tooltip from "@radix-ui/react-tooltip";
import useDailySummary from "../../hooks/useDailySummary";
import useSiteMonthlySavings from "../../hooks/useSiteMonthlySavings";

const monthLabels: Record<string, string> = {
  "01": "January",
  "02": "February",
  "03": "March",
  "04": "April",
  "05": "May",
  "06": "June",
  "07": "July",
  "08": "August",
  "09": "September",
  "10": "October",
  "11": "November",
  "12": "December",
};

function extractMonthYearKey(label: string): string {
  const d = new Date(label); // e.g., "Jul 31, 2025"
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${month}-${year}`; // "07-2025"
}

function getMonthLabel(monthYear: string): string {
  const [month, year] = monthYear.split("-");
  return `${monthLabels[month]} ${year}`;
}

export default function MonthlyMetrics() {
  // Daily rollups (for energy totals + fallback estimated savings)
  const { data, loading } = useDailySummary("7days", { days: 365 });

  // Billing savings (site total) keyed by "MM-YYYY"
  const { data: billingSavingsByMonth } = useSiteMonthlySavings({
    startMonth: "2025-11", // billing savings available starting Nov 2025
    limit: 240,
  });

  const availableMonths = useMemo(() => {
    const keys = Array.from(
      new Set(data.map((d) => extractMonthYearKey(d.date)))
    );
    return keys.sort((a, b) => {
      const [ma, ya] = a.split("-").map(Number);
      const [mb, yb] = b.split("-").map(Number);
      return ya === yb ? ma - mb : ya - yb;
    });
  }, [data]);

  const [selectedMonth, setSelectedMonth] = useState<string>("");

  useEffect(() => {
    if (!selectedMonth && availableMonths.length > 0) {
      const nowKey = extractMonthYearKey(new Date().toISOString());
      const defaultMonth = availableMonths.includes(nowKey)
        ? nowKey
        : availableMonths[availableMonths.length - 1];
      setSelectedMonth(defaultMonth);
    }
  }, [availableMonths, selectedMonth]);

  const monthlySummary = useMemo(() => {
    const filtered = data.filter(
      (entry) => extractMonthYearKey(entry.date) === selectedMonth
    );
    return filtered.reduce(
      (acc, day) => {
        acc.generated += day.generated || 0;
        acc.consumed += day.consumed || 0;
        acc.exported += day.exported || 0;
        acc.savings += day.savings || 0;
        return acc;
      },
      { generated: 0, consumed: 0, exported: 0, savings: 0 }
    );
  }, [data, selectedMonth]);

  // Prefer billing savings when available; otherwise fallback to estimated savings
  const billingSavings = selectedMonth
    ? billingSavingsByMonth[selectedMonth]
    : undefined;
  const hasBillingSavings = typeof billingSavings === "number";

  const summaryData = [
    {
      label: "Energy Consumed",
      value: (monthlySummary.consumed / 1000).toFixed(2) + " MWh",
      tooltip: "Total building energy consumed in selected month.",
    },
    {
      label: "PV Generated",
      value: (monthlySummary.generated / 1000).toFixed(2) + " MWh",
      tooltip: "Total solar PV generation during selected month.",
    },
    {
      label: "Energy Exported",
      value: (monthlySummary.exported / 1000).toFixed(2) + " MWh",
      tooltip: "Energy exported to grid over the month.",
    },
    {
      label: hasBillingSavings ? "Billing Savings" : "Estimated Savings",
      value: hasBillingSavings
        ? `$${billingSavings!.toFixed(2)}`
        : `$${monthlySummary.savings.toFixed(2)}`,
      tooltip: hasBillingSavings
        ? "Monthly savings computed from billing logic and stored in MySQL. (Available starting Nov 2025.)"
        : "Estimated value based on generated and exported energy using fixed rate assumptions.",
    },
  ];

  if (loading)
    return <div className="text-center text-sm text-gray-500">Loading...</div>;
  if (availableMonths.length === 0)
    return (
      <div className="text-center text-sm text-gray-500">
        No data available.
      </div>
    );

  return (
    <div className="bg-white rounded-lg shadow-md py-3 px-2 border border-gray-200">
      <div className="flex justify-center items-center mb-2 px-2">
        <div className="flex items-center justify-center gap-1 mx-auto">
          <span className="text-sm font-semibold text-gray-700">
            CE-CERT Monthly Metrics
          </span>

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
                  Monthly totals include energy consumed, PV generation,
                  exported energy, and savings. Billing savings appear when
                  available (Nov 2025 onward); otherwise the value is an
                  estimate.
                  <Tooltip.Arrow className="fill-gray-800" />
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          </Tooltip.Provider>
        </div>

        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="border border-gray-300 rounded px-2 py-1 text-sm ml-0"
        >
          {availableMonths.map((m) => (
            <option key={m} value={m}>
              {getMonthLabel(m)}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm text-gray-800">
        {summaryData.map((item, index) => (
          <div key={index} className="flex flex-col items-center text-center">
            <span className="text-sm text-gray-500">{item.label}</span>
            <span className="text-base font-semibold">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
