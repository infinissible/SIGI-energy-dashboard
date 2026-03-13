import {
  useState,
  type Dispatch,
  type SetStateAction,
  type ReactNode,
  type HTMLAttributes,
} from "react";
import { Panel } from "@xyflow/react";

import NodeInspector from "./NodeInspector";
// import ChangeLogger from "./ChangeLogger";
// import ViewportLogger from "./ViewportLogger";

export default function DevTools() {
  return (
    <div className="react-flow__devtools">
      <NodeInspector />
    </div>
  );
}
