import type { GraphScene } from "@terminal-depth/scene-contract";

import { LayoutDagError, type LayoutDagErrorCode } from "./errors.ts";
import { computeSceneDagLayers } from "./layers.ts";

export interface LayoutOptions {}

export function computeLayeredDagLayout(
  scene: GraphScene,
  _options: LayoutOptions = {},
): GraphScene {
  // BEL-672 establishes deterministic graph prep and layering first.
  // Coordinate projection remains a subsequent slice, so this call currently
  // validates the graph and derives the layer model without mutating the scene.
  computeSceneDagLayers(scene);

  return scene;
}

export { LayoutDagError };
export type { LayoutDagErrorCode };
