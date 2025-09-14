const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
})

// VS Code specific Jest config - no coverage requirements
const vscodeJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jsdom',
  testMatch: [
    '**/__tests__/**/*.(ts|tsx|js)',
    '**/*.(test|spec).(ts|tsx|js)'
  ],
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/coverage/',
    '<rootDir>/cypress/',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^lodash-es$': 'lodash',
    '^lodash-es/(.*)$': 'lodash/$1',
    '^oslo/(.*)$': '<rootDir>/src/test-utils/mocks/oslo-mock.js',
    '^oslo$': '<rootDir>/src/test-utils/mocks/oslo-mock.js',
    '^lucia$': '<rootDir>/src/test-utils/mocks/lucia-mock.js',
    '^lucia/(.*)$': '<rootDir>/src/test-utils/mocks/lucia-mock.js',
    '^@lucia-auth/adapter-postgresql$': '<rootDir>/src/test-utils/mocks/lucia-mock.js',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': 'identity-obj-proxy',
  },
  testEnvironmentOptions: {
    customExportConditions: [''],
    url: 'http://localhost:3000',
  },
  // NO COVERAGE REQUIREMENTS for VS Code
  collectCoverage: false,
  coverageThreshold: undefined,
  testTimeout: 15000,
  // Optimize parallel execution with proper isolation
  maxWorkers: process.env.CI ? 2 : '50%',
  workerIdleMemoryLimit: '512MB',
  // Transform node_modules that use ES modules
  transformIgnorePatterns: [
    'node_modules/(?!(lodash-es|lucide-react|@tanstack|@hookform|fuse\\.js|oslo|@oslo|lucia|@lucia-auth|@hookform/resolvers|@node-rs))',
  ],
  // Improve test isolation
  resetMocks: true,
  clearMocks: true,
  restoreMocks: true,
  // Improve error reporting
  verbose: false,
  errorOnDeprecated: true,
  // Handle async operations better
  detectOpenHandles: true,
  forceExit: true,
  
  // Performance optimizations
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache',
  
  // Improved test execution
  bail: 0, // Don't stop on first failure
  passWithNoTests: true,
  
  // Simple reporter for VS Code
  reporters: ['default'],
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(vscodeJestConfig)