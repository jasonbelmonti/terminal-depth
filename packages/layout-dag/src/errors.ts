export type LayoutDagErrorCode =
  | "cyclic-graph"
  | "dangling-edge-reference"
  | "duplicate-edge-id"
  | "duplicate-node-id";

export class LayoutDagError extends Error {
  readonly code: LayoutDagErrorCode;

  constructor(code: LayoutDagErrorCode, message: string) {
    super(message);
    this.name = "LayoutDagError";
    this.code = code;
  }
}
