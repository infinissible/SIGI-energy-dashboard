import React, { useEffect, useMemo, useState } from "react";
import useInverterPowerData from "@/hooks/useInverterPowerData";
import useWeatherData from "@/hooks/useWeatherData";
import RuleForm from "@/components/Notifications/RuleForm";
import RulesList from "@/components/Notifications/RulesList";
import type { Rule, RuleType } from "@/components/Notifications/types";

type Log = {
  timestamp: string;
  metric: string;
  value: number | null | undefined;
  message: string;
};

type AlarmEntry = { violating: boolean; lastAlarmMs: number };
type AlarmState = Record<string, AlarmEntry>;

/* --------------- Constants -------------- */
const ALL_KEY = "__ALL__" as const;
const ALARM_PERIOD_DEFAULT_MIN = 60; // 1 hour
const ALARM_STATE_KEY = "notification_alarm_state";

// Labels match your charts
const METRIC_GROUPS = {
  inverter: [
    { key: "total_power", label: "Total PV Gen" },
    { key: "pv_1086", label: "Inverter A" },
    { key: "pv_1200", label: "Inverter B" },
    { key: "pv_1084", label: "Inverter C" },
  ],
  building: [
    { key: "ev_l3", label: "EV Load (L3)" },
    { key: "net_admin", label: "Admin Net Load" },
    { key: "admin_hvac", label: "Admin HVACs" },
    { key: "admin_plugs", label: "Admin Plug Loads" },
  ],
  weather: [
    { key: "ambient_temp_c", label: "Ambient Temp" },
    { key: "cell_temp_c", label: "Cell Temp" },
    { key: "ghr_wm2", label: "Global Horizontal Radiation" },
    { key: "irradiance_wm2", label: "Irradiance" },
  ],
} as const;

const ALL_METRICS = [
  ...METRIC_GROUPS.inverter,
  ...METRIC_GROUPS.building,
  ...METRIC_GROUPS.weather,
];

const WEATHER_KEYS = new Set<string>(METRIC_GROUPS.weather.map((m) => m.key));

// Treat tiny negative PV generation as 0 for alerts only
const PV_GEN_KEYS = new Set<string>([
  "total_power",
  "pv_1084",
  "pv_1086",
  "pv_1200",
]);
const PV_DEADBAND_KW = 0.5; // tweak as needed

function sanitizeForAlerts(metricKey: string, v: number | null | undefined) {
  if (v == null || typeof v !== "number") return v;
  // only PV gen channels: clamp small negatives to 0; keep large negatives
  if (PV_GEN_KEYS.has(metricKey) && v < 0 && v > -PV_DEADBAND_KW) return 0;
  return v;
}

/* --------------- Helpers --------------- */
const findMetricLabel = (key: string) =>
  key === ALL_KEY
    ? "All Metrics"
    : ALL_METRICS.find((m) => m.key === key)?.label ?? key;

const getGroupForMetric = (
  key: string
): "all" | "inverter" | "building" | "weather" => {
  if (key === ALL_KEY) return "all";
  if (METRIC_GROUPS.inverter.some((m) => m.key === key)) return "inverter";
  if (METRIC_GROUPS.building.some((m) => m.key === key)) return "building";
  return "weather";
};

const expandSelection = (metric: string) =>
  metric === ALL_KEY ? ALL_METRICS.map((m) => m.key) : [metric];

type Source = "inverter" | "weather";
const metricSource = (key: string): Source =>
  WEATHER_KEYS.has(key) ? "weather" : "inverter";

/** key that uniquely represents a rule for a specific metric (so state is per-rule, per-metric) */
const ruleKey = (r: Rule, metricKey: string) =>
  `${r.type}:${metricKey}:${r.min ?? ""}:${r.max ?? ""}:${
    r.repeatMins ?? ALARM_PERIOD_DEFAULT_MIN
  }`;

/** Evaluate rules; only evaluate keys allowed by `allowedSources`.
 * - RANGE: only alert when numeric; ignore missing; edge-log "resolved" when back inside.
 * - NULL: alert only after source ready; edge-log "recovered" when data appears.
 * - Throttle re-alerts by `repeatMins`.
 */
