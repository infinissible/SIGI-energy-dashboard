export type RuleType = "range" | "null";

export type Rule = {
  metric: string;
  type: RuleType;
  min?: number | null;
  max?: number | null;
  repeatMins?: number;
};

export type GroupedRules = {
  all: { rule: Rule; idx: number }[];
  inverter: { rule: Rule; idx: number }[];
  building: { rule: Rule; idx: number }[];
  weather: { rule: Rule; idx: number }[];
};
