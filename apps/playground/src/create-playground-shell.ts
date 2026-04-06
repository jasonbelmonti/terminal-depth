import type { GraphScene } from "@terminal-depth/scene-contract";

export interface PlaygroundShell {
  readonly canvas: HTMLCanvasElement;
  readonly element: HTMLElement;
  readonly viewport: HTMLElement;
}

export function createPlaygroundShell(scene: GraphScene): PlaygroundShell {
  const element = document.createElement("main");
  element.className = "playground-shell";

  const header = document.createElement("header");
  header.className = "playground-header";
  header.innerHTML = `
    <p class="playground-kicker">BEL-617 playground shell</p>
    <h1>Browser-first bootstrap for Terminal Depth</h1>
    <p class="playground-copy">
      This app proves workspace package resolution and browser bootstrapping.
      It intentionally stops before renderer behavior.
    </p>
  `;

  const details = document.createElement("dl");
  details.className = "playground-details";
  details.innerHTML = `
    <div>
      <dt>Scene contract</dt>
      <dd><code>${scene.version}</code></dd>
    </div>
    <div>
      <dt>Renderer seam</dt>
      <dd><code>createRenderer(canvas)</code></dd>
    </div>
    <div>
      <dt>Runtime path</dt>
      <dd>Plain TypeScript + Vite, no React in the hot aisle</dd>
    </div>
  `;

  const viewport = document.createElement("section");
  viewport.className = "playground-viewport";

  const canvas = document.createElement("canvas");
  canvas.className = "playground-canvas";
  canvas.setAttribute("aria-label", "Terminal Depth playground canvas");

  const overlay = document.createElement("div");
  overlay.className = "playground-overlay";
  overlay.innerHTML = `
    <p>Canvas shell is live.</p>
    <p>Renderer remains the BEL-616 no-op seam until later slices.</p>
  `;

  viewport.append(canvas, overlay);
  element.append(header, details, viewport);

  return { canvas, element, viewport };
}
