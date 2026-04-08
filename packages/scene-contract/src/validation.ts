import {
  GraphSceneValidationError,
  type GraphSceneValidationIssue,
} from "./errors.ts";
import {
  GRAPH_SCENE_VERSION,
  type GraphScene,
  type GraphSceneAnnotation,
  type GraphSceneBoundsHint,
  type GraphSceneCamera,
  type GraphSceneCluster,
  type GraphSceneEdge,
  type GraphSceneLayoutHints,
  type GraphSceneMetadata,
  type GraphSceneNode,
  type GraphSceneTheme,
  type GraphSceneVector3,
  type GraphSceneVersion,
} from "./types.ts";

type UnknownRecord = Record<string, unknown>;

type CollectionResult<T> = readonly T[] | null | undefined;
type CollectionEntryParser<T> = (
  value: unknown,
  path: string,
  seenIds: Set<string>,
  issues: GraphSceneValidationIssue[],
) => T | null;

const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001F\u007F]/;
const NODE_STATES = new Set<NonNullable<GraphSceneNode["state"]>>([
  "idle",
  "active",
  "blocked",
  "done",
]);
const EDGE_STATES = new Set<NonNullable<GraphSceneEdge["state"]>>([
  "idle",
  "active",
  "blocked",
]);
const CAMERA_MODES = new Set<GraphSceneCamera["mode"]>([
  "orthographic",
  "perspective",
]);
const THEME_PALETTES = new Set<GraphSceneTheme["palette"]>([
  "ansi",
  "green-phosphor",
  "amber",
  "custom",
]);
const LAYOUT_HINT_VALUES = new Set<NonNullable<GraphSceneLayoutHints["positions"]>>([
  "provided",
  "auto",
]);

export function parseGraphScene(input: unknown): GraphScene {
  const issues: GraphSceneValidationIssue[] = [];

  if (!isRecord(input)) {
    addIssue(
      issues,
      "invalid_type",
      "$",
      "GraphScene input must be an object.",
    );
    throw new GraphSceneValidationError(issues);
  }

  const version = parseVersion(input.version, issues);
  const clusters = parseOptionalClusters(input.clusters, issues);
  const clusterIds = createIdSet(clusters);
  const nodes = parseRequiredNodes(input.nodes, clusterIds, issues);
  const nodeIds = createIdSet(nodes);
  const edges = parseRequiredEdges(input.edges, nodeIds, issues);
  const annotations = parseOptionalAnnotations(input.annotations, nodeIds, issues);
  const camera = parseOptionalCamera(input.camera, issues);
  const theme = parseOptionalTheme(input.theme, issues);
  const layoutHints = parseOptionalLayoutHints(input.layoutHints, issues);

  if (issues.length > 0 || !version || !nodes || !edges) {
    throw new GraphSceneValidationError(issues);
  }

  return {
    version,
    nodes,
    edges,
    clusters: clusters ?? [],
    annotations: annotations ?? [],
    ...(camera ? { camera } : {}),
    ...(theme ? { theme } : {}),
    ...(layoutHints ? { layoutHints } : {}),
  };
}

function parseVersion(
  value: unknown,
  issues: GraphSceneValidationIssue[],
): GraphSceneVersion | undefined {
  if (value === GRAPH_SCENE_VERSION) {
    return GRAPH_SCENE_VERSION;
  }

  addIssue(
    issues,
    "invalid_version",
    "version",
    `version must equal ${GRAPH_SCENE_VERSION}.`,
  );

  return undefined;
}

function parseOptionalClusters(
  value: unknown,
  issues: GraphSceneValidationIssue[],
): CollectionResult<GraphSceneCluster> {
  return parseOptionalCollection(
    value,
    "clusters",
    "clusters must be an array when provided.",
    issues,
    parseCluster,
  );
}

