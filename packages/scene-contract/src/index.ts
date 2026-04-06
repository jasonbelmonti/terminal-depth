export const GRAPH_SCENE_VERSION = "graph-scene/v1";

export type GraphSceneVersion = typeof GRAPH_SCENE_VERSION;

// Placeholder contract seam until BEL-598 defines the v1 scene surface.
export interface GraphScene {
  readonly version: GraphSceneVersion;
}

export interface GraphSceneNode {}

export interface GraphSceneEdge {}

export interface GraphSceneCluster {}

export interface GraphSceneAnnotation {}

export interface GraphSceneCamera {}

export interface GraphSceneTheme {}

export interface GraphSceneLayoutHints {}
