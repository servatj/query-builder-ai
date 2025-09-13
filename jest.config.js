// Root Jest configuration for AI Query Builder
module.exports = {
  projects: [
    {
      displayName: 'backend',
      testEnvironment: 'node',
      testMatch: [
        '<rootDir>/tests/unit/backend/**/*.test.ts',
        '<rootDir>/tests/integration/**/*.test.ts',
        '<rootDir>/packages/backend/src/**/*.test.ts'
      ],
      setupFilesAfterEnv: ['<rootDir>/tests/setup/jest.setup.ts'],
      collectCoverageFrom: [
        'packages/backend/src/**/*.ts',
        '!packages/backend/src/**/*.d.ts',
        '!packages/backend/src/**/*.test.ts'
      ],
      coverageDirectory: '<rootDir>/coverage/backend',
      coverageReporters: ['text', 'lcov', 'html'],
      transform: {
        '^.+\\.ts$': 'ts-jest'
      },
      moduleFileExtensions: ['ts', 'js'],
      testTimeout: 10000
    },
    {
      displayName: 'frontend',
      testEnvironment: 'jsdom',
      testMatch: [
        '<rootDir>/tests/unit/frontend/**/*.test.tsx',
        '<rootDir>/tests/unit/frontend/**/*.test.ts',
        '<rootDir>/packages/frontend/src/**/*.test.tsx',
        '<rootDir>/packages/frontend/src/**/*.test.ts'
      ],
      setupFilesAfterEnv: ['<rootDir>/tests/setup/jest.setup.ts'],
      collectCoverageFrom: [
        'packages/frontend/src/**/*.{ts,tsx}',
        '!packages/frontend/src/**/*.d.ts',
        '!packages/frontend/src/**/*.test.{ts,tsx}',
        '!packages/frontend/src/**/*.stories.tsx',
        '!packages/frontend/src/main.tsx'
      ],
      coverageDirectory: '<rootDir>/coverage/frontend',
      coverageReporters: ['text', 'lcov', 'html'],
      transform: {
        '^.+\\.(ts|tsx)$': 'ts-jest'
      },
      moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/packages/frontend/src/$1'
      },
      testTimeout: 10000
    }
  ],
  collectCoverage: true,
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text-summary', 'lcov'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  // Global test configuration
  verbose: true,
  clearMocks: true,
  restoreMocks: true
}
