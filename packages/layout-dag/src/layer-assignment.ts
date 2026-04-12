import type { DagGraph } from "./graph.ts";

export interface DagLayerAssignment {
  readonly layerByNodeId: Map<string, number>;
  readonly maxLayer: number;
  readonly nodesByLayer: Map<number, string[]>;
}

export function computeUnorderedNodesByLayer(
  graph: DagGraph,
  topologicalOrder: readonly string[],
): DagLayerAssignment {
  const layerByNodeId = new Map<string, number>();
  const nodesByLayer = new Map<number, string[]>();
  let maxLayer = 0;

  for (const nodeId of topologicalOrder) {
    const incomingEdges = graph.incomingEdgesByNodeId.get(nodeId) ?? [];
    const layer = incomingEdges.reduce((currentMaxLayer, edge) => {
      return Math.max(currentMaxLayer, (layerByNodeId.get(edge.source) ?? 0) + 1);
    }, 0);

    layerByNodeId.set(nodeId, layer);
    maxLayer = Math.max(maxLayer, layer);

    const layerNodeIds = nodesByLayer.get(layer);

    if (layerNodeIds) {
      layerNodeIds.push(nodeId);
      continue;
    }

    nodesByLayer.set(layer, [nodeId]);
  }

  return {
    layerByNodeId,
    maxLayer,
    nodesByLayer,
  };
}
