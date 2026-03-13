import {
  NodeTooltip,
  NodeTooltipContent,
  NodeTooltipTrigger,
} from "@/components/node-tooltip";
import { Position } from "@xyflow/react";
import { ReactNode } from "react";

type Props = {
  title: string;
  subtitle?: string;
  lines: string[];
  children: ReactNode;
  position?: Position;
};

export default function NodeTooltipWrapper({
  title,
  subtitle,
  lines,
  children,
  position = Position.Bottom,
}: Props) {
  return (
    <NodeTooltip>
      <NodeTooltipContent position={position} className="text-sm text-left">
        <div className="text-[15px] text-center font-semibold">{title}</div>
        {subtitle && <div className="text-sm text-center">{subtitle}</div>}
        {lines.map((line, i) => (
          <div key={i} className="text-sm text-left">
            {line}
          </div>
        ))}
      </NodeTooltipContent>
      <NodeTooltipTrigger>{children}</NodeTooltipTrigger>
    </NodeTooltip>
  );
}
