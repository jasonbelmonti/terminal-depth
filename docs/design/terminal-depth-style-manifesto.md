# Terminal Depth Style Manifesto

Status: Companion style note for the `terminal-depth` renderer project

Use this note as the source of truth for aesthetic and behavioral intent.

Companion docs:

- `docs/design/terminal-depth-renderer.md` defines architecture, ownership, and
  the renderer-plus-shell system model.
- `docs/plans/v1-execution-plan.md` defines delivery order, acceptance gates,
  and verification scope.

## Core Sentiment

`terminal-depth` should feel like a terminal that has discovered an underworld.
It stays bare, textual, and operational, but gains spatial presence, semantic
depth, and a faint pulse of life. The goal is not to decorate the command line.
The goal is to reveal the structure that was already latent inside it.

This project should feel like a terminal hallucinating depth, not a game engine
pretending to be a dashboard. The scene can be cinematic, but it must remain
disciplined. The interface can be alive, but it must never become noisy,
nostalgic cosplay, or beautiful soup.

## Two Anchor Metaphors

### Living Prompt

The interface should feel like an expanded prompt state rather than a pile of
floating widgets. Focus, hover, navigation, and shell controls should read as
command-line operations gaining dimensional form. The prompt is not a
decorative motif. It is the behavioral model.

- State changes should feel like the system acknowledging input.
- Focus should feel like the terminal isolating the active thought.
- Reveals should feel like command output unfolding with intent.
- Motion should feel procedural, not theatrical.

### Ghost Ledger

The renderer should also feel like a living ledger of execution state. Graphs,
routes, labels, clusters, panes, and annotations should read like records,
traces, and dependencies being surfaced from somewhere below the screen. The
atmosphere can be spectral, but the semantics must stay exact.

- The scene should feel archived, indexed, and inspectable.
- Depth should clarify order, hierarchy, and causality.
- Pulses, fog bands, and route highlights should suggest activity without
  becoming visual chatter.
- The interface should feel haunted only in the sense that the system appears
  more awake than expected.

## Principles

- Text is the primary instrument. Geometry exists to support legibility and
  meaning, not to compete with labels.
- The grid is sacred. Cell logic, snapping, alignment, and spacing should
  remain visible even when the scene moves through depth.
- Depth is semantic. Use `z` to express hierarchy, grouping, execution phase,
  criticality, or emphasis rather than arbitrary spectacle.
- Motion is semantic. Animate state transitions, active paths, focus, and
  adjacency. Avoid motion that exists only to reassure itself that it is fancy.
- The camera is disciplined. The resting view should explain the graph without
  requiring orbit-driven archaeology.
- Glow is restrained. Emission, bloom, haze, and finishing passes should act
  like signal, not decoration.
- Surfaces should feel fabricated from terminal primitives: rules, brackets,
  blocks, cells, wires, prompts, panes, and traces.
- Negative space matters. The renderer and shell should leave room for the
  graph to breathe and for the user to think.

## Visual Language

- Prefer monospace-first typography with hard alignment and dense but readable
  hierarchy.
- Prefer low-color palettes such as phosphor green, amber, cold grayscale, or
  muted ANSI accents used sparingly.
- Prefer unlit or emissive materials over anything physically realistic.
- Prefer quantization, dithering, raster grit, cell snapping, and posterized
  depth over glossy surfaces or dramatic lighting.
- Prefer subtle fog bands, route pulses, scan residue, and edge glow over heavy
  distortion, chromatic effects, or ornamental particle noise.
- Prefer shell overlays and panes that feel continuous with the scene, not like
  a separate dashboard pasted on top.

## Failure Modes

- Do not build a sci-fi dashboard.
- Do not build a fake hacker terminal.
- Do not let effects obscure labels, routes, or graph structure.
- Do not confuse atmospheric ambiguity with semantic ambiguity.
- Do not turn depth into drift.
- Do not let shell chrome become more opinionated than the graph it is
  supposed to clarify.

## Translation To Implementation

When making design or rendering decisions, bias toward choices that make the
scene feel like a living prompt and a ghost ledger at the same time.

- If an effect adds mood but weakens graph readability, cut it.
- If depth does not explain something meaningful, flatten it.
- If motion does not communicate system state, remove it.
- If a panel, overlay, or annotation does not feel grounded in terminal logic,
  simplify it until it does.
- If the result starts looking expensive in a generic way, it is probably
  moving away from `terminal-depth`.

The intended result is austere, uncanny, and useful: a bare interface with
hidden dimensional life. The terminal has not been abandoned. It has simply
grown deeper. Somewhere, a shell prompt just discovered chiaroscuro and filed a
bug about it.
