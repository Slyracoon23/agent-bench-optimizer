import { configDefaults, defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    globals: true,
    include: ['**/*.test.ts', 'examples/**/*.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html']
    }
  }
}) 