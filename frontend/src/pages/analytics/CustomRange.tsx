import React, { useEffect, useMemo, useState } from "react";
import { toYMD, parseYMD } from "@/hooks/useDemandKwRange";

type Props = {
  onApply: (start: string, end: string) => void;
  earliest?: string;
  latest?: string;
  initialStart?: string;
  initialEnd?: string;
  placeholder?: string;
};

export default function CustomRange({
  onApply,
  earliest,
  latest,
  initialStart,
  initialEnd,
  placeholder = "Select date range (max 7 days)…",
}: Props) {
  const today = new Date();

  const minDate = useMemo(
    () => (earliest ? parseYMD(earliest) : new Date(2024, 0, 1)),
    [earliest]
  );
  const maxDate = useMemo(() => (latest ? parseYMD(latest) : today), [latest]);

  const [startStr, setStartStr] = useState(
    initialStart ?? toYMD(new Date(today.getTime() - 24 * 3600 * 1000))
  );
  const [endStr, setEndStr] = useState(initialEnd ?? toYMD(today));

  // keep start within bounds
  useEffect(() => {
    const s = parseYMD(startStr);
    let fixed = s < minDate ? minDate : s > maxDate ? maxDate : s;
    const fixedStr = toYMD(fixed);
    if (fixedStr !== startStr) setStartStr(fixedStr);
  }, [minDate, maxDate]); // eslint-disable-line react-hooks/exhaustive-deps

  // clamp end to [start, start+6, maxDate]
  useEffect(() => {
    const s = parseYMD(startStr);
    const cap = new Date(s);
    cap.setDate(cap.getDate() + 6);
    const hardCap = cap < maxDate ? cap : maxDate;

    const e = parseYMD(endStr);
    const fixedEnd = e > hardCap ? hardCap : e < s ? s : e;
    const nextEndStr = toYMD(fixedEnd);
    if (nextEndStr !== endStr) setEndStr(nextEndStr);
  }, [startStr, maxDate]); // eslint-disable-line react-hooks/exhaustive-deps

  const label = `${startStr} → ${endStr}`;

  const computedEndCap = (() => {
    const s = parseYMD(startStr);
    const cap = new Date(s);
    cap.setDate(cap.getDate() + 6);
    return cap < maxDate ? cap : maxDate;
  })();

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-sm text-slate-600">{label || placeholder}</span>
      <input
        type="date"
        className="px-2 py-1 text-sm border rounded"
        value={startStr}
        min={toYMD(minDate)}
        max={toYMD(maxDate)}
        onChange={(e) => setStartStr(e.target.value)}
      />
      <span>→</span>
      <input
        type="date"
        className="px-2 py-1 text-sm border rounded"
        value={endStr}
        min={startStr}
        max={toYMD(computedEndCap)}
        onChange={(e) => {
          const v = e.target.value;
          setEndStr(v);
          onApply(startStr, v); // immediate fetch on end change
        }}
      />
      <span className="text-[11px] text-slate-500">
        Max 7 days inclusive from start.
      </span>
    </div>
  );
}
