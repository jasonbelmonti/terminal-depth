import {
  GRAPH_SCENE_VERSION,
  type GraphScene,
} from "../packages/scene-contract/src/index.ts";
import {
  LayoutDagError,
  computeLayeredDagLayout,
} from "../packages/layout-dag/src/index.ts";
import { buildDagGraph } from "../packages/layout-dag/src/graph.ts";
import { computeDagLayers } from "../packages/layout-dag/src/layers.ts";
import { describe, expect, it } from "vitest";

type SceneNode = GraphScene["nodes"][number];
type SceneEdge = GraphScene["edges"][number];

function createScene(
  nodes: readonly SceneNode[],
  edges: readonly SceneEdge[],
): GraphScene {
  return {
    version: GRAPH_SCENE_VERSION,
    nodes,
    edges,
  };
}

function layerRecord(scene: GraphScene): Record<string, number> {
  const { layerByNodeId } = computeDagLayers(buildDagGraph(scene));

  return Object.fromEntries(layerByNodeId.entries());
}

describe("layout-dag layering", () => {
  it("assigns layers across a simple chain", () => {
    const scene = createScene(
      [
        { id: "node:c", label: "C" },
        { id: "node:a", label: "A" },
        { id: "node:b", label: "B" },
      ],
      [
        {
          id: "edge:b-c",
          source: "node:b",
          target: "node:c",
          kind: "dependency",
        },
        {
          id: "edge:a-b",
          source: "node:a",
          target: "node:b",
          kind: "dependency",
        },
      ],
    );
    const layers = computeDagLayers(buildDagGraph(scene));

    expect(layers.topologicalOrder).toEqual(["node:a", "node:b", "node:c"]);
    expect(Object.fromEntries(layers.layerByNodeId.entries())).toEqual({
      "node:a": 0,
      "node:b": 1,
      "node:c": 2,
    });
  });

  it("keeps layer assignment stable for equivalent input permutations", () => {
    const sceneA = createScene(
      [
        { id: "node:omega", label: "Omega" },
        { id: "node:alpha", label: "Alpha" },
        { id: "node:gamma", label: "Gamma" },
        { id: "node:beta", label: "Beta" },
      ],
      [
        {
          id: "edge:alpha-gamma",
          source: "node:alpha",
          target: "node:gamma",
          kind: "dependency",
        },
        {
          id: "edge:beta-omega",
          source: "node:beta",
          target: "node:omega",
          kind: "dependency",
        },
        {
          id: "edge:alpha-beta",
          source: "node:alpha",
          target: "node:beta",
          kind: "dependency",
        },
        {
          id: "edge:gamma-omega",
          source: "node:gamma",
          target: "node:omega",
          kind: "dependency",
        },
      ],
    );
    const sceneB = createScene(
      [...sceneA.nodes].reverse(),
      [...sceneA.edges].reverse(),
    );
    const layersA = computeDagLayers(buildDagGraph(sceneA));
    const layersB = computeDagLayers(buildDagGraph(sceneB));

    expect(layersA.topologicalOrder).toEqual([
      "node:alpha",
      "node:beta",
      "node:gamma",
      "node:omega",
    ]);
    expect(layersA.topologicalOrder).toEqual(layersB.topologicalOrder);
    expect(layerRecord(sceneA)).toEqual(layerRecord(sceneB));
    expect(Object.fromEntries(layersA.nodesByLayer.entries())).toEqual({
      0: ["node:alpha"],
      1: ["node:beta", "node:gamma"],
      2: ["node:omega"],
    });
  });

  it("rejects cyclic input through the public layout helper", () => {
    const scene = createScene(
      [
        { id: "node:a", label: "A" },
        { id: "node:b", label: "B" },
      ],
      [
        {
          id: "edge:a-b",
          source: "node:a",
          target: "node:b",
          kind: "dependency",
        },
        {
          id: "edge:b-a",
          source: "node:b",
          target: "node:a",
          kind: "dependency",
        },
      ],
    );

    expect(() => computeLayeredDagLayout(scene)).toThrowError(LayoutDagError);
    expect(() => computeLayeredDagLayout(scene)).toThrowError(
      /contains a cycle/i,
    );
  });

  it("returns the original scene for valid DAG input in the layering-only slice", () => {
    const scene = createScene(
      [
        { id: "node:a", label: "A" },
        { id: "node:b", label: "B" },
      ],
      [
        {
          id: "edge:a-b",
          source: "node:a",
          target: "node:b",
          kind: "dependency",
        },
      ],
    );

    expect(computeLayeredDagLayout(scene)).toBe(scene);
  });

  it("accepts an empty-string node id without corrupting cycle detection", () => {
    const scene = createScene(
      [
        { id: "", label: "Empty" },
        { id: "node:b", label: "B" },
      ],
      [
        {
          id: "edge:empty-b",
          source: "",
          target: "node:b",
          kind: "dependency",
        },
      ],
    );
    const layers = computeDagLayers(buildDagGraph(scene));

    expect(layers.topologicalOrder).toEqual(["", "node:b"]);
    expect(Object.fromEntries(layers.layerByNodeId.entries())).toEqual({
      "": 0,
      "node:b": 1,
    });
    expect(computeLayeredDagLayout(scene)).toBe(scene);
  });
});
