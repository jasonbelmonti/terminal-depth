import { defineConfig } from "vitest/config";

const workspaceTestGlobs = [
  "packages/**/*.test.{ts,tsx}",
  "packages/**/*.spec.{ts,tsx}",
  "apps/**/*.test.{ts,tsx}",
  "apps/**/*.spec.{ts,tsx}",
];

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    include: workspaceTestGlobs,
    passWithNoTests: true,
    reporters: "default",
  },
});
