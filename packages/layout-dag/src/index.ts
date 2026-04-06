import type { GraphScene } from "@terminal-depth/scene-contract";

export interface LayoutOptions {}

export function computeLayeredDagLayout(
  _scene: GraphScene,
  _options: LayoutOptions = {},
): GraphScene {
  throw new Error("computeLayeredDagLayout is not implemented yet.");
}
