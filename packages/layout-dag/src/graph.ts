import type {
  GraphScene,
  GraphSceneEdge,
  GraphSceneNode,
} from "@terminal-depth/scene-contract";

import { LayoutDagError } from "./errors.ts";

export interface DagGraph {
  readonly incomingEdgesByNodeId: ReadonlyMap<string, readonly GraphSceneEdge[]>;
  readonly nodeIds: readonly string[];
  readonly nodesById: ReadonlyMap<string, GraphSceneNode>;
  readonly outgoingEdgesByNodeId: ReadonlyMap<string, readonly GraphSceneEdge[]>;
}

export function buildDagGraph(scene: GraphScene): DagGraph {
  const sortedNodes = [...scene.nodes].sort((left, right) => {
    return compareIds(left.id, right.id);
  });
  const sortedEdges = [...scene.edges].sort((left, right) => {
    return compareIds(left.id, right.id);
  });
  const nodesById = new Map<string, GraphSceneNode>();
  const incomingEdgesByNodeId = new Map<string, GraphSceneEdge[]>();
  const outgoingEdgesByNodeId = new Map<string, GraphSceneEdge[]>();

  for (const node of sortedNodes) {
    if (nodesById.has(node.id)) {
      throw new LayoutDagError(
        "duplicate-node-id",
        `Cannot compute DAG layout because node id "${node.id}" is duplicated.`,
      );
    }

    nodesById.set(node.id, node);
    incomingEdgesByNodeId.set(node.id, []);
    outgoingEdgesByNodeId.set(node.id, []);
  }

  const seenEdgeIds = new Set<string>();

  for (const edge of sortedEdges) {
    if (seenEdgeIds.has(edge.id)) {
      throw new LayoutDagError(
        "duplicate-edge-id",
        `Cannot compute DAG layout because edge id "${edge.id}" is duplicated.`,
      );
    }

    const sourceOutgoing = outgoingEdgesByNodeId.get(edge.source);
    const targetIncoming = incomingEdgesByNodeId.get(edge.target);

    if (!sourceOutgoing || !targetIncoming) {
      const missingEndpoints: string[] = [];

      if (!sourceOutgoing) {
        missingEndpoints.push(`source "${edge.source}"`);
      }

      if (!targetIncoming) {
        missingEndpoints.push(`target "${edge.target}"`);
      }

      throw new LayoutDagError(
        "dangling-edge-reference",
        `Cannot compute DAG layout because edge "${edge.id}" references missing ${missingEndpoints.join(" and ")}.`,
      );
    }

    seenEdgeIds.add(edge.id);
    sourceOutgoing.push(edge);
    targetIncoming.push(edge);
  }

  for (const nodeId of nodesById.keys()) {
    const outgoingEdges = outgoingEdgesByNodeId.get(nodeId);
    const incomingEdges = incomingEdgesByNodeId.get(nodeId);

    if (outgoingEdges) {
      outgoingEdges.sort(compareOutgoingEdges);
    }

    if (incomingEdges) {
      incomingEdges.sort(compareIncomingEdges);
    }
  }

  return {
    incomingEdgesByNodeId,
    nodeIds: Object.freeze(sortedNodes.map((node) => node.id)),
    nodesById,
    outgoingEdgesByNodeId,
  };
}

function compareIncomingEdges(
  left: GraphSceneEdge,
  right: GraphSceneEdge,
): number {
  const sourceComparison = compareIds(left.source, right.source);

  if (sourceComparison !== 0) {
    return sourceComparison;
  }

  return compareIds(left.id, right.id);
}

function compareOutgoingEdges(
  left: GraphSceneEdge,
  right: GraphSceneEdge,
): number {
  const targetComparison = compareIds(left.target, right.target);

  if (targetComparison !== 0) {
    return targetComparison;
  }

  return compareIds(left.id, right.id);
}

export function compareIds(left: string, right: string): number {
  if (left < right) {
    return -1;
  }

  if (left > right) {
    return 1;
  }

  return 0;
}
