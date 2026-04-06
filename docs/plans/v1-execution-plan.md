# Terminal Depth v1 Execution Plan

Status: Approved execution plan for the first implementation slice

## Objective

Build `terminal-depth` as a standalone, reusable renderer for directed
execution graphs that uses a real 3D scene but visually reads like a terminal
or TUI. The first version must establish a durable `GraphScene` seam, a
browser-first rendering path, and a reference demo that proves the renderer can
stay cinematic without turning the graph into beautiful soup.

## Context / Constraints

- The renderer must be reusable from host applications without importing host
  domain types, Markdown issue schemas, Bun APIs, SQLite layouts, or HTTP
  internals.
- The hard seam is a versioned, JSON-serializable `GraphScene` contract.
- The renderer should accept precomputed positions, while this repo may also
  ship an optional deterministic DAG layout helper for convenience.
- The default visual model is constrained 2.5D, not unconstrained 3D physics.
- The default camera should be orthographic or very low-FOV perspective.
- The first-class embed target is browser canvas.
- The primary public API should be imperative TypeScript, not React-first.
- The initial repo topology should be a `pnpm` workspace monorepo.
- Use unlit or emissive materials. Avoid PBR, realistic shadows, and dramatic
  camera distortion.

## Materially verifiable success criteria

- [ ] A host application can pass a normalized `GraphScene` object to the
      renderer and get an interactive visualization without the renderer
      importing host-specific issue types.
- [ ] The renderer supports a deterministic layered DAG view with semantic `z`
      placement and a stable default camera.
- [ ] The renderer includes a post-processing pipeline that makes the output
      feel terminal-like via palette quantization, dithering, glyph or
      cell-based treatment, and restrained CRT-style finishing passes.
- [ ] A demo scene shows nodes, edges, labels, clusters, active-path pulses,
      and depth-aware fog bands.
- [ ] The renderer can be embedded into a host repo with only a thin adapter
      from execution-graph data to `GraphScene`.

## Execution notes

- Use `pnpm` workspaces with the following initial topology:

```text
terminal-depth/
  apps/
    playground/
  packages/
    scene-contract/
    renderer-core/
    layout-dag/
    terminal-style/
  docs/
    design/
    plans/
```

- Use TypeScript + Vite + Three.js/WebGL2 for v1. Optimize for iteration speed
  and API clarity, not graphics maximalism.
- Keep `renderer-core` framework-agnostic. A React wrapper is out of scope for
  v1 unless a real consumer requires it.
- Put implementation work on task branches in `/.worktrees` during execution.
- Keep package boundaries intentional:
  - `scene-contract`: versioned scene schema, runtime validation, fixtures
  - `renderer-core`: scene setup, camera, interaction model, render loop
  - `layout-dag`: optional deterministic layout and routing helpers
  - `terminal-style`: palette, dithering, glyph, cell-snapping, finishing
    passes

## Public interfaces and defaults

### `scene-contract`

Define `graph-scene/v1` as the public host-facing contract.

Required surface:

- `GraphScene`
- `GraphSceneNode`
- `GraphSceneEdge`
- optional `GraphSceneCluster`
- optional `GraphSceneAnnotation`
- optional `GraphSceneCamera`
- optional `GraphSceneTheme`
- optional `GraphSceneLayoutHints`

Contract defaults:

- `version` is required and must equal `graph-scene/v1`.
- Node and edge IDs must be stable strings.
- Node `position` is optional so hosts can either provide layout or defer to
  the helper package.
- Edge `route` is optional and preserved when provided.
- Theme data is renderer-facing only. It must not carry host-domain semantics.
- Opaque `metadata` is allowed for host-owned experimentation but must not be
  required for core renderer behavior.

### `renderer-core`

Expose an imperative canvas API:

```ts
type GraphRenderer = {
  setScene(scene: GraphScene): void;
  resize(width: number, height: number): void;
  setFocus(target: FocusTarget | null): void;
  dispose(): void;
};

declare function createRenderer(
  canvas: HTMLCanvasElement,
  options?: RendererOptions,
): GraphRenderer;
```

Runtime defaults:

