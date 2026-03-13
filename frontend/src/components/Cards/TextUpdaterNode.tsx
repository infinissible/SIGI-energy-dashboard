import { Handle, Position } from "@xyflow/react";
import {
  NodeTooltip,
  NodeTooltipTrigger,
  NodeTooltipContent,
} from "@/components/node-tooltip"; // working import

type Props = {
  data: {
    title?: string;
    icon?: string;
    selected?: boolean;
    onClick?: () => void;
  };
};

export default function TextUpdaterNode({ data }: Props) {
  const isSelected = data?.selected;
  const onClick = data?.onClick;
  return (
    <NodeTooltip>
      <NodeTooltipContent position={Position.Top} className="text-sm text-left">
        <div className="text-[15px] font-semibold text-center">Data Hub</div>
        <div className="text-sm text-left">Sharkmeter100</div>
        <div className="text-sm text-left">Sharkmeter200s</div>
        <div className="text-sm text-left">SharkmeterMP200</div>
        <div className="text-sm text-left">Acquisuite</div>
        <div className="text-sm text-left">System DB</div>
      </NodeTooltipContent>

      <NodeTooltipTrigger>
        <div
          onClick={onClick}
          style={{
            width: 100,
            height: 100,
            borderRadius: 6,
            background: data.selected ? "#e6f0ff" : "white",
            textAlign: "center",
            fontSize: 14,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            alignItems: "center",
            padding: 8,
            boxSizing: "border-box",
            position: "relative",
          }}
        >
          <div style={{ fontWeight: "bold", lineHeight: 1.2 }}>
            {data.title ?? "System Monitoring"}
          </div>

          {data.icon && (
            <img
              src={data.icon}
              alt="icon"
              style={{ width: 53, height: 53, objectFit: "contain" }}
            />
          )}

          <div style={{ fontSize: 13, fontWeight: 500 }}>&nbsp;</div>

          {/* Small handles */}
          <Handle
            type="target"
            position={Position.Top}
            id="top"
            isConnectable={false}
            style={{
              width: 6,
              height: 6,
              background: "#001f3f",
              border: "none",
            }}
          />
          <Handle
            type="target"
            position={Position.Bottom}
            id="bottom"
            isConnectable={false}
            style={{
              width: 6,
              height: 6,
              background: "#001f3f",
              border: "none",
            }}
          />
          <Handle
            type="target"
            position={Position.Left}
            id="left"
            isConnectable={false}
            style={{
              width: 8,
              height: 8,
              background: "#001f3f",
              border: "none",
            }}
          />
          <Handle
            type="target"
            position={Position.Right}
            id="right"
            isConnectable={false}
            style={{
              width: 8,
              height: 8,
              background: "#001f3f",
              border: "none",
            }}
          />
        </div>
      </NodeTooltipTrigger>
    </NodeTooltip>
  );
}
