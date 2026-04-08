export const GRAPH_SCENE_VERSION = "graph-scene/v1";

export type GraphSceneVersion = typeof GRAPH_SCENE_VERSION;

export type GraphSceneMetadata = Readonly<
  Record<string, string | number | boolean | null>
>;

export interface GraphSceneVector3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface GraphSceneBoundsHint extends GraphSceneVector3 {
  readonly w: number;
  readonly h: number;
  readonly d: number;
}

export interface GraphScene {
  readonly version: GraphSceneVersion;
  readonly nodes: readonly GraphSceneNode[];
  readonly edges: readonly GraphSceneEdge[];
  readonly clusters?: readonly GraphSceneCluster[];
  readonly annotations?: readonly GraphSceneAnnotation[];
  readonly camera?: GraphSceneCamera;
  readonly theme?: GraphSceneTheme;
  readonly layoutHints?: GraphSceneLayoutHints;
}

export interface GraphSceneNode {
  readonly id: string;
  readonly label: string;
  readonly position?: GraphSceneVector3;
  readonly size?: number;
  readonly state?: "idle" | "active" | "blocked" | "done";
  readonly colorRole?: string;
  readonly glyphRole?: string;
  readonly emphasis?: number;
  readonly clusterId?: string;
  readonly metadata?: GraphSceneMetadata;
}

export interface GraphSceneEdge {
  readonly id: string;
  readonly source: string;
  readonly target: string;
  readonly kind: string;
  readonly state?: "idle" | "active" | "blocked";
  readonly colorRole?: string;
  readonly pulse?: number;
  readonly route?: readonly GraphSceneVector3[];
  readonly metadata?: GraphSceneMetadata;
}

export interface GraphSceneCluster {
  readonly id: string;
  readonly label: string;
  readonly boundsHint?: GraphSceneBoundsHint;
  readonly colorRole?: string;
  readonly metadata?: GraphSceneMetadata;
}

export interface GraphSceneAnnotation {
  readonly id: string;
  readonly label: string;
  readonly anchorNodeId?: string;
  readonly position?: GraphSceneVector3;
  readonly metadata?: GraphSceneMetadata;
}

export interface GraphSceneCamera {
  readonly mode: "orthographic" | "perspective";
  readonly position: GraphSceneVector3;
  readonly target: GraphSceneVector3;
  readonly fov?: number;
}

export interface GraphSceneTheme {
  readonly palette: "ansi" | "green-phosphor" | "amber" | "custom";
  readonly cellSize?: {
    readonly cols: number;
    readonly rows: number;
  };
  readonly postprocessPreset?: string;
}

export interface GraphSceneLayoutHints {
  readonly positions?: "provided" | "auto";
  readonly routes?: "provided" | "auto";
}