- Orthographic camera is the default mode.
- Perspective mode is optional and uses a low FOV.
- Hover reveals local neighborhood.
- Focus isolates a node, cluster, or path without changing the base layout.
- Free-orbit is not part of the default interaction model.

### `layout-dag`

Expose a pure helper API:

```ts
declare function computeLayeredDagLayout(
  scene: GraphScene,
  options?: LayoutOptions,
): GraphScene;
```

Layout rules:

- Preserve host-provided positions and routes.
- Compute only missing geometry.
- Use topological layering as the primary axis.
- Use sibling and cluster separation as the secondary axis.
- Use explicit semantic hints for `z` rather than simulated drift.
- Reject cyclic input with a clear error.

## Phase plan

### Phase 1: Contract, fixtures, and docs

- Bootstrap the workspace and package manifests.
- Implement `scene-contract` types and runtime validators.
- Add one benchmark fixture optimized for graph density.
- Add one hero fixture optimized for readability and cinematic styling.
- Write contract guidance for host-side adapters.

Acceptance gate:

- Fixtures serialize and parse deterministically.
- Validation rejects malformed IDs, invalid enums, and dangling references.
- A host can construct a valid `GraphScene` without importing anything from the
  sibling source repo.

### Phase 2: Layout helper and scene normalization

- Implement deterministic layered DAG layout in `layout-dag`.
- Add edge-routing support for missing routes.
- Add scene normalization in `renderer-core` to resolve defaults, derive camera
  framing, and derive cluster bounds.

Acceptance gate:

- Stable input produces stable output coordinates.
- Host-provided geometry remains unchanged.
- Default framing shows the graph from one readable resting angle.

### Phase 3: Renderer core and interaction model

- Build the Three.js scene layer with unlit or emissive materials.
- Render nodes, directed edges, labels, clusters, annotations, active-path
  pulses, and depth-aware fog bands.
- Implement disciplined interactions: pan, zoom, hover, click-to-focus, reset
  framing, and follow-active-path.

Acceptance gate:

- Benchmark and hero scenes render interactively in the browser.
- Focus and hover improve readability without destabilizing the scene.
- The default camera is sufficient to understand the graph without rotating it
  like a confused satellite operator.

### Phase 4: Terminal-style post-processing and polish

- Add the stylization pipeline in this order:
  1. low-resolution offscreen render target
  2. palette quantization
  3. dithering
  4. glyph or block-character mapping
  5. cell-grid snapping for labels and endpoints
  6. nearest-neighbor upscale
  7. restrained finishing passes
- Finishing passes may include subtle bloom, scanlines, light ghosting,
  quantized fog bands, posterized depth outlines, and very subtle CRT
  distortion.
- Explicitly avoid heavy chromatic aberration, strong barrel distortion,
  realistic shadows, and visual noise that harms label legibility.

Acceptance gate:

- The final render reads as terminal-like without obscuring graph semantics.
- Labels and line endpoints remain aligned to the character-cell grid.
- The stylized output remains readable on the benchmark scene.

## Test plan

- Contract tests:
  - valid scenes parse and round-trip
  - invalid scenes fail with actionable errors
  - benchmark and hero fixtures remain snapshot-stable
- Layout tests:
  - deterministic output for identical input
  - host-provided positions and routes are preserved
  - cycles are rejected with clear errors
- Renderer tests:
  - mount, update, resize, and dispose do not leak resources
  - focus and hover affect only the intended graph subset
  - optional fields fall back to defaults without crashing
- Visual smoke tests:
  - benchmark and hero fixtures produce stable screenshot baselines
  - theme presets remain distinct and legible
  - cell snapping survives resize and camera reset
- Integration proof:
  - include one documented adapter example showing
    `ExecutionGraphViewModel -> GraphScene`
  - the example must not import host storage, Markdown, Bun, or SQLite
    internals

## Assumptions and defaults

- Use `pnpm` as the workspace manager and Vite for the browser app.
- Use Three.js/WebGL2 for v1 rather than raw WebGL or WebGPU.
- Keep React out of the public runtime path for v1.
- Treat layout as a convenience package, not a renderer obligation.
- The host repo remains responsible for domain semantics, execution-state
  derivation, and the adapter into `GraphScene`.
