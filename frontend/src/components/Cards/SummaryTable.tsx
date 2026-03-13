// components/SummaryTable.tsx
import useDailySummary from "../../hooks/useDailySummary";

type DailySummaryEntry = {
  date: string;
  generated: number;
  consumed: number;
  exported: number;
  savings: number;
};

export default function SummaryTable() {
  const { data, loading } = useDailySummary();

  if (loading) return <p className="text-sm text-gray-500">Loading table...</p>;

  // Calculate totals
  const totals = data.reduce(
    (acc, entry) => {
      acc.generated += entry.generated;
      acc.consumed += entry.consumed;
      acc.exported += entry.exported;
      acc.savings += entry.savings;
      return acc;
    },
    { generated: 0, consumed: 0, exported: 0, savings: 0 }
  );

  return (
    <div className="overflow-x-auto border border-gray-200 rounded-lg">
      <table className="min-w-full table-fixed text-xs text-gray-700">
        <thead className="bg-gray-50 sticky top-0 z-10 text-xs">
          <tr>
            <th className="w-1/5 px-2 py-1.5 text-center font-semibold">
              Date
            </th>
            <th className="w-1/5 px-2 py-1.5 text-center font-semibold">
              PV Generated (kWh)
            </th>
            <th className="w-1/5 px-2 py-1.5 text-center font-semibold">
              Consumed (kWh)
            </th>
            <th className="w-1/5 px-2 py-1.5 text-center font-semibold">
              Exported (kWh)
            </th>
            <th className="w-1/5 px-2 py-1.5 text-center font-semibold">
              Savings ($)
            </th>
          </tr>
        </thead>
      </table>

      {/* Scrollable body */}
      <div className="max-h-[200px] overflow-y-auto">
        <table className="min-w-full text-sm">
          <tbody className="text-xs">
            {data.map((entry: DailySummaryEntry, index: number) => (
              <tr
                key={entry.date}
                className={`border-t ${
                  index % 2 === 0 ? "bg-white" : "bg-gray-50"
                } hover:bg-gray-100`}
              >
                <td className="px-4 py-1 text-center">{entry.date}</td>
                <td className="px-4 py-1 text-center">
                  {entry.generated.toFixed(2)}
                </td>
                <td className="px-4 py-1 text-center">
                  {entry.consumed.toFixed(2)}
                </td>
                <td className="px-4 py-1 text-center">
                  {entry.exported.toFixed(2)}
                </td>
                <td className="px-4 py-1 text-center text-green-600 font-medium">
                  ${entry.savings.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals row */}
      <div className="border-t bg-gray-100">
        <table className="min-w-full text-sm">
          <tfoot className="text-xs bg-gray-100">
            <tr>
              <td className="px-4 py-1 text-center font-semibold">Total</td>
              <td className="px-4 py-1 text-center font-semibold">
                {totals.generated.toFixed(2)}
              </td>
              <td className="px-4 py-1 text-center font-semibold">
                {totals.consumed.toFixed(2)}
              </td>
              <td className="px-4 py-1 text-center font-semibold">
                {totals.exported.toFixed(2)}
              </td>
              <td className="px-4 py-1 text-center font-semibold text-green-700">
                ${totals.savings.toFixed(2)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
