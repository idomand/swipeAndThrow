import { defineConfig } from "vitest/config";

// Vitest runs pure-logic unit tests only (helpers, i18n, the extracted
// decision-buffer / grouping modules). Those import nothing native, so the plain
// `node` environment is enough — no React Native transform or DOM.
// `resolve.tsconfigPaths` makes the `@/*` → `src/*` alias from tsconfig.json
// resolve in tests too, using Vite's built-in support (no extra plugin).
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    include: ["src/**/*.{test,spec}.ts"],
  },
});
