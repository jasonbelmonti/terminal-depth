# Host Embedding and Shell Composition Guide

Status: Phase 1 host-side guide for mapping execution-graph data into
`GraphScene` and composing `terminal-depth` into a disciplined browser shell.

This note covers the host side of the seam. It is the companion to
`docs/contracts/graph-scene-v1.md`, which stays focused on the
`graph-scene/v1` contract itself.

## Recommended Seam

Keep the integration boundary narrow and explicit:

```text
Host graph query/index -> ExecutionGraphViewModel -> GraphScene -> Renderer
```

Recommended flow:

1. Query or derive host graph data.
2. Normalize that data into a host-local `ExecutionGraphViewModel`.
3. Map the view model into a `GraphScene`.
4. Validate and normalize the scene with `parseGraphScene`.
5. Pass the resulting scene to `@terminal-depth/renderer-core`.
6. Compose prompt state, filters, inspection panes, and navigation in the host
   shell above the renderer seam.

The adapter lives on the host side of the seam. `GraphScene` is the last
host-owned artifact that crosses into `terminal-depth`.

## Public Starting Surfaces

Only these packages should be treated as public starting points for host
integration:

- `@terminal-depth/scene-contract`
  - `GRAPH_SCENE_VERSION`
  - `parseGraphScene`
  - `GraphScene` and related contract types
- `@terminal-depth/renderer-core`
  - `createRenderer`
  - `GraphRenderer`
  - `FocusTarget`

`@terminal-depth/playground` is a proving ground for shell composition. It is
useful as a reference, but it is not a public shell API and should not be
imported by hosts.

The current renderer seam is intentionally small:

```ts
import type { GraphScene } from "@terminal-depth/scene-contract";

export interface RendererOptions {}

export interface FocusTarget {
  readonly id: string;
  readonly kind: "cluster" | "node" | "path";
}

export interface GraphRenderer {
  setScene(scene: GraphScene): void;
  resize(width: number, height: number): void;
  setFocus(target: FocusTarget | null): void;
  dispose(): void;
}

export function createRenderer(
  canvas: HTMLCanvasElement,
  options?: RendererOptions,
): GraphRenderer;
```

That is the seam. Shell composition happens around it, not through a higher
level `terminal-depth` shell package.

## Responsibilities By Layer

| Layer | Owns | Must not own |
| --- | --- | --- |
| Host graph query / index | Domain semantics, graph relationships, execution state, host storage, transport, navigation targets | Renderer setup, camera rules, shell chrome inside `terminal-depth` |
| `ExecutionGraphViewModel` | Stable host-local projection for labels, states, grouping, emphasis, optional geometry hints, and renderer-ready roles | Raw storage concerns, Markdown parsing, renderer internals |
| `GraphScene` | Versioned scene payload, nodes, edges, clusters, annotations, camera, theme, and layout hints | Prompt text, panes, route state, host actions, dashboard layout |
| `@terminal-depth/renderer-core` | Canvas renderer lifecycle, scene updates, focus application, resize, disposal | Host routing, host filters, inspection panes, storage, transport |
| Host shell | Prompt state, filters, selection, inspection panes, keyboard shortcuts, URL state, route-to-host semantics | Renderer implementation details, host-domain logic inside `terminal-depth` |

Keep `GraphScene` renderer-readable and host-agnostic. If a field is only
needed to open a host route, populate a host-side lookup keyed by stable scene
IDs instead of teaching the renderer about routing.

## Thin Adapter Example

The host should perform any graph querying, projection, filtering, and
navigation lookup before it reaches `terminal-depth`.

```ts
import {
  GRAPH_SCENE_VERSION,
  parseGraphScene,
  type GraphScene,
} from "@terminal-depth/scene-contract";

type Vector3 = {
  readonly x: number;
  readonly y: number;
  readonly z: number;
};

type ExecutionNodeViewModel = {
  readonly id: string;
  readonly title: string;
  readonly state: "idle" | "active" | "blocked" | "done";
  readonly lane: "prompt" | "ledger" | "focus" | "review";
  readonly clusterId?: string;
  readonly emphasis?: number;
  readonly position?: Vector3;
};

type ExecutionEdgeViewModel = {
  readonly id: string;
  readonly source: string;
  readonly target: string;
  readonly kind: "dependency" | "related";
  readonly state?: "idle" | "active" | "blocked";
  readonly route?: readonly Vector3[];
  readonly critical?: boolean;
};

type ExecutionClusterViewModel = {
  readonly id: string;
  readonly label: string;
  readonly colorRole?: string;
  readonly boundsHint?: {
    readonly x: number;
    readonly y: number;
    readonly z: number;
    readonly w: number;
    readonly h: number;
    readonly d: number;
  };
};

type ExecutionGraphViewModel = {
  readonly nodes: readonly ExecutionNodeViewModel[];
  readonly edges: readonly ExecutionEdgeViewModel[];
  readonly clusters: readonly ExecutionClusterViewModel[];
};

export function toGraphScene(
  viewModel: ExecutionGraphViewModel,
): GraphScene {
  const positionsProvided = viewModel.nodes.every((node) => node.position);
  const routesProvided = viewModel.edges.every(
    (edge) => edge.route && edge.route.length > 0,
  );

  return parseGraphScene({
    version: GRAPH_SCENE_VERSION,
    nodes: viewModel.nodes.map((node) => ({
      id: node.id,
      label: node.title,
      position: node.position,
      state: node.state,
      clusterId: node.clusterId,
      emphasis: node.emphasis,
      colorRole: node.state === "blocked" ? "ledger-blocked" : node.lane,
      glyphRole: node.lane,
      metadata: { lane: node.lane },
    })),
    edges: viewModel.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      kind: edge.kind,
      state: edge.state,
      route: edge.route,
      colorRole: edge.critical ? "critical-path" : edge.kind,
      pulse: edge.state === "active" ? 0.8 : undefined,
    })),
    clusters: viewModel.clusters.map((cluster) => ({
      id: cluster.id,
      label: cluster.label,
      colorRole: cluster.colorRole,
      boundsHint: cluster.boundsHint,
    })),
    theme: {
      palette: "green-phosphor",
      postprocessPreset: "shell-default",
    },
    layoutHints: {
      positions: positionsProvided ? "provided" : "auto",
      routes: routesProvided ? "provided" : "auto",
    },
  });
}
```

