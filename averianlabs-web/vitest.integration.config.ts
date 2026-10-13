import { resolve } from "node:path"
import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    fileParallelism: false,
    testTimeout: 15000,
  },
  resolve: { alias: { "@": resolve(__dirname, ".") } },
})