function evaluateOnce(
  rules: Rule[],
  getLatestValue: (metricKey: string) => number | null | undefined,
  allowedSources: Set<Source>,
  isSourceReady: (s: Source) => boolean,
  prevAlarmState: AlarmState
): { logs: Log[]; nextAlarmState: AlarmState } {
  const now = new Date();
  const nowMs = now.getTime();
  const nowStr = now.toLocaleString();
  const out: Log[] = [];
  const nextState: AlarmState = { ...prevAlarmState };

  for (const r of rules) {
    const repeatMs = (r.repeatMins ?? ALARM_PERIOD_DEFAULT_MIN) * 60_000;

    for (const k of expandSelection(r.metric)) {
      const src = metricSource(k);
      if (!allowedSources.has(src)) continue;

      const key = ruleKey(r, k);
      const prev = nextState[key] ?? { violating: false, lastAlarmMs: 0 };
      const rawVal = getLatestValue(k);
      const val = sanitizeForAlerts(k, rawVal);

      if (r.type === "null") {
        if (!isSourceReady(src)) continue; // don't warn until first fetch completed

        const missing = val === null || typeof val === "undefined";
        if (missing) {
          const shouldRepeat =
            !prev.violating || nowMs - prev.lastAlarmMs >= repeatMs;
          if (shouldRepeat) {
            out.push({
              timestamp: nowStr,
              metric: k,
              value: val,
              message: `${findMetricLabel(k)} has no data (null/undefined)`,
            });
            nextState[key] = { violating: true, lastAlarmMs: nowMs };
          }
        } else if (prev.violating) {
          // recovered edge
          out.push({
            timestamp: nowStr,
            metric: k,
            value: val,
            message: `${findMetricLabel(k)} data recovered`,
          });
          nextState[key] = { violating: false, lastAlarmMs: nowMs };
        }
        continue;
      }

      // RANGE rule
      if (typeof val === "number") {
        const min = r.min ?? -Infinity;
        const max = r.max ?? Infinity;
        const outside = val < min || val > max;

        if (outside) {
          const shouldRepeat =
            !prev.violating || nowMs - prev.lastAlarmMs >= repeatMs;
          if (shouldRepeat) {
            out.push({
              timestamp: nowStr,
              metric: k,
              value: val,
              message: `${findMetricLabel(k)} outside [${r.min}..${r.max}]`,
            });
            nextState[key] = { violating: true, lastAlarmMs: nowMs };
          }
        } else if (prev.violating) {
          // resolved edge
          out.push({
            timestamp: nowStr,
            metric: k,
            value: val,
            message: `${findMetricLabel(k)} back in range`,
          });
          nextState[key] = { violating: false, lastAlarmMs: nowMs };
        }
      }
      // if val is missing for range rules, we neither log nor flip the state.
    }
  }

  return { logs: out, nextAlarmState: nextState };
}

