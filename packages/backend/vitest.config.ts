import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
    globals: true,
    setupFiles: ['../../tests/setup/jest.setup.ts'],
    reporters: 'default',
    coverage: {
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts']
    }
  },
});
