import { resolve } from "node:path"
import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts", "scripts/**/*.test.ts", "tests/unit/**/*.test.ts"],
    globals: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      include: ["lib/**/*.ts"],
      exclude: ["lib/**/*.test.ts", "lib/db.ts"],
      thresholds: {
        // Targets start permissive and tighten as coverage grows.
        "lib/orders/service.ts": { statements: 50, branches: 40, functions: 50, lines: 50 },
        "lib/gdpr/service.ts": { statements: 50, branches: 40, functions: 50, lines: 50 },
      },
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "."),
    },
  },
})
