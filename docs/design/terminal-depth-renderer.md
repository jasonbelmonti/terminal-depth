# Terminal Depth Renderer

Status: Seed design note for the `terminal-depth` renderer project

## Objective

Build a standalone renderer for directed execution graphs that uses a real 3D
scene but visually reads like a terminal or TUI. The goal is to get cinematic,
high-signal graph exploration without sacrificing legibility, semantic
structure, or reuse.

This project should be reusable from external host applications, starting with
the sibling `markdown-issue-spec` repository.

## Context / Constraints

- The primary integration target is the sibling `markdown-issue-spec`
  repository, which currently defines graph semantics, modeling guidance, and
  an API-first system plan. UI is explicitly not part of its first milestone.
- `terminal-depth` should be reusable without depending on a host's Markdown
  issue format, Bun server internals, or SQLite schema.
- The design should favor constrained 2.5D rather than unconstrained 3D graph
  physics.
- The resting view must remain readable from one stable camera angle.
- Realistic lighting is a non-goal. Terminal vibes hate physically based
  rendering.

## Materially verifiable success criteria

- [ ] A host application can pass a versioned `GraphScene` object to the
      renderer and get an interactive visualization without the renderer
      importing host-specific issue types.
- [ ] The default layout is deterministic, DAG-friendly, and readable from a
      stable camera without requiring a free-orbit camera to understand the
      graph.
- [ ] The visual pipeline uses low-resolution offscreen rendering,
      quantization, dithering, glyph treatment, cell-grid snapping, and subtle
      finishing passes to produce a TUI-like look.
- [ ] The renderer can be integrated into `markdown-issue-spec` with a thin
      adapter from execution-graph data to `GraphScene`.
- [ ] The project includes a demo scene and a benchmark scene so quality and
      performance can be judged independently.

## Execution notes

- Treat this project as the source of truth for the renderer and the scene
  contract.
- Keep the hard seam at `GraphScene`, not at raw issue files and not at final
  pixels.
- Allow layout to be owned either by the host application or by an optional
  helper package in this project.
- Start web-first for speed of iteration and flexible embedding.
- Do not let the graph become beautiful soup.

## 1. Design Summary

The renderer should not be "a 3D graph toy." It should be a constrained graph
display system with these defaults:

- Use a deterministic layered DAG layout for the base structure.
- Reserve `z` for semantic meaning such as hierarchy depth, execution phase,
  criticality, or cluster grouping.
- Use an orthographic camera or very low-field-of-view perspective by default.
- Support orbit, focus, and inspection interactions, but keep the default view
  disciplined and legible.
- Render a real 3D scene, then stylize it through a fake-terminal pipeline.

The result should feel like a terminal hallucinating depth rather than a game
engine pretending to be Jira.

## 2. Why This Should Be Its Own Project

Keeping this as a dedicated renderer project is the cleanest path for a few
reasons:

- Renderer iteration speed is different from spec and validation work.
- The rendering stack will likely accumulate GPU code, post-processing passes,
  fixtures, and design experiments that do not belong in a host repository.
- A stable scene contract makes the renderer reusable for other DAG-like
  systems later.
- Keeping the boundary clean reduces the risk that a host application
  accidentally grows a tightly coupled UI subsystem before its server and
  graph-query layers are mature.

## 3. Recommended Seam

The hard seam should be a versioned scene contract:

`ExecutionGraphViewModel -> GraphScene -> Renderer`

Host applications should own domain semantics and derived execution state.
`terminal-depth` should own scene rendering and visual treatment.

Recommended mapping flow:

```mermaid
flowchart LR
  A["Host graph model / index"] --> B["Execution graph query layer"]
  B --> C["ExecutionGraphViewModel"]
  C --> D["GraphScene adapter"]
  D --> E["Terminal Depth renderer"]
```

Responsibilities by side of the seam:

### Host application owns

- Domain semantics and validation
- Graph relationships such as dependencies, hierarchy, and related links
- Derived execution state such as blocked, ready, active, done, critical path,
  and grouping hints
- Optional layout hints or precomputed positions if desired

### `terminal-depth` owns

- Camera model
- Scene graph
- Rendering backend
- Post-processing passes
- Glyph and cell-grid treatment
- Terminal-like palette treatment
- Interaction model for focus, hover, and navigation

### Shared contract owns

- A versioned scene schema
- Stable semantics for nodes, edges, clusters, themes, and emphasis
- Enough metadata to render a scene without understanding the host domain model

## 4. Scene Contract

