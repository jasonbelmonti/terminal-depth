import { compareIds, type DagGraph } from "./graph.ts";

export interface DagLayerOrderingInput {
  readonly layerByNodeId: ReadonlyMap<string, number>;
  readonly maxLayer: number;
  readonly nodesByLayer: ReadonlyMap<number, readonly string[]>;
}

interface IncomingSignaturePart {
  readonly layer: number;
  readonly nodeId: string;
  readonly rank: number;
}

interface OutgoingSignaturePart {
  readonly layer: number;
  readonly nodeId: string;
}

interface LayerNodeOrderingDescriptor {
  readonly nodeId: string;
  readonly incomingSignature: readonly IncomingSignaturePart[];
  readonly outgoingSignature: readonly OutgoingSignaturePart[];
}

export function computeOrderedNodesByLayer(
  graph: DagGraph,
  layers: DagLayerOrderingInput,
): Map<number, string[]> {
  const orderedNodesByLayer = new Map<number, string[]>();
  const rankByNodeId = new Map<string, number>();

  for (let layer = 0; layer <= layers.maxLayer; layer += 1) {
    const layerNodeIds = layers.nodesByLayer.get(layer);

    if (!layerNodeIds) {
      continue;
    }

    const orderedNodeIds = layerNodeIds
      .map((nodeId) => {
        return createLayerNodeOrderingDescriptor(
          nodeId,
          graph,
          layers,
          rankByNodeId,
        );
      })
      .sort(compareLayerNodeOrderingDescriptors)
      .map((descriptor) => {
        return descriptor.nodeId;
      });

    orderedNodesByLayer.set(layer, orderedNodeIds);

    orderedNodeIds.forEach((nodeId, rank) => {
      rankByNodeId.set(nodeId, rank);
    });
  }

  return orderedNodesByLayer;
}

function createLayerNodeOrderingDescriptor(
  nodeId: string,
  graph: DagGraph,
  layers: DagLayerOrderingInput,
  rankByNodeId: ReadonlyMap<string, number>,
): LayerNodeOrderingDescriptor {
  return {
    incomingSignature: getIncomingSignature(nodeId, graph, layers, rankByNodeId),
    nodeId,
    outgoingSignature: getOutgoingSignature(nodeId, graph, layers),
  };
}

function compareLayerNodeOrderingDescriptors(
  left: LayerNodeOrderingDescriptor,
  right: LayerNodeOrderingDescriptor,
): number {
  const incomingComparison = compareIncomingSignatures(
    left.incomingSignature,
    right.incomingSignature,
  );

  if (incomingComparison !== 0) {
    return incomingComparison;
  }

  const outgoingComparison = compareOutgoingSignatures(
    left.outgoingSignature,
    right.outgoingSignature,
  );

  if (outgoingComparison !== 0) {
    return outgoingComparison;
  }

  return compareIds(left.nodeId, right.nodeId);
}

function getIncomingSignature(
  nodeId: string,
  graph: DagGraph,
  layers: DagLayerOrderingInput,
  rankByNodeId: ReadonlyMap<string, number>,
): IncomingSignaturePart[] {
  const incomingEdges = graph.incomingEdgesByNodeId.get(nodeId) ?? [];

  return [...incomingEdges]
    .map((edge) => {
      return {
        layer: layers.layerByNodeId.get(edge.source) ?? -1,
        nodeId: edge.source,
        rank: rankByNodeId.get(edge.source) ?? -1,
      };
    })
    .sort(compareIncomingSignatureParts);
}

function getOutgoingSignature(
  nodeId: string,
  graph: DagGraph,
  layers: DagLayerOrderingInput,
): OutgoingSignaturePart[] {
  const outgoingEdges = graph.outgoingEdgesByNodeId.get(nodeId) ?? [];

  return [...outgoingEdges]
    .map((edge) => {
      return {
        layer: layers.layerByNodeId.get(edge.target) ?? -1,
        nodeId: edge.target,
      };
    })
    .sort(compareOutgoingSignatureParts);
}

function compareIncomingSignatures(
  left: readonly IncomingSignaturePart[],
  right: readonly IncomingSignaturePart[],
): number {
  return compareSignatureArrays(left, right, compareIncomingSignatureParts);
}

function compareOutgoingSignatures(
  left: readonly OutgoingSignaturePart[],
  right: readonly OutgoingSignaturePart[],
): number {
  return compareSignatureArrays(left, right, compareOutgoingSignatureParts);
}

function compareSignatureArrays<T>(
  left: readonly T[],
  right: readonly T[],
  comparePart: (leftPart: T, rightPart: T) => number,
): number {
  const sharedLength = Math.min(left.length, right.length);

  for (let index = 0; index < sharedLength; index += 1) {
    const comparison = comparePart(left[index]!, right[index]!);

    if (comparison !== 0) {
      return comparison;
    }
  }

  return left.length - right.length;
}

function compareIncomingSignatureParts(
  left: IncomingSignaturePart,
  right: IncomingSignaturePart,
): number {
  const layerComparison = left.layer - right.layer;

  if (layerComparison !== 0) {
    return layerComparison;
  }

  const rankComparison = left.rank - right.rank;

  if (rankComparison !== 0) {
    return rankComparison;
  }

  return compareIds(left.nodeId, right.nodeId);
}

function compareOutgoingSignatureParts(
  left: OutgoingSignaturePart,
  right: OutgoingSignaturePart,
): number {
  const layerComparison = left.layer - right.layer;

  if (layerComparison !== 0) {
    return layerComparison;
  }

  return compareIds(left.nodeId, right.nodeId);
}