function parseRequiredNodes(
  value: unknown,
  clusterIds: ReadonlySet<string> | null,
  issues: GraphSceneValidationIssue[],
): readonly GraphSceneNode[] | null {
  return parseRequiredCollection(
    value,
    "nodes",
    "nodes is required and must be an array.",
    "nodes must be an array.",
    issues,
    (entry, path, seenIds, parserIssues) =>
      parseNode(entry, path, seenIds, clusterIds, parserIssues),
  );
}

function parseRequiredEdges(
  value: unknown,
  nodeIds: ReadonlySet<string> | null,
  issues: GraphSceneValidationIssue[],
): readonly GraphSceneEdge[] | null {
  return parseRequiredCollection(
    value,
    "edges",
    "edges is required and must be an array.",
    "edges must be an array.",
    issues,
    (entry, path, seenIds, parserIssues) =>
      parseEdge(entry, path, seenIds, nodeIds, parserIssues),
  );
}

function parseOptionalAnnotations(
  value: unknown,
  nodeIds: ReadonlySet<string> | null,
  issues: GraphSceneValidationIssue[],
): CollectionResult<GraphSceneAnnotation> {
  return parseOptionalCollection(
    value,
    "annotations",
    "annotations must be an array when provided.",
    issues,
    (entry, path, seenIds, parserIssues) =>
      parseAnnotation(entry, path, seenIds, nodeIds, parserIssues),
  );
}

function parseOptionalCamera(
  value: unknown,
  issues: GraphSceneValidationIssue[],
): GraphSceneCamera | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!isRecord(value)) {
    addIssue(
      issues,
      "invalid_type",
      "camera",
      "camera must be an object when provided.",
    );
    return undefined;
  }

  const mode = readRequiredEnum(
    value.mode,
    "camera.mode",
    CAMERA_MODES,
    issues,
  );
  const position = parseVector3(value.position, "camera.position", issues);
  const target = parseVector3(value.target, "camera.target", issues);
  const fov = readOptionalFiniteNumber(value.fov, "camera.fov", issues);

  if (!mode || !position || !target) {
    return undefined;
  }

  return {
    mode,
    position,
    target,
    ...(fov !== undefined ? { fov } : {}),
  };
}

function parseOptionalTheme(
  value: unknown,
  issues: GraphSceneValidationIssue[],
): GraphSceneTheme | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!isRecord(value)) {
    addIssue(
      issues,
      "invalid_type",
      "theme",
      "theme must be an object when provided.",
    );
    return undefined;
  }

  const palette = readRequiredEnum(
    value.palette,
    "theme.palette",
    THEME_PALETTES,
    issues,
  );
  const cellSize = parseOptionalCellSize(value.cellSize, issues);
  const postprocessPreset = readOptionalString(
    value.postprocessPreset,
    "theme.postprocessPreset",
    issues,
  );

  if (!palette) {
    return undefined;
  }

  return {
    palette,
    ...(cellSize ? { cellSize } : {}),
    ...(postprocessPreset !== undefined ? { postprocessPreset } : {}),
  };
}

function parseOptionalLayoutHints(
  value: unknown,
  issues: GraphSceneValidationIssue[],
): GraphSceneLayoutHints | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!isRecord(value)) {
    addIssue(
      issues,
      "invalid_type",
      "layoutHints",
      "layoutHints must be an object when provided.",
    );
    return undefined;
  }

  const positions = readOptionalEnum(
    value.positions,
    "layoutHints.positions",
    LAYOUT_HINT_VALUES,
    issues,
  );
  const routes = readOptionalEnum(
    value.routes,
    "layoutHints.routes",
    LAYOUT_HINT_VALUES,
    issues,
  );

  return {
    ...(positions !== undefined ? { positions } : {}),
    ...(routes !== undefined ? { routes } : {}),
  };
}

function parseOptionalCollection<T>(
  value: unknown,
  path: string,
  invalidTypeMessage: string,
  issues: GraphSceneValidationIssue[],
  parseEntry: CollectionEntryParser<T>,
): CollectionResult<T> {
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value)) {
    addIssue(issues, "invalid_type", path, invalidTypeMessage);
    return null;
  }

  return parseCollectionEntries(value, path, issues, parseEntry);
}

