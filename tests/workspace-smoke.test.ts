import { readFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { describe, expect, it } from "vitest";

type PackageManifest = {
  readonly dependencies?: Record<string, string>;
  readonly optionalDependencies?: Record<string, string>;
  readonly peerDependencies?: Record<string, string>;
};

const execFileAsync = promisify(execFile);

async function readPackageManifest(relativePath: string): Promise<PackageManifest> {
  const manifestUrl = new URL(`../${relativePath}`, import.meta.url);
  const manifestContent = await readFile(manifestUrl, "utf8");

  return JSON.parse(manifestContent) as PackageManifest;
}

function listRuntimeDependencyNames(manifest: PackageManifest): string[] {
  return [
    ...Object.keys(manifest.dependencies ?? {}),
    ...Object.keys(manifest.optionalDependencies ?? {}),
    ...Object.keys(manifest.peerDependencies ?? {}),
  ];
}

async function runPlaygroundImportSmoke(expression: string): Promise<string> {
  const packageManagerExecPath = process.env.npm_execpath;

  if (!packageManagerExecPath) {
    throw new Error("npm_execpath is not set; run this smoke test through `pnpm test`.");
  }

  const repoRoot = fileURLToPath(new URL("../", import.meta.url));
  const { stdout } = await execFileAsync(
    process.execPath,
    [
      packageManagerExecPath,
      "--filter",
      "@terminal-depth/playground",
      "exec",
      "node",
      "--input-type=module",
      "-e",
      expression,
    ],
    {
      cwd: repoRoot,
    },
  );

  return stdout.trim();
}

async function expectPlaygroundImportToResolve(
  expression: string,
  expected: string,
): Promise<void> {
  await expect(runPlaygroundImportSmoke(expression)).resolves.toBe(expected);
}

const PLAYGROUND_IMPORT_CASES = [
  {
    expression:
      "import('@terminal-depth/renderer-core').then((m)=>console.log(typeof m.createRenderer))",
    expected: "function",
  },
  {
    expression:
      "import('@terminal-depth/scene-contract').then((m)=>console.log(m.GRAPH_SCENE_VERSION))",
    expected: "graph-scene/v1",
  },
  {
    expression:
      "import('@terminal-depth/scene-contract').then((m)=>console.log(String('HERO_GRAPH_SCENE_FIXTURE' in m)))",
    expected: "false",
  },
  {
    expression:
      "import('@terminal-depth/scene-contract/fixtures').then((m)=>console.log(m.EMPTY_GRAPH_SCENE_FIXTURE.version))",
    expected: "graph-scene/v1",
  },
  {
    expression:
      "import('@terminal-depth/scene-contract/fixtures').then((m)=>console.log(m.BENCHMARK_GRAPH_SCENE_FIXTURE.version))",
    expected: "graph-scene/v1",
  },
  {
    expression:
      "import('@terminal-depth/scene-contract/fixtures').then((m)=>console.log(m.HERO_GRAPH_SCENE_FIXTURE.version))",
    expected: "graph-scene/v1",
  },
] as const;

describe("workspace smoke", () => {
  it("resolves the current public package exports from the playground path", async () => {
    for (const importCase of PLAYGROUND_IMPORT_CASES) {
      await expectPlaygroundImportToResolve(
        importCase.expression,
        importCase.expected,
      );
    }
  });

  it("keeps react out of the public runtime manifests", async () => {
    const manifests = await Promise.all([
      readPackageManifest("apps/playground/package.json"),
      readPackageManifest("packages/renderer-core/package.json"),
      readPackageManifest("packages/scene-contract/package.json"),
    ]);

    for (const manifest of manifests) {
      expect(listRuntimeDependencyNames(manifest)).not.toContain("react");
      expect(listRuntimeDependencyNames(manifest)).not.toContain("react-dom");
    }
  });
});
