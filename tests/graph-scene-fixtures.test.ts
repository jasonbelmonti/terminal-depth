import {
  parseGraphScene,
  type GraphScene,
} from "../packages/scene-contract/src/index.ts";
import {
  BENCHMARK_GRAPH_SCENE_FIXTURE,
  HERO_GRAPH_SCENE_FIXTURE,
} from "../packages/scene-contract/src/fixtures/index.ts";
import { describe, expect, it } from "vitest";

type CanonicalFixture = {
  readonly name: string;
  readonly scene: GraphScene;
};

const CANONICAL_FIXTURES: readonly CanonicalFixture[] = [
  {
    name: "benchmark",
    scene: BENCHMARK_GRAPH_SCENE_FIXTURE,
  },
  {
    name: "hero",
    scene: HERO_GRAPH_SCENE_FIXTURE,
  },
] as const;

function countNodeDegrees(
  scene: GraphScene,
  nodeId: string,
): { readonly indegree: number; readonly outdegree: number } {
  const indegree = scene.edges.filter(
    (edge) => edge.target === nodeId,
  ).length;
  const outdegree = scene.edges.filter(
    (edge) => edge.source === nodeId,
  ).length;

  return { indegree, outdegree };
}

function countNodesWithIndegreeAtLeast(
  scene: GraphScene,
  minimumIndegree: number,
): number {
  return scene.nodes.filter((node) => {
    return countNodeDegrees(scene, node.id).indegree >= minimumIndegree;
  }).length;
}

function countNodesMissingClusterAssignments(
  scene: GraphScene,
): number {
  return scene.nodes.filter((node) => !node.clusterId).length;
}

function countRoutedEdges(scene: GraphScene): number {
  return scene.edges.filter((edge) => edge.route && edge.route.length >= 3).length;
}

describe("graph scene fixtures", () => {
  for (const fixture of CANONICAL_FIXTURES) {
    it(`round-trips the ${fixture.name} fixture deterministically`, () => {
      const serialized = JSON.stringify(fixture.scene);
      const reparsed = parseGraphScene(JSON.parse(serialized));

      expect(reparsed).toEqual(fixture.scene);
    });
  }

  it("keeps the benchmark fixture materially dense", () => {
    const routePlannerDegrees = countNodeDegrees(
      BENCHMARK_GRAPH_SCENE_FIXTURE,
      "node:plan:route",
    );
    const priorityRankDegrees = countNodeDegrees(
      BENCHMARK_GRAPH_SCENE_FIXTURE,
      "node:plan:rank",
    );
    const reviewBufferDegrees = countNodeDegrees(
      BENCHMARK_GRAPH_SCENE_FIXTURE,
      "node:ship:review",
    );

    expect(BENCHMARK_GRAPH_SCENE_FIXTURE.nodes).toHaveLength(14);
    expect(BENCHMARK_GRAPH_SCENE_FIXTURE.edges).toHaveLength(27);
    expect(BENCHMARK_GRAPH_SCENE_FIXTURE.clusters).toHaveLength(4);
    expect(BENCHMARK_GRAPH_SCENE_FIXTURE.annotations).toHaveLength(3);
    expect(countRoutedEdges(BENCHMARK_GRAPH_SCENE_FIXTURE)).toBe(
      BENCHMARK_GRAPH_SCENE_FIXTURE.edges.length,
    );
    expect(routePlannerDegrees.indegree).toBeGreaterThanOrEqual(4);
    expect(priorityRankDegrees.indegree).toBeGreaterThanOrEqual(3);
    expect(priorityRankDegrees.outdegree).toBeGreaterThanOrEqual(3);
    expect(reviewBufferDegrees.indegree).toBeGreaterThanOrEqual(3);
  });

  it("keeps the hero fixture legible and cluster-driven", () => {
    const reviewSurfaceDegrees = countNodeDegrees(
      HERO_GRAPH_SCENE_FIXTURE,
      "node:review:review-surface",
    );
    const archiveTraceDegrees = countNodeDegrees(
      HERO_GRAPH_SCENE_FIXTURE,
      "node:review:archive-trace",
    );
    const blockedNodes = HERO_GRAPH_SCENE_FIXTURE.nodes.filter(
      (node) => node.state === "blocked",
    );

    expect(HERO_GRAPH_SCENE_FIXTURE.nodes).toHaveLength(9);
    expect(HERO_GRAPH_SCENE_FIXTURE.edges).toHaveLength(11);
    expect(HERO_GRAPH_SCENE_FIXTURE.clusters).toHaveLength(4);
    expect(HERO_GRAPH_SCENE_FIXTURE.annotations).toHaveLength(3);
    expect(countRoutedEdges(HERO_GRAPH_SCENE_FIXTURE)).toBe(
      HERO_GRAPH_SCENE_FIXTURE.edges.length,
    );
    expect(countNodesMissingClusterAssignments(HERO_GRAPH_SCENE_FIXTURE)).toBe(0);
    expect(blockedNodes).toHaveLength(1);
    expect(reviewSurfaceDegrees.indegree).toBe(2);
    expect(reviewSurfaceDegrees.outdegree).toBe(1);
    expect(archiveTraceDegrees.indegree).toBe(1);
    expect(archiveTraceDegrees.outdegree).toBe(0);
  });

  it("keeps the canonical fixtures materially distinct at the contract level", () => {
    const benchmarkDensity =
      BENCHMARK_GRAPH_SCENE_FIXTURE.edges.length /
      BENCHMARK_GRAPH_SCENE_FIXTURE.nodes.length;
    const heroDensity =
      HERO_GRAPH_SCENE_FIXTURE.edges.length / HERO_GRAPH_SCENE_FIXTURE.nodes.length;

    expect(BENCHMARK_GRAPH_SCENE_FIXTURE.nodes.length).toBeGreaterThan(
      HERO_GRAPH_SCENE_FIXTURE.nodes.length,
    );
    expect(BENCHMARK_GRAPH_SCENE_FIXTURE.edges.length).toBeGreaterThan(
      HERO_GRAPH_SCENE_FIXTURE.edges.length,
    );
    expect(benchmarkDensity).toBeGreaterThan(heroDensity);
    expect(
      countNodesWithIndegreeAtLeast(BENCHMARK_GRAPH_SCENE_FIXTURE, 3),
    ).toBeGreaterThan(countNodesWithIndegreeAtLeast(HERO_GRAPH_SCENE_FIXTURE, 3));
  });
});
