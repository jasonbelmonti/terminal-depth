import { computeUnorderedNodesByLayer } from "./layer-assignment.ts";
import { buildDagGraph, type DagGraph } from "./graph.ts";
import { computeOrderedNodesByLayer } from "./ordering.ts";
import { computeTopologicalOrder } from "./topological-order.ts";

export interface DagLayers {
  readonly layerByNodeId: ReadonlyMap<string, number>;
  readonly maxLayer: number;
  readonly nodesByLayer: ReadonlyMap<number, readonly string[]>;
  readonly topologicalOrder: readonly string[];
}

export function computeDagLayers(graph: DagGraph): DagLayers {
  const topologicalOrder = computeTopologicalOrder(graph);
  const { layerByNodeId, maxLayer, nodesByLayer: unorderedNodesByLayer } =
    computeUnorderedNodesByLayer(graph, topologicalOrder);
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
