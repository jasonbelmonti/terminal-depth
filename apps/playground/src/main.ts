import { createRenderer } from "@terminal-depth/renderer-core";
import {
  GRAPH_SCENE_VERSION,
  type GraphScene,
} from "@terminal-depth/scene-contract";

import { createPlaygroundShell } from "./create-playground-shell";
import "./style.css";

const shellScene: GraphScene = {
  version: GRAPH_SCENE_VERSION,
};

const rootElement = document.querySelector<HTMLDivElement>("#app");

if (!rootElement) {
  throw new Error("Missing #app root for playground bootstrap.");
}

const shell = createPlaygroundShell(shellScene);
rootElement.replaceChildren(shell.element);

const renderer = createRenderer(shell.canvas);
renderer.setScene(shellScene);

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

resizeObserver.observe(shell.viewport);

const handlePageHide = () => {
  disposeRenderer();
};

const disposeRenderer = () => {
  removeEventListener("pagehide", handlePageHide);
  resizeObserver.disconnect();
  renderer.dispose();
};

addEventListener("pagehide", handlePageHide, { once: true });
import.meta.hot?.dispose(disposeRenderer);
