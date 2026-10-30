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
        //
        // These were declared but never enforced: `pnpm test` ran `vitest run`
        // without `--coverage`, so the thresholds never applied, and the
        // coverage provider was not even installed. `pnpm test:coverage` runs
        // in CI now and applies them.
        //
        // Only the modules the unit suite can reach belong here. The ones
        // that need a database have their floor in
        // `vitest.integration.config.ts`.
        "lib/orders/status.ts": { statements: 90, branches: 90, functions: 60, lines: 90 },
        "lib/security/rate-limit.ts": { statements: 55, branches: 50, functions: 60, lines: 55 },
        "lib/crypto/chains.ts": { statements: 45, branches: 40, functions: 20, lines: 45 },
        "lib/promotions/service.ts": { statements: 20, branches: 20, functions: 20, lines: 20 },
      },
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "."),
    },
  },
})