function parseRequiredCollection<T>(
  value: unknown,
  path: string,
  missingFieldMessage: string,
  invalidTypeMessage: string,
  issues: GraphSceneValidationIssue[],
  parseEntry: CollectionEntryParser<T>,
): readonly T[] | null {
  if (value === undefined) {
    addIssue(issues, "missing_required_field", path, missingFieldMessage);
    return null;
  }

  if (!Array.isArray(value)) {
    addIssue(issues, "invalid_type", path, invalidTypeMessage);
    return null;
  }

  return parseCollectionEntries(value, path, issues, parseEntry);
}

function parseCollectionEntries<T>(
  entries: readonly unknown[],
  path: string,
  issues: GraphSceneValidationIssue[],
  parseEntry: CollectionEntryParser<T>,
): readonly T[] {
  const seenIds = new Set<string>();

  return entries
    .map((entry, index) =>
      parseEntry(entry, `${path}[${index}]`, seenIds, issues),
    )
    .filter((parsedEntry): parsedEntry is T => parsedEntry !== null);
}

function parseCluster(
  value: unknown,
  path: string,
  seenIds: Set<string>,
  issues: GraphSceneValidationIssue[],
): GraphSceneCluster | null {
  if (!isRecord(value)) {
    addIssue(issues, "invalid_type", path, "Cluster entries must be objects.");
    return null;
  }

  const id = readRequiredId(value.id, `${path}.id`, issues);
  const label = readRequiredString(value.label, `${path}.label`, issues);
  const boundsHint = parseOptionalBoundsHint(value.boundsHint, `${path}.boundsHint`, issues);
  const colorRole = readOptionalString(value.colorRole, `${path}.colorRole`, issues);
  const metadata = parseOptionalMetadata(value.metadata, `${path}.metadata`, issues);

  if (id) {
    markDuplicateId(id, `${path}.id`, seenIds, issues);
  }

  if (!id || label === undefined) {
    return null;
  }

  return {
    id,
    label,
    ...(boundsHint ? { boundsHint } : {}),
    ...(colorRole !== undefined ? { colorRole } : {}),
    ...(metadata ? { metadata } : {}),
  };
}

function parseNode(
  value: unknown,
  path: string,
  seenIds: Set<string>,
  clusterIds: ReadonlySet<string> | null,
  issues: GraphSceneValidationIssue[],
): GraphSceneNode | null {
  if (!isRecord(value)) {
    addIssue(issues, "invalid_type", path, "Node entries must be objects.");
    return null;
  }

  const id = readRequiredId(value.id, `${path}.id`, issues);
  const label = readRequiredString(value.label, `${path}.label`, issues);
  const position = parseOptionalVector3(value.position, `${path}.position`, issues);
  const size = readOptionalFiniteNumber(value.size, `${path}.size`, issues);
  const state = readOptionalEnum(value.state, `${path}.state`, NODE_STATES, issues);
  const colorRole = readOptionalString(value.colorRole, `${path}.colorRole`, issues);
  const glyphRole = readOptionalString(value.glyphRole, `${path}.glyphRole`, issues);
  const emphasis = readOptionalFiniteNumber(value.emphasis, `${path}.emphasis`, issues);
  const clusterId = readOptionalId(value.clusterId, `${path}.clusterId`, issues);
  const metadata = parseOptionalMetadata(value.metadata, `${path}.metadata`, issues);

  if (id) {
    markDuplicateId(id, `${path}.id`, seenIds, issues);
  }

  if (clusterId && clusterIds !== null && !clusterIds.has(clusterId)) {
    addIssue(
      issues,
      "dangling_reference",
      `${path}.clusterId`,
      `clusterId references unknown cluster ${clusterId}.`,
    );
  }

  if (!id || label === undefined) {
    return null;
  }

  return {
    id,
    label,
    ...(position ? { position } : {}),
    ...(size !== undefined ? { size } : {}),
    ...(state !== undefined ? { state } : {}),
    ...(colorRole !== undefined ? { colorRole } : {}),
    ...(glyphRole !== undefined ? { glyphRole } : {}),
    ...(emphasis !== undefined ? { emphasis } : {}),
    ...(clusterId !== undefined ? { clusterId } : {}),
    ...(metadata ? { metadata } : {}),
  };
}

