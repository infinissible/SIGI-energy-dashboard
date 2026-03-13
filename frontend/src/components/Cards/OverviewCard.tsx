type BreakdownItem = {
  label: string;
  value: string | number;
};

type OverviewCardProps = {
  title: string;
  value?: string | number;
  breakdown?: BreakdownItem[];
};

export default function OverviewCard({
  title,
  value,
  breakdown,
}: OverviewCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-2 h-full border border-gray-200">
      <h3 className="text-sm font-semibold text-gray-700 mb-2 text-center">
        {title}
      </h3>

      {/* Single Value */}
      {value && (
        <p className="text-2xl font-bold text-sky-700 text-center">{value}</p>
      )}

      {/* Grouped Values */}
      {breakdown && (
        <div className="space-y-1 text-sm mt-2 text-gray-600">
          {breakdown.map((item, idx) => (
            <div key={idx} className="flex justify-between">
              <span>{item.label}:</span>
              <span className=" text-gray-800">{item.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
