// pages/AnalyticsTable.tsx
import React from "react";

type Series = { key: string; name: string };

type Props = {
  data: any[];
  tableSeries: Series[];
  totalsMW: Partial<Record<string, number>>;
  isLoading: boolean;
};

export default function AnalyticsTable({
  data,
  tableSeries,
  totalsMW,
  isLoading,
}: Props) {
  if (isLoading) {
    return (
      <div className="p-6">
        <div className="h-6 w-6 rounded-full border-2 border-gray-300 border-t-gray-700 animate-spin mx-auto" />
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-gray-200 rounded-lg max-h-[260px] overflow-y-auto relative">
      <table className="min-w-full table-fixed text-xs text-gray-700">
        <thead className="bg-gray-50 sticky top-0 z-10">
          <tr>
            <th className="px-2 py-1.5 text-center font-semibold">Timestamp</th>
            {tableSeries.map((s) => (
              <th key={s.key} className="px-2 py-1.5 text-center font-semibold">
                {s.name} (kW)
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {(data ?? []).map((row: any, idx: number) => (
            <tr
              key={`${row.time}-${idx}`}
              className={`border-t ${
                idx % 2 === 0 ? "bg-white" : "bg-gray-50"
              } hover:bg-gray-100`}
            >
              <td className="px-4 py-1 text-center whitespace-nowrap">
                {row.dateStr}
              </td>
              {tableSeries.map((s) => (
                <td key={s.key} className="px-4 py-1 text-center">
                  {row[s.key] == null ? "—" : Number(row[s.key]).toFixed(2)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>

        <tfoot>
          <tr className="sticky bottom-0 z-10 bg-gray-100 border-t">
            <th className="px-2 py-2 text-center font-semibold">Total</th>
            {tableSeries.map((s) => (
              <th key={s.key} className="px-2 py-2 text-center font-semibold">
                {typeof totalsMW[s.key] === "number"
                  ? totalsMW[s.key]!.toFixed(2)
                  : "—"}{" "}
                MW
              </th>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
