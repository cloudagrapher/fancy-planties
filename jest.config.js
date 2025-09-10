const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
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
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': 'identity-obj-proxy',
  },
  testEnvironmentOptions: {
    customExportConditions: [''],
    url: 'http://localhost:3000',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{ts,tsx}',
    '!src/**/__tests__/**',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/*.spec.{ts,tsx}',
    '!src/test-utils/**',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  coverageReporters: ['text', 'lcov', 'html'],
  testTimeout: 15000,
  // Optimize parallel execution with proper isolation
  maxWorkers: process.env.CI ? 2 : '50%', // Use 2 workers in CI, 50% of cores locally
  workerIdleMemoryLimit: '512MB', // Prevent memory leaks in workers
  // Transform node_modules that use ES modules
  transformIgnorePatterns: [
    'node_modules/(?!(lodash-es|lucide-react|@tanstack/react-query|@hookform|fuse\\.js|oslo|@oslo|@lucia-auth|@hookform/resolvers)/)',
  ],
  // Improve test isolation
  resetMocks: true,
  clearMocks: true,
  restoreMocks: true,
  // Improve error reporting
  verbose: false,
  errorOnDeprecated: true,
  // Ensure proper test isolation
  // Handle async operations better
  detectOpenHandles: true,
  forceExit: true,
  
  // Performance optimizations
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache',
  
  // Improved test execution
  bail: process.env.CI ? 1 : 0, // Stop on first failure in CI
  passWithNoTests: true,
  
  // Performance monitoring
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: 'coverage',
      outputName: 'junit.xml',
      classNameTemplate: '{classname}',
      titleTemplate: '{title}',
      ancestorSeparator: ' › ',
      usePathForSuiteName: true,
    }],
  ],
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)