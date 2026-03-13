import type { RuleType } from "./types";

type Option = { key: string; label: string };

type Props = {
  allKey: string;
  inverterOptions: ReadonlyArray<Option>;
  buildingOptions: ReadonlyArray<Option>;
  weatherOptions: ReadonlyArray<Option>;
  selectedMetric: string;
  setSelectedMetric: (v: string) => void;
  ruleType: RuleType;
  setRuleType: (t: RuleType) => void;
  minVal: number;
  setMinVal: (n: number) => void;
  maxVal: number;
  setMaxVal: (n: number) => void;
  latestValue: string | number;
  /** NEW: repeat period minutes */
  repeatMins: number;
  setRepeatMins: (n: number) => void;
  onAdd: () => void;
};

export default function RuleForm({
  allKey,
  inverterOptions,
  buildingOptions,
  weatherOptions,
  selectedMetric,
  setSelectedMetric,
  ruleType,
  setRuleType,
  minVal,
  setMinVal,
  maxVal,
  setMaxVal,
  latestValue,
  repeatMins,
  setRepeatMins,
  onAdd,
}: Props) {
  const source =
    selectedMetric === allKey
      ? "mixed"
      : weatherOptions.some((m) => m.key === selectedMetric)
      ? "weather"
      : "inverter";

  return (
    <div className="bg-white border p-4 rounded shadow space-y-4">
      <h2 className="font-medium text-gray-700">Setup Notification Rule</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* metric */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-600">Metric</label>
          <select
            className="border px-2 py-1 rounded text-sm"
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value)}
          >
            <optgroup label="---- All ----">
              <option value={allKey}>All Metrics</option>
            </optgroup>
            <optgroup label="---- Inverter ----">
              {inverterOptions.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}
            </optgroup>
            <optgroup label="---- Building ----">
              {buildingOptions.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}
            </optgroup>
            <optgroup label="---- Weather Station ----">
              {weatherOptions.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}
            </optgroup>
          </select>
          <p className="text-[11px] text-gray-500">
            Data source: <span className="font-mono">{source}</span>
          </p>
        </div>

        {/* type */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-600">Rule Type</label>
          <div className="flex items-center gap-4">
            <label className="text-sm flex items-center gap-1">
              <input
                type="radio"
                name="ruleType"
                value="range"
                checked={ruleType === "range"}
                onChange={() => setRuleType("range")}
              />
              Outside range (min/max)
            </label>

            <label className="text-sm flex items-center gap-1">
              <input
                type="radio"
                name="ruleType"
                value="null"
                checked={ruleType === "null"}
                onChange={() => setRuleType("null")}
              />
              No Data (null)
            </label>
          </div>
        </div>

        {/* range fields */}
        {ruleType === "range" && (
          <>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-600">Min</label>
              <input
                type="number"
                className="border px-2 py-1 rounded text-sm"
                value={minVal}
                onChange={(e) => setMinVal(parseFloat(e.target.value))}
                placeholder="e.g. 0"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-600">Max</label>
              <input
                type="number"
                className="border px-2 py-1 rounded text-sm"
                value={maxVal}
                onChange={(e) => setMaxVal(parseFloat(e.target.value))}
                placeholder="e.g. 200"
              />
            </div>
            <div className="md:col-span-2">
              <p className="text-[11px] text-gray-500">
                Triggers when value is <strong>&lt; Min</strong> or{" "}
                <strong>&gt; Max</strong>. Bounds are inclusive (exact Min/Max
                do not trigger).
              </p>
            </div>
          </>
        )}

        {/* repeat period */}
        <div className="flex flex-col gap-1 md:col-span-2">
          <label className="text-xs text-gray-600">Repeat/Alarm Period</label>
          <div className="flex items-center gap-2">
            <select
              className="border px-2 py-1 rounded text-sm"
              value={repeatMins}
              onChange={(e) => setRepeatMins(parseInt(e.target.value, 10))}
            >
              <option value={5}>Every 5 minutes</option>
              <option value={15}>Every 15 minutes</option>
              <option value={30}>Every 30 minutes</option>
              <option value={60}>Every 1 hour</option>
              <option value={180}>Every 3 hours</option>
              <option value={720}>Every 12 hours</option>
            </select>
            <span className="text-[11px] text-gray-500">
              While the condition persists, re-alert at this interval.
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          className="text-sm px-4 py-1.5 bg-blue-600 text-white rounded"
          onClick={onAdd}
        >
          Add Rule
        </button>
        <span className="text-xs text-gray-600">
          Latest value: <em>{latestValue}</em>
        </span>
      </div>
    </div>
  );
}
