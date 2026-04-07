# BEL-618 Workspace Smoke Validation

Validated on `2026-04-06 21:13:04 CDT` from commit
`3134560045548c0960d5d9e531fb881cbf6d7ce1` in the
`jasonbelmonti/bel-618-p11d-workspace-resolution-and-smoke-validation`
worktree.

## Scope

This validation is intentionally limited to workspace installation,
resolution, typecheck, build, and test smoke behavior for the Phase 1
bootstrap skeleton. It does not validate renderer behavior, visual
correctness, or `BEL-598` contract expansion work.

## Command results

| Command | Result | Notes |
| --- | --- | --- |
| `pnpm install` | Pass | Completed successfully. Reported a non-blocking `esbuild@0.27.7` ignored build-scripts warning. |
| `pnpm typecheck` | Pass | Root and workspace package typecheck commands completed successfully. |
| `pnpm build` | Pass | Root recursive build completed successfully. `apps/playground` produced a production Vite build. |
| `pnpm test` | Pass | Root Vitest smoke ran `tests/workspace-smoke.test.ts` and passed 2 assertions. The recursive package test phase still has no package-level `test` scripts to run. |
| `pnpm --filter @terminal-depth/playground exec node --input-type=module -e "import('@terminal-depth/renderer-core').then((m)=>console.log(typeof m.createRenderer)).catch((error)=>{console.error(error);process.exit(1)})"` | Pass | Printed `function`, confirming playground-path resolution for `@terminal-depth/renderer-core`. |
| `pnpm --filter @terminal-depth/playground exec node --input-type=module -e "import('@terminal-depth/scene-contract').then((m)=>console.log(m.GRAPH_SCENE_VERSION)).catch((error)=>{console.error(error);process.exit(1)})"` | Pass | Printed `graph-scene/v1`, confirming playground-path resolution for `@terminal-depth/scene-contract`. |

## No-React runtime-path check

The current bootstrap skeleton does not force React into the public runtime
path.

Evidence:

- `rg -n --hidden --glob '!node_modules/**' --glob '!.git/**' --glob '!apps/playground/dist/**' react`
  returned no matches in source or manifest files.
- `apps/playground/package.json` depends only on workspace packages.
- `packages/renderer-core/package.json` depends only on
  `@terminal-depth/scene-contract`.
- `packages/scene-contract/package.json` has no runtime dependencies.

## Test coverage added

`pnpm test` now provides explicit smoke coverage for the current Phase 1
workspace seam:

- it executes the playground-path import smoke for
  `@terminal-depth/renderer-core`
- it executes the playground-path import smoke for
  `@terminal-depth/scene-contract`
- it verifies that the current public runtime manifests do not declare
  `react` or `react-dom`

Package-level `test` scripts are still absent, but the root smoke is no longer
a no-op.

## Remaining limit

This validation still does not include an interactive browser boot check for
the playground shell. That remains intentionally out of scope for `BEL-618`
unless the ticket is explicitly widened beyond workspace smoke validation.

## Out of scope

- Interactive browser validation of the playground shell
- Renderer behavior or visual correctness
- Expanding `scene-contract` beyond the current placeholder seam