Important details:

- The host-local `ExecutionGraphViewModel` is where execution semantics live.
- `toGraphScene` converts those semantics into renderer-facing labels, roles,
  state, emphasis, and optional geometry.
- `parseGraphScene` is the adapter boundary. Use it to reject malformed host
  output before the scene reaches the renderer.
- The mapping example imports only `@terminal-depth/scene-contract`. It does
  not pull in sibling-repo Markdown, storage, Bun, or SQLite internals.

Once the host has a `GraphScene`, mounting the renderer should stay thin:

```ts
import {
  createRenderer,
  type FocusTarget,
} from "@terminal-depth/renderer-core";
import type { GraphScene } from "@terminal-depth/scene-contract";

export function mountGraphScene(args: {
  readonly canvas: HTMLCanvasElement;
  readonly viewport: HTMLElement;
  readonly scene: GraphScene;
  readonly focusTarget: FocusTarget | null;
}) {
  const renderer = createRenderer(args.canvas);

  const applyFrame = (scene: GraphScene, focusTarget: FocusTarget | null) => {
    renderer.setScene(scene);
    renderer.setFocus(focusTarget);
  };

  const resizeObserver = new ResizeObserver((entries) => {
    const frame = entries.at(0);

    if (!frame) {
      return;
    }

    renderer.resize(
      Math.max(1, Math.floor(frame.contentRect.width)),
      Math.max(1, Math.floor(frame.contentRect.height)),
    );
  });

  resizeObserver.observe(args.viewport);
  applyFrame(args.scene, args.focusTarget);

  return {
    update(scene: GraphScene, focusTarget: FocusTarget | null) {
      applyFrame(scene, focusTarget);
    },
    dispose() {
      resizeObserver.disconnect();
      renderer.dispose();
    },
  };
}
```

This host-side wrapper is intentionally ordinary. It proves the intended seam
without inventing a reusable public shell API.

## Host-Owned Shell Composition

The shell sits above the renderer seam. Keep these concerns host-owned:

- prompt text and mode indicators
- scene selection and scene switching
- filter state and any filtered graph projection
- focus source-of-truth and selection state
- inspection panes, sidebars, and detail views
- keyboard shortcuts and route state
- route-to-host semantics such as opening a task, issue, or execution record

In practice:

- Derive a filtered `ExecutionGraphViewModel` in the host before calling
  `toGraphScene`.
- Translate host selection into a renderer `FocusTarget` before calling
  `setFocus`.
- Keep any host navigation lookup in a host-side map keyed by scene IDs.
- Treat the renderer as a scene surface, not as the owner of host workflows.

## Shell Discipline Rules

The host shell should borrow the behavior proven by the manifesto and renderer
note without drifting into generic dashboard chrome:

- Keep the prompt visible as the primary mode and context surface.
- Let the graph remain the main body, with supporting panes that clarify rather
  than compete with it.
- Prefer one stable resting view over orbit-heavy exploration.
- Use filters, focus, and inspection to reveal structure instead of adding more
  widgets.
- Keep shell copy, labels, and controls sparse enough to feel like prompt state
  and ledger state, not product marketing.

`Living Prompt` means the shell should read like the terminal acknowledging
current mode, scene, and focus. `Ghost Ledger` means panes, traces, and details
should feel indexed and inspectable, not ornamental.

## Avoid Coupling Traps

Do not:

- import `apps/playground` as though it were a reusable host shell package
- push prompt text, pane state, route state, or host actions into `GraphScene`
- require the renderer to know about Markdown files, Bun APIs, SQLite tables,
  or sibling-repo storage layouts
- depend on opaque `metadata` for core renderer behavior
- add dashboard-style chrome that buries the graph under controls

If the future `markdown-issue-spec` adapter follows this shape, it can stay
thin, verifiable, and reusable while still composing a shell with real
discipline above the renderer seam.
