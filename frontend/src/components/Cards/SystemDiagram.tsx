import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  useEdgesState,
  addEdge,
  Background,
  type Node,
  type Edge,
  type Connection,
  Position,
} from "@xyflow/react";
import type { ReactFlowInstance } from "@xyflow/react";

import TextUpdaterNode from "./TextUpdaterNode";
import CustomHandleNode from "./CustomHandleNode";
import StepEdge from "./StepEdge";

import panelIcon from "@/assets/img/panel.png";
import chargerIcon from "@/assets/img/charger.png";
import trailerIcon from "@/assets/img/trailer.png";
import buildingIcon from "@/assets/img/building.png";
import monitorIcon from "@/assets/img/monitor.png";
import fullSchematic from "@/assets/img/full-schematic.png";
import useLivePVData from "@/hooks/useLivePVData";
import "@xyflow/react/dist/style.css";

// Unified node data type
type SharedNodeData = {
  title?: string;
  titleLine1?: string;
  value?: string;
  icon?: string;
  handles?: { position: Position; id?: string }[];
  selected?: boolean;
  onClick?: () => void;
};

const edgeTypes = { step: StepEdge };
const nodeTypes = {
  customHandle: CustomHandleNode,
  textUpdater: TextUpdaterNode,
};

// Node factory for `customHandle` nodes
const createCustomNode = (
  id: string,
  title: string,
  value: string,
  x: number,
  y: number,
  handles: { position: Position; id?: string }[] = [],
  icon?: string,
  onClick?: () => void,
  selected?: boolean
): Node<SharedNodeData> => ({
  id,
  type: "customHandle",
  data: {
    titleLine1: title,
    value,
    icon,
    handles,
    selected,
    onClick,
  },
  position: { x, y },
  style: { width: 100, height: 100 },
  draggable: false,
});

const initialEdges: Edge[] = [
  {
    id: "e1",
    source: "node-1",
    target: "node-11",
    type: "step",
    targetHandle: "top",
    animated: true,
  },
  {
    id: "e2",
    source: "node-2",
    target: "node-11",
    type: "step",
    targetHandle: "top",
    animated: true,
  },
  {
    id: "e3",
    source: "node-3",
    target: "node-11",
    type: "step",
    targetHandle: "top",
    animated: true,
  },
  {
    id: "e4",
    source: "node-4",
    target: "node-11",
    type: "step",
    targetHandle: "left",
  },
  {
    id: "e5",
    source: "node-5",
    target: "node-11",
    type: "step",
    targetHandle: "left",
  },
  {
    id: "e6",
    source: "node-6",
    target: "node-11",
    type: "step",
    targetHandle: "right",
  },
  {
    id: "e7",
    source: "node-7",
    target: "node-11",
    type: "step",
    targetHandle: "right",
  },
  {
    id: "e8",
    source: "node-8",
    target: "node-11",
    type: "step",
    targetHandle: "bottom",
  },
  {
    id: "e9",
    source: "node-9",
    target: "node-11",
    type: "step",
    targetHandle: "bottom",
  },
  {
    id: "e10",
    source: "node-10",
    target: "node-11",
    type: "step",
    targetHandle: "bottom",
  },
];