The first public contract should be JSON-serializable and versioned. It should
be expressive enough for rendering, but small enough to remain stable.

```ts
export type GraphScene = {
  version: "graph-scene/v1";
  nodes: GraphSceneNode[];
  edges: GraphSceneEdge[];
  clusters?: GraphSceneCluster[];
  camera?: GraphSceneCamera;
  theme?: GraphSceneTheme;
  annotations?: GraphSceneAnnotation[];
};

export type GraphSceneNode = {
  id: string;
  label: string;
  position: { x: number; y: number; z: number };
  size?: number;
  state?: "idle" | "active" | "blocked" | "done";
  colorRole?: string;
  glyphRole?: string;
  emphasis?: number;
  clusterId?: string;
  metadata?: Record<string, string | number | boolean>;
};

export type GraphSceneEdge = {
  id: string;
  source: string;
  target: string;
  kind: string;
  state?: "idle" | "active" | "blocked";
  colorRole?: string;
  pulse?: number;
  route?: Array<{ x: number; y: number; z: number }>;
};

export type GraphSceneCluster = {
  id: string;
  label: string;
  boundsHint?: { x: number; y: number; z: number; w: number; h: number; d: number };
  colorRole?: string;
};

export type GraphSceneCamera = {
  mode: "orthographic" | "perspective";
  fov?: number;
  position: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
};

export type GraphSceneTheme = {
  palette: "ansi" | "green-phosphor" | "amber" | "custom";
  cellSize?: { cols: number; rows: number };
  postprocessPreset?: string;
};

export type GraphSceneAnnotation = {
  id: string;
  label: string;
  anchorNodeId?: string;
  position?: { x: number; y: number; z: number };
};
```

Contract guidance:

- Positions are allowed to be precomputed by the host.
- Layout helpers may exist in this project, but rendering should not require
  the renderer to understand the host's issue semantics.
- `metadata` is allowed for local experimentation, but the renderer should only
  rely on documented fields for public behavior.
- New contract versions should be additive when possible.

## 5. Layout Model

The default layout strategy should be deterministic and DAG-aware.

### Base rules

- Primary axis should represent execution order or topological progression.
- Secondary axis should separate siblings, branches, or clusters.
- `z` should represent semantic depth rather than arbitrary spatial drift.

### Good candidates for semantic `z`

- Hierarchy depth
- Execution phase
- Criticality
- Cluster grouping
- Confidence or certainty bands

### Layout principles

- Stable input should produce stable output.
- Adjacent layers should minimize edge crossings.
- Long dependency chains should read clearly without deep camera movement.
- Multi-parent nodes should remain readable even if they bridge clusters.
- Cluster boundaries should be explicit without turning into giant boxes
  everywhere.

Force simulation can exist as an optional experimental mode, but it should not
be the default. The default should be deterministic and explainable.

## 6. Camera and Interaction Model

Default camera behavior matters because it determines whether the scene reads
like an instrument panel or a space screensaver.

Recommended defaults:

- Orthographic camera first
- Perspective only as a low-FOV option
- Stable overview framing
- Smooth focus and pan transitions
- Optional orbit for inspection
- Recenter and "follow active path" affordances

Interaction goals:

- Hover should reveal identity and local neighborhood.
- Focus should isolate a node, path, cluster, or subgraph.
- Filtering should hide noise before the user reaches for freeform camera
  movement.
- The user should not need to constantly rotate the scene to understand it.

## 7. Rendering Pipeline

The TUI-like treatment should come from the render pipeline, not from drawing
flat fake terminal widgets in 2D.

Recommended pipeline:

1. Normalize scene data and resolve defaults.
2. Compute or apply positions and routes.
3. Render the 3D scene into a low-resolution offscreen buffer.
4. Quantize the image into an ANSI-like or phosphor-inspired palette.
5. Apply ordered dithering or error diffusion.
6. Generate a glyph or block-character representation from luminance, edges,
   and depth.
7. Snap labels and line endpoints to a character-cell grid in the final
   compositing stage.
8. Upscale using nearest-neighbor or similarly crisp sampling.
9. Apply restrained finishing passes.

Recommended finishing passes:

- Subtle bloom for emissive edges and active nodes
- Scanlines
- Light ghosting or temporal persistence
- Depth-aware fog quantized into bands
- Posterized depth outlines
- Very subtle CRT-like barrel distortion

Avoid:

- Heavy chromatic aberration
- Film-grain overload
- Dramatic perspective distortion
- Physically based materials
- Dense drop shadows and realistic lighting

## 8. Visual Language

