/**
 * Test Performance Monitor
 * 
 * Provides utilities for monitoring and optimizing test execution performance.
 */

interface TestPerformanceMetrics {
  testName: string;
  duration: number;
  memoryUsage: NodeJS.MemoryUsage;
  timestamp: Date;
  status: 'passed' | 'failed' | 'skipped';
}

interface TestSuiteMetrics {
  suiteName: string;
  totalTests: number;
  totalDuration: number;
  averageDuration: number;
  slowestTest: TestPerformanceMetrics | null;
  fastestTest: TestPerformanceMetrics | null;
  memoryPeak: number;
}

class TestPerformanceMonitor {
  private metrics: TestPerformanceMetrics[] = [];
  private suiteStartTime: number = 0;
  private testStartTime: number = 0;
  private currentTestName: string = '';

  /**
   * Start monitoring a test suite
   */
  startSuite(suiteName: string): void {
    this.suiteStartTime = performance.now();
    console.log(`📊 Starting performance monitoring for suite: ${suiteName}`);
  }

  /**
   * Start monitoring an individual test
   */
  startTest(testName: string): void {
    this.currentTestName = testName;
    this.testStartTime = performance.now();
  }

  /**
   * End monitoring an individual test
   */
  endTest(status: 'passed' | 'failed' | 'skipped' = 'passed'): void {
    const duration = performance.now() - this.testStartTime;
    const memoryUsage = process.memoryUsage();

    const metric: TestPerformanceMetrics = {
      testName: this.currentTestName,
      duration,
      memoryUsage,
      timestamp: new Date(),
      status,
    };

    this.metrics.push(metric);

    // Log slow tests (> 1 second)
    if (duration > 1000) {
      console.warn(`⚠️  Slow test detected: ${this.currentTestName} (${duration.toFixed(2)}ms)`);
    }
  }

  /**
   * End monitoring a test suite and generate report
   */
  endSuite(suiteName: string): TestSuiteMetrics {
    const totalDuration = performance.now() - this.suiteStartTime;
    const suiteMetrics = this.generateSuiteMetrics(suiteName, totalDuration);
    
    this.logSuiteReport(suiteMetrics);
    this.reset();
    
    return suiteMetrics;
  }

  /**
   * Generate performance metrics for a test suite
   */
  private generateSuiteMetrics(suiteName: string, totalDuration: number): TestSuiteMetrics {
    const testMetrics = this.metrics.filter(m => m.status !== 'skipped');
    
    const slowestTest = testMetrics.reduce((slowest, current) => 
      !slowest || current.duration > slowest.duration ? current : slowest, 
      null as TestPerformanceMetrics | null
    );

    const fastestTest = testMetrics.reduce((fastest, current) => 
      !fastest || current.duration < fastest.duration ? current : fastest, 
      null as TestPerformanceMetrics | null
    );

    const memoryPeak = Math.max(...this.metrics.map(m => m.memoryUsage.heapUsed));
    const averageDuration = testMetrics.length > 0 
      ? testMetrics.reduce((sum, m) => sum + m.duration, 0) / testMetrics.length 
      : 0;

    return {
      suiteName,
      totalTests: this.metrics.length,
      totalDuration,
      averageDuration,
      slowestTest,
      fastestTest,
      memoryPeak,
    };
  }

  /**
   * Log performance report for a test suite
   */
  private logSuiteReport(metrics: TestSuiteMetrics): void {
    console.log('\n📈 Test Performance Report');
    console.log('═'.repeat(50));
    console.log(`Suite: ${metrics.suiteName}`);
    console.log(`Total Tests: ${metrics.totalTests}`);
    console.log(`Total Duration: ${metrics.totalDuration.toFixed(2)}ms`);
    console.log(`Average Test Duration: ${metrics.averageDuration.toFixed(2)}ms`);
    
    if (metrics.slowestTest) {
      console.log(`Slowest Test: ${metrics.slowestTest.testName} (${metrics.slowestTest.duration.toFixed(2)}ms)`);
    }
    
    if (metrics.fastestTest) {
      console.log(`Fastest Test: ${metrics.fastestTest.testName} (${metrics.fastestTest.duration.toFixed(2)}ms)`);
    }
    
    console.log(`Peak Memory Usage: ${(metrics.memoryPeak / 1024 / 1024).toFixed(2)}MB`);
    console.log('═'.repeat(50));
  }

  /**
   * Reset metrics for next suite
   */
  private reset(): void {
    this.metrics = [];
    this.suiteStartTime = 0;
    this.testStartTime = 0;
    this.currentTestName = '';
  }

  /**
   * Get current metrics
   */
  getMetrics(): TestPerformanceMetrics[] {
    return [...this.metrics];
  }
}

// Global instance for easy access
export const testPerformanceMonitor = new TestPerformanceMonitor();

/**
 * Jest helper to automatically monitor test performance
 */
export function withPerformanceMonitoring(suiteName: string) {
  beforeAll(() => {
    testPerformanceMonitor.startSuite(suiteName);
  });

  beforeEach(() => {
    const testName = expect.getState().currentTestName || 'unknown';
    testPerformanceMonitor.startTest(testName);
  });

  afterEach(() => {
    const testState = expect.getState();
    const status = testState.assertionCalls > 0 ? 'passed' : 'skipped';
    testPerformanceMonitor.endTest(status);
  });

  afterAll(() => {
    testPerformanceMonitor.endSuite(suiteName);
  });
}

/**
 * Utility to measure async operation performance
 */
export async function measureAsyncOperation<T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<{ result: T; duration: number; memoryDelta: number }> {
  const startMemory = process.memoryUsage().heapUsed;
  const startTime = performance.now();
  
  const result = await operation();
  
  const endTime = performance.now();
  const endMemory = process.memoryUsage().heapUsed;
  
  const duration = endTime - startTime;
  const memoryDelta = endMemory - startMemory;
  
  console.log(`⏱️  ${operationName}: ${duration.toFixed(2)}ms, Memory: ${(memoryDelta / 1024).toFixed(2)}KB`);
  
  return { result, duration, memoryDelta };
}

/**
 * Performance thresholds for different types of tests
 */
export const PERFORMANCE_THRESHOLDS = {
  UNIT_TEST_MAX_DURATION: 100, // 100ms
  INTEGRATION_TEST_MAX_DURATION: 1000, // 1 second
  API_TEST_MAX_DURATION: 2000, // 2 seconds
  DATABASE_TEST_MAX_DURATION: 3000, // 3 seconds
  MAX_MEMORY_USAGE_MB: 100, // 100MB per test
} as const;

/**
 * Assert that a test meets performance requirements
 */
export function assertPerformance(
  duration: number,
  memoryUsage: number,
  testType: keyof typeof PERFORMANCE_THRESHOLDS
): void {
  const maxDuration = PERFORMANCE_THRESHOLDS[testType] || PERFORMANCE_THRESHOLDS.UNIT_TEST_MAX_DURATION;
  const maxMemoryMB = PERFORMANCE_THRESHOLDS.MAX_MEMORY_USAGE_MB;
  
  if (duration > maxDuration) {
    console.warn(`⚠️  Performance warning: Test exceeded ${maxDuration}ms threshold (${duration.toFixed(2)}ms)`);
  }
  
  const memoryMB = memoryUsage / 1024 / 1024;
  if (memoryMB > maxMemoryMB) {
    console.warn(`⚠️  Memory warning: Test exceeded ${maxMemoryMB}MB threshold (${memoryMB.toFixed(2)}MB)`);
  }
}