function parseEdge(
  value: unknown,
  path: string,
  seenIds: Set<string>,
  nodeIds: ReadonlySet<string> | null,
  issues: GraphSceneValidationIssue[],
): GraphSceneEdge | null {
  if (!isRecord(value)) {
    addIssue(issues, "invalid_type", path, "Edge entries must be objects.");
    return null;
  }

  const id = readRequiredId(value.id, `${path}.id`, issues);
  const source = readRequiredId(value.source, `${path}.source`, issues);
  const target = readRequiredId(value.target, `${path}.target`, issues);
  const kind = readRequiredString(value.kind, `${path}.kind`, issues);
  const state = readOptionalEnum(value.state, `${path}.state`, EDGE_STATES, issues);
  const colorRole = readOptionalString(value.colorRole, `${path}.colorRole`, issues);
  const pulse = readOptionalFiniteNumber(value.pulse, `${path}.pulse`, issues);
  const route = parseOptionalRoute(value.route, `${path}.route`, issues);
  const metadata = parseOptionalMetadata(value.metadata, `${path}.metadata`, issues);

  if (id) {
    markDuplicateId(id, `${path}.id`, seenIds, issues);
  }

  if (source && nodeIds !== null && !nodeIds.has(source)) {
    addIssue(
      issues,
      "dangling_reference",
      `${path}.source`,
      `source references unknown node ${source}.`,
    );
  }

  if (target && nodeIds !== null && !nodeIds.has(target)) {
    addIssue(
      issues,
      "dangling_reference",
      `${path}.target`,
      `target references unknown node ${target}.`,
    );
  }

  if (!id || !source || !target || kind === undefined) {
    return null;
  }

  return {
    id,
    source,
    target,
    kind,
    ...(state !== undefined ? { state } : {}),
    ...(colorRole !== undefined ? { colorRole } : {}),
    ...(pulse !== undefined ? { pulse } : {}),
    ...(route ? { route } : {}),
    ...(metadata ? { metadata } : {}),
  };
}

function parseAnnotation(
  value: unknown,
  path: string,
  seenIds: Set<string>,
  nodeIds: ReadonlySet<string> | null,
  issues: GraphSceneValidationIssue[],
): GraphSceneAnnotation | null {
  if (!isRecord(value)) {
    addIssue(
      issues,
      "invalid_type",
      path,
      "Annotation entries must be objects.",
    );
    return null;
  }

  const id = readRequiredId(value.id, `${path}.id`, issues);
  const label = readRequiredString(value.label, `${path}.label`, issues);
  const anchorNodeId = readOptionalId(value.anchorNodeId, `${path}.anchorNodeId`, issues);
  const position = parseOptionalVector3(value.position, `${path}.position`, issues);
  const metadata = parseOptionalMetadata(value.metadata, `${path}.metadata`, issues);

  if (id) {
    markDuplicateId(id, `${path}.id`, seenIds, issues);
  }

  if (anchorNodeId && nodeIds !== null && !nodeIds.has(anchorNodeId)) {
    addIssue(
      issues,
      "dangling_reference",
      `${path}.anchorNodeId`,
      `anchorNodeId references unknown node ${anchorNodeId}.`,
    );
  }

  if (anchorNodeId === undefined && position === undefined) {
    addIssue(
      issues,
      "missing_required_field",
      path,
      "Annotations must define anchorNodeId or position.",
    );
  }

  if (!id || label === undefined) {
    return null;
  }

  return {
    id,
    label,
    ...(anchorNodeId !== undefined ? { anchorNodeId } : {}),
    ...(position ? { position } : {}),
    ...(metadata ? { metadata } : {}),
  };
}

