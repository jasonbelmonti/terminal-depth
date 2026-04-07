import { defineConfig } from "vitest/config";

export const sharedVitestConfig = defineConfig({
  test: {
    globals: false,
    include: ["tests/**/*.test.ts"],
    passWithNoTests: false,
    reporters: "default",
  },
});

export default sharedVitestConfig;
