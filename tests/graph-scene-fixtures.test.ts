import { parseGraphScene } from "../packages/scene-contract/src/index.ts";
import { BENCHMARK_GRAPH_SCENE_FIXTURE } from "../packages/scene-contract/src/fixtures/index.ts";
import { describe, expect, it } from "vitest";

const fixture = BENCHMARK_GRAPH_SCENE_FIXTURE;

function countNodeDegrees(
  nodeId: string,
): { readonly indegree: number; readonly outdegree: number } {
  const indegree = fixture.edges.filter(
    (edge) => edge.target === nodeId,
  ).length;
  const outdegree = fixture.edges.filter(
    (edge) => edge.source === nodeId,
  ).length;

  return { indegree, outdegree };
}

describe("graph scene fixtures", () => {
  it("round-trips the benchmark fixture deterministically", () => {
    const serialized = JSON.stringify(fixture);
    const reparsed = parseGraphScene(JSON.parse(serialized));

    expect(reparsed).toEqual(fixture);
  });

  it("keeps the benchmark fixture materially dense", () => {
    const routePlannerDegrees = countNodeDegrees("node:plan:route");
    const priorityRankDegrees = countNodeDegrees("node:plan:rank");
    const reviewBufferDegrees = countNodeDegrees("node:ship:review");
    const routedEdges = fixture.edges.filter(
      (edge) => edge.route && edge.route.length >= 3,
    );

    expect(fixture.nodes).toHaveLength(14);
    expect(fixture.edges).toHaveLength(27);
    expect(fixture.clusters).toHaveLength(4);
    expect(fixture.annotations).toHaveLength(3);
    expect(routedEdges).toHaveLength(fixture.edges.length);
    expect(routePlannerDegrees.indegree).toBeGreaterThanOrEqual(4);
    expect(priorityRankDegrees.indegree).toBeGreaterThanOrEqual(3);
    expect(priorityRankDegrees.outdegree).toBeGreaterThanOrEqual(3);
    expect(reviewBufferDegrees.indegree).toBeGreaterThanOrEqual(3);
  });
});