function parseOptionalVector3(
  value: unknown,
  path: string,
  issues: GraphSceneValidationIssue[],
): GraphSceneVector3 | undefined {
  if (value === undefined) {
    return undefined;
  }

  return parseVector3(value, path, issues);
}

function parseVector3(
  value: unknown,
  path: string,
  issues: GraphSceneValidationIssue[],
): GraphSceneVector3 | undefined {
  if (!isRecord(value)) {
    addIssue(issues, "invalid_type", path, "Expected a vector object.");
    return undefined;
  }

  const x = readRequiredFiniteNumber(value.x, `${path}.x`, issues);
  const y = readRequiredFiniteNumber(value.y, `${path}.y`, issues);
  const z = readRequiredFiniteNumber(value.z, `${path}.z`, issues);

  if (x === undefined || y === undefined || z === undefined) {
    return undefined;
  }

  return { x, y, z };
}

function parseOptionalBoundsHint(
  value: unknown,
  path: string,
  issues: GraphSceneValidationIssue[],
): GraphSceneBoundsHint | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!isRecord(value)) {
    addIssue(issues, "invalid_type", path, "Expected a boundsHint object.");
    return undefined;
  }

  const x = readRequiredFiniteNumber(value.x, `${path}.x`, issues);
  const y = readRequiredFiniteNumber(value.y, `${path}.y`, issues);
  const z = readRequiredFiniteNumber(value.z, `${path}.z`, issues);
  const w = readRequiredFiniteNumber(value.w, `${path}.w`, issues);
  const h = readRequiredFiniteNumber(value.h, `${path}.h`, issues);
  const d = readRequiredFiniteNumber(value.d, `${path}.d`, issues);

  if (
    x === undefined ||
    y === undefined ||
    z === undefined ||
    w === undefined ||
    h === undefined ||
    d === undefined
  ) {
    return undefined;
  }

  return { x, y, z, w, h, d };
}

function parseOptionalRoute(
  value: unknown,
  path: string,
  issues: GraphSceneValidationIssue[],
): readonly GraphSceneVector3[] | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value)) {
    addIssue(issues, "invalid_type", path, "route must be an array when provided.");
    return undefined;
  }

  return value
    .map((entry, index) => parseVector3(entry, `${path}[${index}]`, issues))
    .filter((entry): entry is GraphSceneVector3 => entry !== undefined);
}

function parseOptionalCellSize(
  value: unknown,
  issues: GraphSceneValidationIssue[],
): GraphSceneTheme["cellSize"] | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!isRecord(value)) {
    addIssue(
      issues,
      "invalid_type",
      "theme.cellSize",
      "theme.cellSize must be an object when provided.",
    );
    return undefined;
  }

  const cols = readRequiredPositiveInteger(
    value.cols,
    "theme.cellSize.cols",
    issues,
  );
  const rows = readRequiredPositiveInteger(
    value.rows,
    "theme.cellSize.rows",
    issues,
  );

  if (cols === undefined || rows === undefined) {
    return undefined;
  }

  return { cols, rows };
}

function parseOptionalMetadata(
  value: unknown,
  path: string,
  issues: GraphSceneValidationIssue[],
): GraphSceneMetadata | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!isRecord(value)) {
    addIssue(
      issues,
      "invalid_type",
      path,
      "metadata must be an object when provided.",
    );
    return undefined;
  }

  const metadata: Record<string, string | number | boolean | null> = {};

  for (const [key, entryValue] of Object.entries(value)) {
    if (isMetadataValue(entryValue)) {
      metadata[key] = entryValue;
      continue;
    }

    addIssue(
      issues,
      "invalid_metadata_value",
      `${path}.${key}`,
      "metadata values must be flat primitive JSON values.",
    );
  }

  return metadata;
}

function readRequiredString(
  value: unknown,
  path: string,
  issues: GraphSceneValidationIssue[],
): string | undefined {
  if (typeof value === "string") {
    return value;
  }

  addIssue(issues, "invalid_type", path, "Expected a string.");
  return undefined;
}

