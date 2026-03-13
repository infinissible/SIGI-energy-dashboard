import { Handle, Position } from "@xyflow/react";
import NodeTooltipWrapper from "./NodeTooltipWrapper";

type HandleConfig = {
  position: Position;
  id?: string;
  type?: "source" | "target";
};

type Props = {
  id: string;
  data: {
    titleLine1: string;
    titleLine2?: string;
    value?: string;
    icon?: string;
    handles: HandleConfig[];
    selected?: boolean;
    onClick?: () => void;
  };
};

const tooltipConfig: Record<
  string,
  { title: string; subtitle?: string; lines: string[]; position?: Position }
> = {
  // Inverters
  "node-1": {
    title: "Inverter A",
    subtitle: "(AE 260TX)",
    lines: [],
    position: Position.Bottom,
  },
  "node-2": {
    title: "Inverter B",
    subtitle: "(AE 100TX)",
    lines: [""],
    position: Position.Bottom,
  },
  "node-3": {
    title: "Inverter C",
    subtitle: "(AE 100TX)",
    lines: [""],
    position: Position.Bottom,
  },

  // EV Chargers
  "node-4": {
    title: "EV Charger L3",
    lines: [
      "• Only Level 3 charger is being metered",
      "• When > 1.0 kW it displays Charging",
      "• Otherwise shows Idle",
    ],
    position: Position.Right,
  },
  "node-5": {
    title: "EV Charger L2",
    lines: ["Level 2"],
    position: Position.Right,
  },

  // Trailers
  "node-6": {
    title: "Trailer 1",
    lines: [],
    position: Position.Left,
  },
  "node-7": {
    title: "Trailer 2",
    lines: [],
    position: Position.Left,
  },

  // Buildings
  "node-8": {
    title: "Building 1086",
    lines: [],
    position: Position.Top,
  },
  "node-9": {
    title: "Building 1200",
    lines: [],
    position: Position.Top,
  },
  "node-10": {
    title: "Building 1084",
    lines: [],
    position: Position.Top,
  },

  // Data Hub
  "node-11": {
    title: "Data Hub",
    lines: [],
    position: Position.Top,
  },
};

export default function CustomHandleNode({ data, id }: Props) {
  const getHandleType = (): "source" => "source";

  const getHandleColor = (position: Position): string => {
    if (id === "node-8" || id === "node-9" || id === "node-10")
      return position === Position.Top ? "#28a745" : "#000";
    if (id === "node-4") return "#28a745"; // Level 3 charger
    if (id === "node-5") return "#ffc107"; // Level 2 charger

    switch (position) {
      case Position.Bottom:
        return "#28a745";
      case Position.Left:
        return "#dc3545";
      case Position.Right:
        return "#ffc107";
      default:
        return "#000";
    }
  };

  const tooltip = tooltipConfig[id];

  const NodeContent = (
    <div
      onClick={data.onClick}
      style={{
        width: 120,
        height: 120,
        borderRadius: 6,
        position: "relative",
        background: data.selected ? "#e6f0ff" : "white",

        textAlign: "center",
        fontSize: 14,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 8,
        boxSizing: "border-box",
        // border: data.selected ? "2px solid #3399ff" : "none",

        cursor: "pointer",
      }}
    >
      <div style={{ fontWeight: "bold", lineHeight: 1.2 }}>
        {data.titleLine1}
      </div>

      {data.icon && (
        <img
          src={data.icon}
          alt="icon"
          style={{ width: 53, height: 53, objectFit: "contain" }}
        />
      )}

      <div style={{ fontSize: 14, fontWeight: 500 }}>{data.value ?? ""}</div>

      {data.handles.map((h, idx) => (
        <Handle
          key={h.id || `${h.position}-${idx}`}
          type={h.type || getHandleType()}
          position={h.position}
          isConnectable={false}
          id={h.id}
          style={{
            width: 6,
            height: 6,
            background: getHandleColor(h.position),
            border: "none",
          }}
        />
      ))}
    </div>
  );

  if (tooltip) {
    return (
      <NodeTooltipWrapper
        title={tooltip.title}
        subtitle={tooltip.subtitle}
        lines={tooltip.lines}
        position={tooltip.position}
      >
        {NodeContent}
      </NodeTooltipWrapper>
    );
  }

  return NodeContent;
}
