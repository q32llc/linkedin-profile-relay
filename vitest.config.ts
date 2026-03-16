import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
    exclude: ["tests/e2e*"],
  },
  resolve: {
    alias: {
      "@src": resolve(__dirname, "src"),
    },
  },
});
