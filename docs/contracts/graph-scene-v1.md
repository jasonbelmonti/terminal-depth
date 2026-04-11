# `graph-scene/v1` Contract Note

`graph-scene/v1` is the public, host-facing scene seam for `terminal-depth`.
It is versioned, JSON-serializable, and intentionally small so hosts can build
scenes without importing renderer internals or domain-specific types.

Companion guide:

- `docs/contracts/host-embedding-and-shell-composition.md` covers the host-side
  adapter flow, renderer embedding, and shell composition above this seam.

## Required and Optional Fields

Required top-level fields:

- `version`
- `nodes`
- `edges`

Optional top-level fields:

- `clusters`
- `annotations`
- `camera`
- `theme`
- `layoutHints`

Entity-level notes:

- `GraphSceneNode.position` is optional.
- `GraphSceneEdge.route` is optional and preserved when valid.
- `GraphSceneAnnotation` must define `anchorNodeId` or `position`.
- `GraphSceneLayoutHints` is intentionally narrow in Phase 1 and supports only
  `positions` and `routes` strategy hints.

## Defaults Applied by `parseGraphScene`

`parseGraphScene(input)` validates unknown input and returns a normalized
`GraphScene`.

Current additive defaults:

- omitted `clusters` normalize to `[]`
- omitted `annotations` normalize to `[]`

Current non-defaults:

- node positions are not synthesized
- edge routes are not synthesized
- camera defaults are not synthesized
- theme defaults are not synthesized
- `layoutHints` remains omitted when absent

## Validation Behavior

`parseGraphScene` throws `GraphSceneValidationError` when validation fails.
Each error contains `issues`, where every issue includes:

- `code`
- `path`
- `message`

The validator currently rejects:

- a `version` value other than `graph-scene/v1`
- missing `nodes` or `edges` arrays
- malformed IDs
- duplicate IDs within a collection
- invalid enum values
- dangling edge, cluster, or annotation references
- malformed vectors, bounds hints, routes, camera coordinates, or theme cell
  sizes
- non-primitive metadata values

## Metadata and Non-Goals

Opaque `metadata` is allowed on nodes, edges, clusters, and annotations as a
flat record of primitive JSON values. Core renderer behavior must not depend on
undocumented metadata.

This contract does not depend on:

- renderer implementation internals
- `markdown-issue-spec` schemas
- Markdown parsing
- Bun APIs
- SQLite internals

Broader host-mapping and embedding guidance lives in
`docs/contracts/host-embedding-and-shell-composition.md`.
