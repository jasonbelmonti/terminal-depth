# Terminal Depth v1 Execution Plan

Status: Approved execution plan for the first implementation slice

Companion docs:

- `docs/design/terminal-depth-style-manifesto.md` is the source of truth for
  aesthetic and behavioral direction.
- `docs/design/terminal-depth-renderer.md` is the source of truth for system
  architecture, ownership, and design constraints.

## Objective

Build `terminal-depth` as a renderer-first web TUI system for directed
execution graphs. The first version must establish a durable `GraphScene` seam,
a browser-first rendering path, and a usable shell in `apps/playground` that
proves the `Living Prompt` and `Ghost Ledger` direction without turning the
graph into beautiful soup.

## Context / Constraints

- The renderer must be reusable from host applications without importing host
  domain types, Markdown issue schemas, Bun APIs, SQLite layouts, or HTTP
  internals.
- The hard seam is a versioned, JSON-serializable `GraphScene` contract.
- The renderer should accept precomputed positions, while this repo may also
  ship an optional deterministic DAG layout helper for convenience.
- The default visual model is constrained 2.5D, not unconstrained 3D physics.
- The default camera should be orthographic or very low-FOV perspective.
- The first-class embed target is browser canvas composed inside a browser shell.
- The primary public API should be imperative TypeScript, not React-first.
- The initial repo topology should be a `pnpm` workspace monorepo.
- Keep `renderer-core` framework-agnostic. The shell is first-class for v1, but
  no new public shell API is part of this slice.
- Use unlit or emissive materials. Avoid PBR, realistic shadows, and dramatic
  camera distortion.

## Materially verifiable success criteria

- [ ] A host application can pass a normalized `GraphScene` object to the
      renderer and get an interactive visualization inside a browser-first web
      TUI shell without the renderer importing host-specific issue types.
- [ ] The renderer supports a deterministic layered DAG view with semantic `z`
      placement and a stable default camera.
- [ ] The v1 shell proves `Living Prompt` and `Ghost Ledger` through prompt
      state, inspection surfaces, fixture switching, and focus flows that aid
      graph comprehension.
- [ ] The renderer includes a post-processing pipeline that makes the combined
      shell and scene feel terminal-like via palette quantization, dithering,
      glyph or cell-based treatment, and restrained CRT-style finishing passes.
- [ ] A proving-ground app shows benchmark and hero scenes, shell controls, and
      scene behavior together so quality, readability, and interaction can be
      judged as one system.

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
  - `apps/playground`: browser-first web TUI shell, scene switching, prompt
    state, and inspection surfaces for manual review

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
- v1 does not add shell structure to the public scene schema.

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
- Shell composition lives above this API and is proved in `apps/playground`
  rather than exposed as a new public runtime surface.

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
- Support default framing and shell overlays by leaving the scene readable from
  a stable resting view.

### Browser shell proving ground

`apps/playground` is part of the v1 delivery surface, but it is not a new
public package API.

Runtime defaults:

- Prompt and control surfaces communicate current scene, mode, and focus.
- Inspector panes reveal selected graph state without inventing host-domain
  semantics.
- Benchmark and hero fixture switching is built in for manual review.
- Pointer and keyboard flows reinforce inspection without becoming a second UI
  language disconnected from the renderer.

## Phase plan

### Phase 1: Contract, fixtures, and docs

- Bootstrap the workspace and package manifests.
- Implement `scene-contract` types and runtime validators.
- Add one benchmark fixture optimized for graph density.
- Add one hero fixture optimized as the `Living Prompt` / `Ghost Ledger`
  reference scene for later shell review.
- Write contract guidance and shell-composition guidance for host-side adapters.

Acceptance gate:

- Fixtures serialize and parse deterministically.
- Validation rejects malformed IDs, invalid enums, and dangling references.
- Benchmark and hero scenes cover materially different graph and shell-level
  reading needs.
- A host can construct a valid `GraphScene` without importing anything from the
  sibling source repo.

### Phase 2: Layout helper and scene normalization

