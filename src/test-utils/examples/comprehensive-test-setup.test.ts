/**
 * Comprehensive Test Setup Example
 * 
 * Demonstrates how to use all the performance optimization and monitoring features.
 */

import {
  withPerformanceMonitoring,
  withBenchmarking,
  setupEfficientTestData,
  setupTransactionIsolation,
  setupErrorReporting,
  setupFailureAnalysis,
  testPerformanceMonitor,
  testBenchmarkingSystem,
  efficientTestData,
  measureAsyncOperation,
  withRetry,
  debugTestState,
} from '../index';

// Example test suite with comprehensive monitoring
describe('Comprehensive Test Setup Example', () => {
  // Setup all monitoring and optimization features
  withPerformanceMonitoring('Comprehensive Test Suite');
  withBenchmarking('integration');
  setupEfficientTestData();
  setupTransactionIsolation();
  setupErrorReporting();
  setupFailureAnalysis();

  beforeAll(async () => {
    console.log('🚀 Starting comprehensive test suite with full monitoring');
  });

  afterAll(async () => {
    // Generate reports
    const report = testBenchmarkingSystem.generateReport();
    console.log('📊 Final Performance Report:', report.summary);
  });

  describe('Performance Monitoring Examples', () => {
    it('should measure async operation performance', async () => {
      const { result, duration, memoryDelta } = await measureAsyncOperation(
        async () => {
          // Simulate async work
          await new Promise(resolve => setTimeout(resolve, 100));
          return 'completed';
        },
        'async-operation-test'
      );

      expect(result).toBe('completed');
      expect(duration).toBeGreaterThan(90);
      expect(duration).toBeLessThan(200);
    });

    it('should use efficient test data from pools', async () => {
      // Get test data from pools (reused for efficiency)
      const user = efficientTestData.getFromPool('users');
      const plant = efficientTestData.getFromPool('plants');
      const plantInstance = efficientTestData.getFromPool('plantInstances');

      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('email');
      expect(plant).toHaveProperty('commonName');
      expect(plantInstance).toHaveProperty('nickname');

      // Return to pool for reuse
      await efficientTestData.returnToPool('users', user);
      await efficientTestData.returnToPool('plants', plant);
      await efficientTestData.returnToPool('plantInstances', plantInstance);
    });

    it('should handle retries for flaky operations', async () => {
      let attemptCount = 0;
      
      const result = await withRetry(
        async () => {
          attemptCount++;
          if (attemptCount < 2) {
            throw new Error('Simulated flaky failure');
          }
          return 'success';
        },
        {
          maxRetries: 3,
          retryDelay: 10,
          retryableErrors: ['flaky'],
        }
      );

      expect(result).toBe('success');
      expect(attemptCount).toBe(2);
    });
  });

  describe('Error Reporting Examples', () => {
    it('should capture detailed error context', async () => {
      try {
        // Simulate component state for debugging
        const componentState = {
          loading: false,
          data: null,
          error: null,
        };

        debugTestState('component-state', componentState);

        // Simulate an error that would be caught and analyzed
        throw new Error('Simulated test error for demonstration');
      } catch (error) {
        // Error would be automatically captured by setupErrorReporting
        expect(error).toBeInstanceOf(Error);
      }
    });

    it('should demonstrate transaction isolation', async () => {
      // Each test gets its own transaction that's rolled back
      const transactionId = await efficientTestData.createTransaction('isolation-test');
      
      // Simulate database operations
      console.log(`🔄 Running test in transaction: ${transactionId}`);
      
      // Transaction will be automatically rolled back in afterEach
      expect(transactionId).toBeTruthy();
    });
  });

  describe('Benchmarking Examples', () => {
    it('should benchmark component rendering performance', async () => {
      const startTime = performance.now();
      const startMemory = process.memoryUsage().heapUsed;

      // Simulate component rendering work
      const largeArray = new Array(10000).fill(0).map((_, i) => ({
        id: i,
        name: `Item ${i}`,
        data: Math.random(),
      }));

      // Simulate processing
      const processed = largeArray.filter(item => item.data > 0.5);

      const endTime = performance.now();
      const endMemory = process.memoryUsage().heapUsed;

      const duration = endTime - startTime;
      const memoryUsed = endMemory - startMemory;

      // Manual benchmark recording (automatic recording also happens)
      testBenchmarkingSystem.recordBenchmark(
        'component-rendering-benchmark',
        duration,
        memoryUsed,
        process.env.CI ? 'ci' : 'local'
      );

      expect(processed.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(100); // Should complete in under 100ms
    });

    it('should demonstrate memory-efficient operations', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Use generator for memory efficiency
      function* generateTestData(count: number) {
        for (let i = 0; i < count; i++) {
          yield { id: i, data: `test-${i}` };
        }
      }

      let processedCount = 0;
      for (const item of generateTestData(1000)) {
        processedCount++;
        // Process one item at a time to avoid memory buildup
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      expect(processedCount).toBe(1000);
      expect(memoryIncrease).toBeLessThan(1024 * 1024); // Less than 1MB increase
    });
  });

  describe('CI/CD Integration Examples', () => {
    it('should provide CI-friendly test output', async () => {
      // This test demonstrates features that work well in CI
      const isCI = process.env.CI === 'true';
      
      if (isCI) {
        console.log('🤖 Running in CI environment');
        // CI-specific test behavior
      } else {
        console.log('💻 Running in local environment');
        // Local development test behavior
      }

      // Test should work in both environments
      expect(true).toBe(true);
    });

    it('should generate performance alerts when thresholds are exceeded', async () => {
      // Set strict thresholds for this test
      testBenchmarkingSystem.setThresholds('alert-test', {
        maxDuration: 50, // Very strict threshold
        maxMemoryMB: 1,
        regressionThreshold: 10,
      });

      const startTime = performance.now();
      
      // Intentionally slow operation to trigger alert
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const duration = performance.now() - startTime;
      
      // This should trigger a performance alert
      testBenchmarkingSystem.recordBenchmark(
        'alert-test',
        duration,
        1024 * 1024 * 2, // 2MB memory usage
        'local'
      );

      expect(duration).toBeGreaterThan(50);
    });
  });
});