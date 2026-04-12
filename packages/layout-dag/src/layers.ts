import { LayoutDagError } from "./errors.ts";
import { buildDagGraph, compareIds, type DagGraph } from "./graph.ts";
import { computeOrderedNodesByLayer } from "./ordering.ts";

export interface DagLayers {
  readonly layerByNodeId: ReadonlyMap<string, number>;
  readonly maxLayer: number;
  readonly nodesByLayer: ReadonlyMap<number, readonly string[]>;
  readonly topologicalOrder: readonly string[];
}

export function computeDagLayers(graph: DagGraph): DagLayers {
  const remainingIndegreeByNodeId = new Map<string, number>();
  const readyNodeIds: string[] = [];
  const processedNodeIds = new Set<string>();

  for (const nodeId of graph.nodeIds) {
    const indegree = graph.incomingEdgesByNodeId.get(nodeId)?.length ?? 0;

    remainingIndegreeByNodeId.set(nodeId, indegree);

    if (indegree === 0) {
      insertSorted(readyNodeIds, nodeId);
    }
  }

  const topologicalOrder: string[] = [];

  while (readyNodeIds.length > 0) {
    const nodeId = readyNodeIds.shift();

    if (nodeId === undefined) {
      break;
    }

    topologicalOrder.push(nodeId);
    processedNodeIds.add(nodeId);

    for (const edge of graph.outgoingEdgesByNodeId.get(nodeId) ?? []) {
      const remainingIndegree = remainingIndegreeByNodeId.get(edge.target);

      if (remainingIndegree === undefined) {
        continue;
      }

      const nextIndegree = remainingIndegree - 1;
      remainingIndegreeByNodeId.set(edge.target, nextIndegree);

      if (nextIndegree === 0) {
        insertSorted(readyNodeIds, edge.target);
      }
    }
  }

  if (topologicalOrder.length !== graph.nodeIds.length) {
    const remainingNodeIds = graph.nodeIds.filter((nodeId) => {
      return !processedNodeIds.has(nodeId);
    });

    throw new LayoutDagError(
      "cyclic-graph",
      `Cannot compute DAG layout because the scene contains a cycle involving node(s): ${remainingNodeIds.join(", ")}.`,
    );
  }

  const layerByNodeId = new Map<string, number>();
  const unorderedNodesByLayer = new Map<number, string[]>();
  let maxLayer = 0;

  for (const nodeId of topologicalOrder) {
    const incomingEdges = graph.incomingEdgesByNodeId.get(nodeId) ?? [];
    const layer = incomingEdges.reduce((currentMaxLayer, edge) => {
      return Math.max(currentMaxLayer, (layerByNodeId.get(edge.source) ?? 0) + 1);
    }, 0);

    layerByNodeId.set(nodeId, layer);
    maxLayer = Math.max(maxLayer, layer);

    const layerNodeIds = unorderedNodesByLayer.get(layer);

    if (layerNodeIds) {
      layerNodeIds.push(nodeId);
      continue;
    }

    unorderedNodesByLayer.set(layer, [nodeId]);
  }

  const orderedNodesByLayer = computeOrderedNodesByLayer(graph, {
    layerByNodeId,
    maxLayer,
    nodesByLayer: unorderedNodesByLayer,
  });

  return {
    layerByNodeId,
    maxLayer,
    nodesByLayer: freezeLayerMap(orderedNodesByLayer),
    topologicalOrder: Object.freeze(topologicalOrder),
  };
}

export function computeSceneDagLayers(
  scene: Parameters<typeof buildDagGraph>[0],
): DagLayers {
  return computeDagLayers(buildDagGraph(scene));
}

function freezeLayerMap(
  nodesByLayer: Map<number, string[]>,
): ReadonlyMap<number, readonly string[]> {
  return new Map(
    [...nodesByLayer.entries()].map(([layer, nodeIds]) => {
      return [layer, Object.freeze([...nodeIds])] as const;
    }),
  );
}

function insertSorted(values: string[], candidate: string): void {
  let insertionIndex = values.findIndex((value) => {
    return compareIds(candidate, value) < 0;
  });

  if (insertionIndex === -1) {
    insertionIndex = values.length;
  }

  values.splice(insertionIndex, 0, candidate);
}
