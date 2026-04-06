import { defineConfig } from "vitest/config";

export const sharedVitestConfig = defineConfig({
  test: {
    globals: false,
    include: [],
    passWithNoTests: true,
    reporters: "default",
  },
});

export default sharedVitestConfig;