export default function SystemDiagram({
  onNodeSelect,
}: {
  onNodeSelect?: (systemKey: string) => void;
}) {
  const [view, setView] = useState<"simplified" | "detailed">("simplified");
  const [edges, setEdges] = useEdgesState(initialEdges);
  const [selectedNodeId, setSelectedNodeId] = useState<string>("");

  // NEW: refs for responsive behavior
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [rf, setRf] = useState<ReactFlowInstance | null>(null);

  // UPDATED: pull per-building loads from the hook
  const { inverters, evL3KW, adminLoad, b1086Load, b1200Load } =
    useLivePVData();

  const getVal = (val?: string) =>
    !val || isNaN(Number(val)) ? "--" : `${val} kW`;

  const handleClick = (nodeId: string, systemKey: string) => {
    setSelectedNodeId(nodeId);
    onNodeSelect?.(systemKey);
  };

  const nodes: Node[] = useMemo(() => {
    return [
      createCustomNode(
        "node-1",
        "Inverter A",
        getVal(inverters[0]?.value),
        140,
        20,
        [{ position: Position.Bottom }],
        panelIcon,
        () => handleClick("node-1", "1086"),
        selectedNodeId === "node-1"
      ),
      createCustomNode(
        "node-2",
        "Inverter B",
        getVal(inverters[1]?.value),
        250,
        20,
        [{ position: Position.Bottom }],
        panelIcon,
        () => handleClick("node-2", "1200"),
        selectedNodeId === "node-2"
      ),
      createCustomNode(
        "node-3",
        "Inverter C",
        getVal(inverters[2]?.value),
        360,
        20,
        [{ position: Position.Bottom }],
        panelIcon,
        () => handleClick("node-3", "1084"),
        selectedNodeId === "node-3"
      ),
      createCustomNode(
        "node-4",
        "EV Charger L3",
        getVal(evL3KW),
        0,
        110,
        [{ position: Position.Right }],
        chargerIcon,
        () => handleClick("node-4", "ev_l3"),
        selectedNodeId === "node-4"
      ),
      createCustomNode(
        "node-5",
        "EV Charger L2",
        "N/A",
        0,
        250,
        [{ position: Position.Right }],
        chargerIcon
      ),
      createCustomNode(
        "node-6",
        "Trailer 1",
        "N/A",
        500,
        110,
        [{ position: Position.Left }],
        trailerIcon
      ),
      createCustomNode(
        "node-7",
        "Trailer 2",
        "N/A",
        500,
        250,
        [{ position: Position.Left }],
        trailerIcon
      ),
      // 1086 (left) – load from b1086Load
      createCustomNode(
        "node-8",
        "1086",
        getVal(b1086Load),
        140,
        340,
        [{ position: Position.Top }],
        buildingIcon,
        () => handleClick("node-8", "b1086"),
        selectedNodeId === "node-8"
      ),

      // 1200 (center) – load from b1200Load
      createCustomNode(
        "node-9",
        "1200",
        getVal(b1200Load),
        250,
        340,
        [{ position: Position.Top }],
        buildingIcon,
        () => handleClick("node-9", "b1200"),
        selectedNodeId === "node-9"
      ),

      // 1084 Admin (right) – load from adminLoad
      createCustomNode(
        "node-10",
        "1084 (Admin)",
        getVal(adminLoad),
        360,
        340,
        [{ position: Position.Top }],
        buildingIcon,
        () => handleClick("node-10", "b1084"),
        selectedNodeId === "node-10"
      ),

      {
        id: "node-11",
        type: "textUpdater",
        data: {
          title: "Data Hub",
          icon: monitorIcon,
          selected: selectedNodeId === "node-11",
          onClick: () => handleClick("node-11", "all"),
        },
        position: { x: 260, y: 190 },
        style: { width: 100, height: 100 },
        draggable: false,
      },
    ];
  }, [inverters, evL3KW, adminLoad, b1086Load, b1200Load, selectedNodeId]);

  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((eds) => addEdge({ ...params, type: "step" }, eds)),
    []
  );

  // Fit when RF instance is ready
  useEffect(() => {
    if (!rf) return;
    const id = requestAnimationFrame(() =>
      rf.fitView({ padding: 0.2, includeHiddenNodes: true })
    );
    return () => cancelAnimationFrame(id);
  }, [rf]);

  // Fit on container resize
  useEffect(() => {
    if (!rf || !containerRef.current) return;
    const el = containerRef.current;
    const ro = new ResizeObserver(() => {
      requestAnimationFrame(() =>
        rf.fitView({ padding: 0.2, includeHiddenNodes: true })
      );
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [rf]);

  // Fit when data that may affect layout changes
  useEffect(() => {
    if (!rf || view !== "simplified") return;
    rf.fitView({ padding: 0.2, includeHiddenNodes: true });
  }, [inverters, evL3KW, adminLoad, b1086Load, b1200Load, view, rf]);

  // Fit when switching views back to simplified
  useEffect(() => {
    if (!rf || view !== "simplified") return;
    rf.fitView({ padding: 0.2, includeHiddenNodes: true });
  }, [view, rf]);

  return (
    <div
      className="bg-white rounded-lg shadow border border-gray-200"
      style={{ width: "100%", position: "relative" }}
    >
      {/* View Toggle */}
      <div className="absolute top-2 right-4 z-10 flex border border-gray-300 rounded overflow-hidden">
        {["simplified", "detailed"].map((v) => (
          <button
            key={v}
            onClick={() => setView(v as typeof view)}
            className={`px-3 py-1 text-xs font-semibold ${
              view === v
                ? "bg-gray-800 text-white"
                : "bg-gray-100 text-gray-700"
            }`}
          >
            {v.charAt(0).toUpperCase() + v.slice(1)}
          </button>
        ))}
      </div>

      {/* Diagram or Image */}
      {view === "simplified" ? (
        <div
          ref={containerRef}
          style={{
            // Responsive height: shrinks on small, grows up to a cap on large
            height: "clamp(320px, 55vw, 480px)",
            paddingTop: "1rem",
          }}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            panOnDrag={false}
            zoomOnScroll={false}
            zoomOnPinch={false}
            zoomOnDoubleClick={false}
            fitView
            fitViewOptions={{ padding: 0.2, includeHiddenNodes: true }}
            minZoom={0.4}
            maxZoom={1.5}
            onInit={(instance) => setRf(instance)}
          >
            <Background style={{ display: "none" }} />
          </ReactFlow>
        </div>
      ) : (
        <div className="flex justify-center p-4">
          <img
            src={fullSchematic}
            alt="Electrical Schematic"
            style={{
              maxWidth: "100%",
              maxHeight: "550px",
              objectFit: "contain",
              paddingTop: "1.5rem",
            }}
          />
        </div>
      )}
    </div>
  );
}
