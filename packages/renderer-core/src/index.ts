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
  _canvas: HTMLCanvasElement,
  _options: RendererOptions = {},
): GraphRenderer {
  throw new Error("createRenderer is not implemented yet.");
}