- Implement deterministic layered DAG layout in `layout-dag`.
- Add edge-routing support for missing routes.
- Add scene normalization in `renderer-core` to resolve defaults, derive camera
  framing, and derive cluster bounds.
- Tune the resting view so ledger-like inspection and prompt-like focus work
  from one readable angle.

Acceptance gate:

- Stable input produces stable output coordinates.
- Host-provided geometry remains unchanged.
- Default framing shows the graph from one readable resting angle.
- Default framing leaves enough room for shell overlays without collapsing
  graph comprehension.

### Phase 3: Renderer core and web TUI shell

- Build the Three.js scene layer with unlit or emissive materials.
- Render nodes, directed edges, labels, clusters, annotations, active-path
  pulses, and depth-aware fog bands.
- Implement disciplined interactions: pan, zoom, hover, click-to-focus, reset
  framing, and follow-active-path.
- Wire the renderer into a browser-first shell in `apps/playground` with prompt
  state, scene switching, inspector panes, and keyboard/mouse focus flows.

Acceptance gate:

- Benchmark and hero scenes render interactively in the browser shell.
- Focus, hover, and shell inspection surfaces improve readability without
  destabilizing the scene.
- The default camera is sufficient to understand the graph without rotating it
  like a confused satellite operator.
- The shell feels like a usable instrument, not a decorative wrapper.

### Phase 4: Terminal-style post-processing and shell polish

- Add the stylization pipeline in this order:
  1. low-resolution offscreen render target
  2. palette quantization
  3. dithering
  4. glyph or block-character mapping
  5. cell-grid snapping for labels and endpoints
  6. nearest-neighbor upscale
  7. restrained finishing passes
- Align shell palette, prompt surfaces, and overlays with the same terminal
  treatment without introducing a separate visual language.
- Finishing passes may include subtle bloom, scanlines, light ghosting,
  quantized fog bands, posterized depth outlines, and very subtle CRT
  distortion.
- Explicitly avoid heavy chromatic aberration, strong barrel distortion,
  realistic shadows, and visual noise that harms label legibility.

Acceptance gate:

- The final shell-plus-scene render reads as terminal-like without obscuring
  graph semantics.
- Labels and line endpoints remain aligned to the character-cell grid.
- The stylized output remains readable on the benchmark scene.
- Screenshot baselines are meaningful at the combined shell and scene level,
  not only on the raw canvas.

## Test plan

- Contract tests:
  - valid scenes parse and round-trip
  - invalid scenes fail with actionable errors
  - benchmark and hero fixtures remain snapshot-stable
- Layout tests:
  - deterministic output for identical input
  - host-provided positions and routes are preserved
  - cycles are rejected with clear errors
  - default framing remains readable with shell overlays in the proving ground
- Renderer tests:
  - mount, update, resize, and dispose do not leak resources
  - focus and hover affect only the intended graph subset
  - optional fields fall back to defaults without crashing
- Shell smoke tests:
  - prompt/control surface reflects current scene, mode, and focus
  - fixture switching and reset flows remain predictable
  - inspector panes stay in sync with renderer focus state
- Visual smoke tests:
  - benchmark and hero fixtures produce stable shell-level screenshot baselines
  - theme presets remain distinct and legible across shell and scene together
  - cell snapping survives resize and camera reset
- Integration proof:
  - include one documented adapter example showing
    `ExecutionGraphViewModel -> GraphScene -> Renderer`
  - include shell-composition guidance that explains what stays host-owned
  - the example must not import host storage, Markdown, Bun, or SQLite
    internals

## Assumptions and defaults

- Use `pnpm` as the workspace manager and Vite for the browser app.
- Use Three.js/WebGL2 for v1 rather than raw WebGL or WebGPU.
- Keep React out of the public runtime path for v1.
- Treat layout as a convenience package, not a renderer obligation.
- Keep `apps/playground` as the initial shell proving ground rather than adding
  a new public package.
- The host repo remains responsible for domain semantics, execution-state
  derivation, and the adapter into `GraphScene`.