function readOptionalString(
  value: unknown,
  path: string,
  issues: GraphSceneValidationIssue[],
): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  return readRequiredString(value, path, issues);
}

function readRequiredId(
  value: unknown,
  path: string,
  issues: GraphSceneValidationIssue[],
): string | undefined {
  if (typeof value !== "string") {
    addIssue(issues, "invalid_type", path, "Expected an ID string.");
    return undefined;
  }

  return validateId(value, path, issues);
}

function readOptionalId(
  value: unknown,
  path: string,
  issues: GraphSceneValidationIssue[],
): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  return readRequiredId(value, path, issues);
}

function readRequiredEnum<T extends string>(
  value: unknown,
  path: string,
  allowedValues: ReadonlySet<T>,
  issues: GraphSceneValidationIssue[],
): T | undefined {
  if (typeof value !== "string") {
    addIssue(issues, "invalid_type", path, "Expected a string enum value.");
    return undefined;
  }

  if (!allowedValues.has(value as T)) {
    addIssue(
      issues,
      "invalid_enum_value",
      path,
      `Expected one of ${Array.from(allowedValues).join(", ")}.`,
    );
    return undefined;
  }

  return value as T;
}

function readOptionalEnum<T extends string>(
  value: unknown,
  path: string,
  allowedValues: ReadonlySet<T>,
  issues: GraphSceneValidationIssue[],
): T | undefined {
  if (value === undefined) {
    return undefined;
  }

  return readRequiredEnum(value, path, allowedValues, issues);
}

function readRequiredFiniteNumber(
  value: unknown,
  path: string,
  issues: GraphSceneValidationIssue[],
): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  addIssue(issues, "invalid_type", path, "Expected a finite number.");
  return undefined;
}

function readOptionalFiniteNumber(
  value: unknown,
  path: string,
  issues: GraphSceneValidationIssue[],
): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  return readRequiredFiniteNumber(value, path, issues);
}

function readRequiredPositiveInteger(
  value: unknown,
  path: string,
  issues: GraphSceneValidationIssue[],
): number | undefined {
  if (
    typeof value === "number" &&
    Number.isFinite(value) &&
    Number.isInteger(value) &&
    value > 0
  ) {
    return value;
  }

  addIssue(
    issues,
    "invalid_value",
    path,
    "Expected a positive integer.",
  );
  return undefined;
}

function validateId(
  value: string,
  path: string,
  issues: GraphSceneValidationIssue[],
): string | undefined {
  if (value.length === 0) {
    addIssue(issues, "invalid_id", path, "IDs must not be empty.");
    return undefined;
  }

  if (value.trim() !== value) {
    addIssue(
      issues,
      "invalid_id",
      path,
      "IDs must not include leading or trailing whitespace.",
    );
    return undefined;
  }

  if (CONTROL_CHARACTER_PATTERN.test(value)) {
    addIssue(
      issues,
      "invalid_id",
      path,
      "IDs must not contain control characters.",
    );
    return undefined;
  }

  return value;
}

function markDuplicateId(
  id: string,
  path: string,
  seenIds: Set<string>,
  issues: GraphSceneValidationIssue[],
): void {
  if (seenIds.has(id)) {
    addIssue(
      issues,
      "duplicate_id",
      path,
      `Duplicate ID ${id} is not allowed in the same collection.`,
    );
    return;
  }

  seenIds.add(id);
}

function isMetadataValue(
  value: unknown,
): value is string | number | boolean | null {
  return (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean" ||
    (typeof value === "number" && Number.isFinite(value))
  );
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function createIdSet<T extends { readonly id: string }>(
  entries: readonly T[] | null | undefined,
): ReadonlySet<string> | null {
  if (entries === null) {
    return null;
  }

  return new Set((entries ?? []).map(({ id }) => id));
}

function addIssue(
  issues: GraphSceneValidationIssue[],
  code: string,
  path: string,
  message: string,
): void {
  issues.push({ code, path, message });
}
