import {
  useNodes,
  ViewportPortal,
  useReactFlow,
  type XYPosition,
} from "@xyflow/react";

export default function NodeInspector() {
  const { getInternalNode } = useReactFlow();
  const nodes = useNodes();

  return (
    <ViewportPortal>
      <div className="react-flow__devtools-nodeinspector">
        {nodes.map((node) => {
          const internalNode = getInternalNode(node.id);
          if (!internalNode) return null;

          const absPosition = internalNode.internals.positionAbsolute;

          return (
            <NodeInfo
              key={node.id}
              absPosition={absPosition}
              height={node.measured?.height ?? 0}
            />
          );
        })}
      </div>
    </ViewportPortal>
  );
}

type NodeInfoProps = {
  absPosition: XYPosition;
  height: number;
};

function NodeInfo({ absPosition, height }: NodeInfoProps) {
  if (!height) return null;

  return (
    <div
      className="react-flow__devtools-nodeinfo"
      style={{
        position: "absolute",
        transform: `translate(${absPosition.x}px, ${absPosition.y + height}px)`,
        backgroundColor: "white",
        padding: "4px 8px",
        border: "1px solid #ccc",
        borderRadius: "4px",
        fontSize: "12px",
        pointerEvents: "none",
      }}
    >
      <div>
        position: {absPosition.x.toFixed(1)}, {absPosition.y.toFixed(1)}
      </div>
    </div>
  );
}
