import { LayoutDagError } from "./errors.ts";
import { compareIds, type DagGraph } from "./graph.ts";

export function computeTopologicalOrder(graph: DagGraph): string[] {
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

  return topologicalOrder;
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
