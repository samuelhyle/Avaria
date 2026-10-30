import { resolve } from "node:path"
import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    fileParallelism: false,
    testTimeout: 15000,
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      include: ["lib/**/*.ts"],
      exclude: ["lib/**/*.test.ts", "lib/db.ts"],
      thresholds: {
        // The modules that need a database to exercise. The unit suite cannot
        // reach them, so their floor lives here and is enforced by
        // `pnpm test:coverage:integration`.
        "lib/orders/service.ts": { statements: 50, branches: 40, functions: 50, lines: 50 },
        "lib/orders/refund.ts": { statements: 70, branches: 60, functions: 70, lines: 70 },
        "lib/gdpr/service.ts": { statements: 50, branches: 40, functions: 50, lines: 50 },
        "lib/promotions/service.ts": { statements: 70, branches: 60, functions: 70, lines: 70 },
        "lib/referral/service.ts": { statements: 70, branches: 60, functions: 70, lines: 70 },
        "lib/crypto/matching.ts": { statements: 70, branches: 60, functions: 70, lines: 70 },
        "lib/crypto/session.ts": { statements: 60, branches: 50, functions: 60, lines: 60 },
      },
    },
  },
  resolve: { alias: { "@": resolve(__dirname, ".") } },
})
