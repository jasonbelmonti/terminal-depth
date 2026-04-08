export interface GraphSceneValidationIssue {
  readonly code: string;
  readonly path: string;
  readonly message: string;
}

export class GraphSceneValidationError extends Error {
  readonly issues: readonly GraphSceneValidationIssue[];

  constructor(issues: readonly GraphSceneValidationIssue[]) {
    super(createValidationErrorMessage(issues));
    this.name = "GraphSceneValidationError";
    this.issues = Object.freeze([...issues]);
  }
}

function createValidationErrorMessage(
  issues: readonly GraphSceneValidationIssue[],
): string {
  const firstIssue = issues[0];

  if (!firstIssue) {
    return "Invalid graph scene.";
  }

  return `Invalid graph scene with ${issues.length} issue(s): ${firstIssue.message}`;
}
