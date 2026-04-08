import {
  GRAPH_SCENE_VERSION,
  GraphSceneValidationError,
  parseGraphScene,
  type GraphScene,
  type GraphSceneValidationIssue,
} from "../packages/scene-contract/src/index.ts";
import { describe, expect, it } from "vitest";

function expectValidationIssues(input: unknown): readonly GraphSceneValidationIssue[] {
  try {
    parseGraphScene(input);
  } catch (error) {
    expect(error).toBeInstanceOf(GraphSceneValidationError);
    return (error as GraphSceneValidationError).issues;
  }

  throw new Error("Expected parseGraphScene to throw.");
}

describe("graph scene contract", () => {
  it("parses the minimal valid scene and applies structural defaults", () => {
    const parsed = parseGraphScene({
      version: GRAPH_SCENE_VERSION,
      nodes: [],
      edges: [],
    });

    expect(parsed).toEqual({
      version: GRAPH_SCENE_VERSION,
      nodes: [],
      edges: [],
      clusters: [],
      annotations: [],
    } satisfies GraphScene);
    expect(parsed).not.toHaveProperty("camera");
    expect(parsed).not.toHaveProperty("theme");
    expect(parsed).not.toHaveProperty("layoutHints");
  });

  it("parses a populated scene and preserves provided geometry", () => {
    const route = [
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 2, z: 3 },
    ] as const;

    const parsed = parseGraphScene({
      version: GRAPH_SCENE_VERSION,
      nodes: [
        {
          id: "node:start",
          label: "Start",
          position: { x: 0, y: 1, z: 2 },
          state: "active",
          metadata: {
            critical: true,
            rank: 1,
            note: "entry",
            nullable: null,
          },
        },
        {
          id: "node:end",
          label: "End",
          clusterId: "cluster:main",
          emphasis: 0.5,
        },
      ],
      edges: [
        {
          id: "edge:start-end",
          source: "node:start",
          target: "node:end",
          kind: "dependency",
          state: "idle",
          route,
          metadata: { pulse: 1 },
        },
      ],
      clusters: [
        {
          id: "cluster:main",
          label: "Main",
          boundsHint: { x: 0, y: 0, z: 0, w: 10, h: 6, d: 2 },
          metadata: { visible: true },
        },
      ],
      annotations: [
        {
          id: "annotation:focus",
          label: "Focus",
          anchorNodeId: "node:start",
          metadata: { severity: "high" },
        },
        {
          id: "annotation:floating",
          label: "Floating",
          position: { x: 2, y: 3, z: 4 },
        },
      ],
      camera: {
        mode: "orthographic",
        position: { x: 5, y: 6, z: 7 },
        target: { x: 0, y: 0, z: 0 },
      },
      theme: {
        palette: "ansi",
        cellSize: { cols: 80, rows: 24 },
        postprocessPreset: "scanline-lite",
      },
      layoutHints: {
        positions: "provided",
        routes: "auto",
      },
    });

    expect(parsed.nodes[0]?.position).toEqual({ x: 0, y: 1, z: 2 });
    expect(parsed.edges[0]?.route).toEqual(route);
    expect(parsed.clusters).toHaveLength(1);
    expect(parsed.annotations).toHaveLength(2);
    expect(parsed.theme?.cellSize).toEqual({ cols: 80, rows: 24 });
    expect(parsed.layoutHints).toEqual({
      positions: "provided",
      routes: "auto",
    });
  });

  it("rejects invalid version and missing required arrays", () => {
    const issues = expectValidationIssues({
      version: "graph-scene/v0",
    });

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "invalid_version",
          path: "version",
        }),
        expect.objectContaining({
          code: "missing_required_field",
          path: "nodes",
        }),
        expect.objectContaining({
          code: "missing_required_field",
          path: "edges",
        }),
      ]),
    );
  });

  it("rejects malformed and duplicate identifiers", () => {
    const issues = expectValidationIssues({
      version: GRAPH_SCENE_VERSION,
      nodes: [
        { id: " node:start", label: "Start" },
        { id: "node:ok", label: "Ok" },
        { id: "node:ok", label: "Duplicate" },
      ],
      edges: [
        {
          id: "edge:one",
          source: "node:ok",
          target: "node:ok",
          kind: "dependency",
        },
        {
          id: "edge:one",
          source: "node:ok",
          target: "node:ok",
          kind: "dependency",
        },
      ],
    });

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "invalid_id",
          path: "nodes[0].id",
        }),
        expect.objectContaining({
          code: "duplicate_id",
          path: "nodes[2].id",
        }),
        expect.objectContaining({
          code: "duplicate_id",
          path: "edges[1].id",
        }),
      ]),
    );
  });

  it("rejects invalid enum values", () => {
    const issues = expectValidationIssues({
      version: GRAPH_SCENE_VERSION,
      nodes: [{ id: "node:start", label: "Start", state: "queued" }],
      edges: [
        {
          id: "edge:start-end",
          source: "node:start",
          target: "node:start",
          kind: "dependency",
          state: "done",
        },
      ],
      camera: {
        mode: "panorama",
        position: { x: 0, y: 0, z: 0 },
        target: { x: 0, y: 0, z: 0 },
      },
      theme: {
        palette: "violet",
      },
      layoutHints: {
        positions: "manual",
      },
    });

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "invalid_enum_value",
          path: "nodes[0].state",
        }),
        expect.objectContaining({
          code: "invalid_enum_value",
          path: "edges[0].state",
        }),
        expect.objectContaining({
          code: "invalid_enum_value",
          path: "camera.mode",
        }),
        expect.objectContaining({
          code: "invalid_enum_value",
          path: "theme.palette",
        }),
        expect.objectContaining({
          code: "invalid_enum_value",
          path: "layoutHints.positions",
        }),
      ]),
    );
  });

  it("rejects dangling references across edges, clusters, and annotations", () => {
    const issues = expectValidationIssues({
      version: GRAPH_SCENE_VERSION,
      nodes: [
        {
          id: "node:start",
          label: "Start",
          clusterId: "cluster:missing",
        },
      ],
      edges: [
        {
          id: "edge:start-end",
          source: "node:start",
          target: "node:missing",
          kind: "dependency",
        },
      ],
      annotations: [
        {
          id: "annotation:missing",
          label: "Missing",
          anchorNodeId: "node:missing",
        },
        {
          id: "annotation:empty",
          label: "Empty",
        },
      ],
    });

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "dangling_reference",
          path: "nodes[0].clusterId",
        }),
        expect.objectContaining({
          code: "dangling_reference",
          path: "edges[0].target",
        }),
        expect.objectContaining({
          code: "dangling_reference",
          path: "annotations[0].anchorNodeId",
        }),
        expect.objectContaining({
          code: "missing_required_field",
          path: "annotations[1]",
        }),
      ]),
    );
  });

  it("rejects invalid metadata and invalid structured values", () => {
    const issues = expectValidationIssues({
      version: GRAPH_SCENE_VERSION,
      nodes: [
        {
          id: "node:start",
          label: "Start",
          position: { x: 0, y: Number.NaN, z: 1 },
          metadata: { nested: { nope: true } },
        },
      ],
      edges: [
        {
          id: "edge:start-end",
          source: "node:start",
          target: "node:start",
          kind: "dependency",
          route: [{ x: 0, y: 0, z: Number.POSITIVE_INFINITY }],
        },
      ],
      clusters: [
        {
          id: "cluster:main",
          label: "Main",
          boundsHint: { x: 0, y: 0, z: 0, w: 1, h: "two", d: 3 },
        },
      ],
      theme: {
        palette: "ansi",
        cellSize: { cols: 0, rows: 24 },
      },
    });

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "nodes[0].position.y",
        }),
        expect.objectContaining({
          code: "invalid_metadata_value",
          path: "nodes[0].metadata.nested",
        }),
        expect.objectContaining({
          path: "edges[0].route[0].z",
        }),
        expect.objectContaining({
          path: "clusters[0].boundsHint.h",
        }),
        expect.objectContaining({
          code: "invalid_value",
          path: "theme.cellSize.cols",
        }),
      ]),
    );
  });
});
