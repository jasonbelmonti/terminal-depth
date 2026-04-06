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

function createNoopGraphRenderer(): GraphRenderer {
  return {
    dispose() {},
    resize(_width: number, _height: number) {},
    setFocus(_target: FocusTarget | null) {},
    setScene(_scene: GraphScene) {},
  };
}

export function createRenderer(
  _canvas: HTMLCanvasElement,
  _options: RendererOptions = {},
): GraphRenderer {
  return createNoopGraphRenderer();
}
