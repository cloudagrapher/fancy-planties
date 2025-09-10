/**
 * Test Performance Utilities
 * 
 * Centralized exports for all test performance monitoring and optimization tools.
 */

// Performance monitoring
export {
  testPerformanceMonitor,
  withPerformanceMonitoring,
  measureAsyncOperation,
  PERFORMANCE_THRESHOLDS,
  assertPerformance,
} from './test-performance-monitor';

// Efficient test data
export {
  efficientTestData,
  setupEfficientTestData,
  setupTransactionIsolation,
  BatchOperations,
  generateTestData,
  LazyTestData,
  createUserPool,
  createPlantPool,
  createPlantInstancePool,
} from './efficient-test-data';

// Benchmarking and alerting
export {
  testBenchmarkingSystem,
  withBenchmarking,
  recordBenchmark,
  saveBenchmarkReport,
} from './test-benchmarking';

// Re-export types
export type {
  TestPerformanceMetrics,
  TestSuiteMetrics,
} from './test-performance-monitor';

export type {
  TestDataPool,
  DatabaseTransaction,
} from './efficient-test-data';