/* --------------- Component -------------- */
export default function Notification() {
  // live data (today) + loading flags
  const { data: inverterData, loading: inverterLoading } =
    useInverterPowerData("today");
  const { data: weatherData, loading: weatherLoading } =
    useWeatherData("today");

  // persisted state
  const [rules, setRules] = useState<Rule[]>(() =>
    JSON.parse(localStorage.getItem("notification_rules") || "[]")
  );
  const [logs, setLogs] = useState<Log[]>(() =>
    JSON.parse(localStorage.getItem("notification_logs") || "[]")
  );
  const [alarmState, setAlarmState] = useState<AlarmState>(() => {
    try {
      return JSON.parse(localStorage.getItem(ALARM_STATE_KEY) || "{}");
    } catch {
      return {};
    }
  });

  // default to All Metrics
  const [selectedMetric, setSelectedMetric] = useState<string>(ALL_KEY);
  const [ruleType, setRuleType] = useState<RuleType>("range");
  const [minVal, setMinVal] = useState<number>(0);
  const [maxVal, setMaxVal] = useState<number>(1000);
  const [repeatMins, setRepeatMins] = useState<number>(
    ALARM_PERIOD_DEFAULT_MIN
  );

  // per-source last-checked timestamps to avoid double-logging
  const [lastInvTs, setLastInvTs] = useState<number>(
    Number(localStorage.getItem("notification_last_inv") || 0)
  );
  const [lastWthTs, setLastWthTs] = useState<number>(
    Number(localStorage.getItem("notification_last_wth") || 0)
  );

  /* ----- persist + notify navbar ----- */
  const broadcastBadge = () => {
    window.dispatchEvent(new Event("notification_updated"));
  };

  const saveRules = (next: Rule[]) => {
    setRules(next);
    localStorage.setItem("notification_rules", JSON.stringify(next));
  };

  const saveLogs = (next: Log[]) => {
    setLogs(next);
    localStorage.setItem("notification_logs", JSON.stringify(next));
    broadcastBadge();
  };

  const saveAlarmState = (next: AlarmState) => {
    setAlarmState(next);
    localStorage.setItem(ALARM_STATE_KEY, JSON.stringify(next));
  };

  /* ----- data helpers ----- */
  const getLatestValue = (metricKey: string): number | null | undefined => {
    if (WEATHER_KEYS.has(metricKey)) {
      if (!weatherData?.length) return undefined;
      const last = weatherData[weatherData.length - 1] as any;
      return (last?.[metricKey] ?? null) as number | null;
    } else {
      if (!inverterData?.length) return undefined;
      const last = inverterData[inverterData.length - 1] as any;
      return (last?.[metricKey] ?? null) as number | null;
    }
  };

  const latestDisplay = useMemo(() => {
    if (selectedMetric === ALL_KEY) return "multiple metrics";
    const v = getLatestValue(selectedMetric);
    return v === null ? "null" : typeof v === "undefined" ? "no point yet" : v;
  }, [selectedMetric, inverterData, weatherData]);

  const isSourceReady = (s: Source) =>
    s === "inverter" ? !inverterLoading : !weatherLoading;

  /* ----- rules CRUD ----- */
  const handleAddRule = (repeat: number) => {
    let newRule: Rule;
    if (ruleType === "range") {
      if (isNaN(minVal) || isNaN(maxVal) || minVal >= maxVal) {
        alert("Please ensure min < max for a range rule.");
        return;
      }
      newRule = {
        metric: selectedMetric,
        type: "range",
        min: minVal,
        max: maxVal,
        repeatMins: repeat,
      };
    } else {
      newRule = { metric: selectedMetric, type: "null", repeatMins: repeat };
    }

    const nextRules = [...rules, newRule];
    saveRules(nextRules);

    // Evaluate immediately for the new rule ONLY; source-aware; skip if source still loading.
    const allowed =
      newRule.metric === ALL_KEY
        ? (["inverter", "weather"].filter((s) =>
            isSourceReady(s as Source)
          ) as Source[])
        : [metricSource(newRule.metric)];
    const { logs: logsOut, nextAlarmState } = evaluateOnce(
      [newRule],
      getLatestValue,
      new Set<Source>(allowed),
      isSourceReady,
      alarmState
    );
    if (logsOut.length) saveLogs([...logsOut, ...logs]);
    if (nextAlarmState !== alarmState) saveAlarmState(nextAlarmState);
  };

  const handleDeleteRule = (index: number) => {
    const next = rules.filter((_, i) => i !== index);
    saveRules(next);
  };

  const handleDeleteAllRules = () => {
    saveRules([]);
  };

  /* ----- grouped view with stable indexes ----- */
  const grouped = useMemo(() => {
    return rules.reduce(
      (acc, r, idx) => {
        const g = getGroupForMetric(r.metric);
        acc[g].push({ rule: r, idx });
        return acc;
      },
      {
        all: [] as { rule: Rule; idx: number }[],
        inverter: [] as { rule: Rule; idx: number }[],
        building: [] as { rule: Rule; idx: number }[],
        weather: [] as { rule: Rule; idx: number }[],
      }
    );
  }, [rules]);

  /* ----- auto-evaluate only when a source actually updated ----- */
  useEffect(() => {
    const invTs = inverterData?.length
      ? inverterData[inverterData.length - 1].time
      : 0;
    const wthTs = weatherData?.length
      ? weatherData[weatherData.length - 1].time
      : 0;

    const allowed = new Set<Source>();
    if (invTs && invTs > lastInvTs) allowed.add("inverter");
    if (wthTs && wthTs > lastWthTs) allowed.add("weather");

    if (!rules.length || allowed.size === 0) return;

    const { logs: out, nextAlarmState } = evaluateOnce(
      rules,
      getLatestValue,
      allowed,
      isSourceReady,
      alarmState
    );
    if (out.length) saveLogs([...out, ...logs]);

    if (nextAlarmState !== alarmState) saveAlarmState(nextAlarmState);

    if (allowed.has("inverter")) {
      setLastInvTs(invTs);
      localStorage.setItem("notification_last_inv", String(invTs));
    }
    if (allowed.has("weather")) {
      setLastWthTs(wthTs);
      localStorage.setItem("notification_last_wth", String(wthTs));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inverterData, weatherData, rules, inverterLoading, weatherLoading]);

  /* --------------- UI ---------------- */
  const clearLogs = () => saveLogs([]);

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-xl font-semibold text-gray-800">Notifications</h1>

      <RuleForm
        allKey={ALL_KEY}
        inverterOptions={METRIC_GROUPS.inverter}
        buildingOptions={METRIC_GROUPS.building}
        weatherOptions={METRIC_GROUPS.weather}
        selectedMetric={selectedMetric}
        setSelectedMetric={setSelectedMetric}
        ruleType={ruleType}
        setRuleType={setRuleType}
        minVal={minVal}
        setMinVal={setMinVal}
        maxVal={maxVal}
        setMaxVal={setMaxVal}
        latestValue={latestDisplay}
        repeatMins={repeatMins}
        setRepeatMins={setRepeatMins}
        onAdd={() => handleAddRule(repeatMins)}
      />

      <RulesList
        grouped={grouped}
        onDeleteAt={handleDeleteRule}
        onDeleteAll={handleDeleteAllRules}
        findMetricLabel={findMetricLabel}
      />

      {/* Logs */}
      <div className="bg-white border p-4 rounded shadow">
        <div className="flex justify-between items-center mb-2">
          <h2 className="font-medium text-gray-700">Notification Logs</h2>
          <button
            className="text-xs text-gray-700 underline"
            onClick={clearLogs}
          >
            Clear Logs
          </button>
        </div>
        {logs.length === 0 ? (
          <p className="text-sm text-gray-500">No alerts yet.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {logs.map((log, i) => (
              <li key={i}>
                <span className="text-gray-600">{log.timestamp}</span> –{" "}
                <span className="text-blue-700 font-medium">
                  {findMetricLabel(log.metric)}
                </span>{" "}
                = <code>{log.value === null ? "null" : String(log.value)}</code>{" "}
                → {log.message}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