The visual system should feel intentional and instrument-like.

Recommended style directions:

- Unlit or emissive materials
- Strong silhouette and contrast
- Small, deliberate color vocabulary
- Character-cell logic that influences the final image even when the scene is
  still technically 3D
- Motion used to reveal state, not to decorate

Good motion candidates:

- Pulses moving along active edges
- Slow temporal persistence on recent execution paths
- Cluster emphasis on focus
- Brief reveal sweeps when filters change

## 9. Package Boundaries

A clean standalone project might look like this:

```text
terminal-depth/
  packages/
    scene-contract/
    renderer-core/
    layout-dag/
    terminal-style/
  apps/
    playground/
    benchmark/
  docs/
    design/
      terminal-depth-renderer.md
```

Recommended ownership:

- `scene-contract`: public types, versioned schemas, fixtures
- `renderer-core`: scene setup, camera, render loop, interactions
- `layout-dag`: optional deterministic layout helpers
- `terminal-style`: quantization, dithering, glyph pass, finishing passes
- `playground`: developer-facing demo app
- `benchmark`: repeatable performance and image-quality scenes

Only `scene-contract` and `renderer-core` need to be treated as truly public at
the start.

## 10. Integration Into `markdown-issue-spec`

The first host integration target should consume `terminal-depth` through a
thin adapter.

Recommended integration shape:

1. Query or derive the execution graph from the host server/index layer.
2. Normalize the result into an `ExecutionGraphViewModel`.
3. Map that view model into `GraphScene`.
4. Pass `GraphScene` to `terminal-depth`.

The adapter should live on the host application's side of the seam.

Possible future touch points in `markdown-issue-spec`:

- A graph query layer under `server/core/graph/`
- A route or transport adapter that can return graph data for visualization
- A host-side adapter that maps execution state to `GraphScene`

Important rule:

`terminal-depth` must not need to know what Markdown frontmatter is, what an
`IssueEnvelope` is, or how the local index is stored.

## 11. Bootstrap Plan

Recommended sequence:

### Phase 1: Contract and fixtures

- Define `graph-scene/v1`
- Create a small set of canonical fixture scenes
- Decide the baseline theme preset

### Phase 2: Core renderer

- Render nodes, edges, labels, and focus interactions
- Support deterministic precomputed positions
- Establish camera behavior and scene framing

### Phase 3: Terminal treatment

- Add low-resolution offscreen rendering
- Add palette quantization
- Add dithering
- Add glyph treatment
- Add cell snapping
- Add finishing passes

### Phase 4: Integration path

- Build a host-side adapter in `markdown-issue-spec`
- Validate that the same scene contract can drive both a playground scene and a
  real execution graph
- Tune defaults based on real graph density and label length

## 12. Bootstrap Prompt

Use the following as a seed prompt when starting implementation:

```md
Build a standalone web-first renderer for directed execution graphs that uses a
real 3D scene but visually reads like a terminal or TUI.

Constraints:
- Use constrained 2.5D, not unconstrained 3D graph physics.
- Base layout should be deterministic and DAG-friendly.
- Reserve `z` for semantic meaning such as hierarchy depth, execution phase,
  criticality, or cluster grouping.
- Default camera should be orthographic or very low-FOV perspective.
- Use a real 3D scene followed by a fake-terminal render pipeline.
- Use unlit or emissive materials, not physically based rendering.

Required seam:
- The renderer must consume a versioned, JSON-serializable `GraphScene`
  contract.
- The renderer must not depend on the host application's issue schema,
  Markdown storage, or server internals.

Required capabilities:
- Render nodes, edges, labels, clusters, and annotations
- Support host-provided positions and optional internal layout helpers
- Render through a low-resolution offscreen buffer
- Apply palette quantization and dithering
- Apply glyph or block-character treatment
- Snap labels and line endpoints to a character-cell grid
- Upscale crisply and apply restrained finishing passes such as bloom,
  scanlines, light ghosting, depth-banded fog, and posterized depth outlines
- Support focus, hover, filtering, and active-path highlighting

Deliverables:
- Public `graph-scene/v1` contract
- Renderer core package
- Terminal-style post-processing package
- Playground app with one benchmark scene and one hero scene
- Short integration guide for embedding the renderer into a host execution-graph
  application
```

## 13. Integration References

Useful context in the sibling `markdown-issue-spec` repository:

- `../markdown-issue-spec/docs/spec.md`
- `../markdown-issue-spec/docs/modeling.md`
- `../markdown-issue-spec/docs/plans/agent-first-mvp.md`
