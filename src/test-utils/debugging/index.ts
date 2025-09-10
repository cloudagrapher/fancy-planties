/**
 * Test Debugging Utilities
 * 
 * Centralized exports for all test debugging and error reporting tools.
 */

// Error reporting
export {
  testErrorReporter,
  withErrorReporting,
  withRetry,
  debugTestState,
  performanceAssert,
  setupErrorReporting,
} from './test-error-reporter';

// Failure analysis
export {
  testFailureAnalyzer,
  setupFailureAnalysis,
  analyzeTestFailure,
} from './test-failure-analyzer';

// Re-export types
export type {
  TestErrorContext,
  ApiCallLog,
  RetryConfig,
} from './test-error-reporter';

export type {
  FailurePattern,
  FailureAnalysis,
  TestFailureStats,
} from './test-failure-analyzer';