/**
 * Test Benchmarking and Alerting System
 * 
 * Provides performance benchmarking and alerting for CI/CD integration.
 */

interface BenchmarkResult {
  testName: string;
  duration: number;
  memoryUsage: number;
  timestamp: Date;
  environment: 'local' | 'ci';
  branch?: string;
  commit?: string;
}

interface BenchmarkThresholds {
  maxDuration: number;
  maxMemoryMB: number;
  regressionThreshold: number; // Percentage increase that triggers alert
}

interface PerformanceAlert {
  type: 'duration' | 'memory' | 'regression';
  severity: 'warning' | 'error';
  testName: string;
  current: number;
  threshold: number;
  baseline?: number;
  message: string;
}

interface BenchmarkReport {
  summary: {
    totalTests: number;
    averageDuration: number;
    totalDuration: number;
    memoryPeak: number;
    alertCount: number;
  };
  alerts: PerformanceAlert[];
  slowestTests: BenchmarkResult[];
  regressions: Array<{
    testName: string;
    currentDuration: number;
    baselineDuration: number;
    regressionPercent: number;
  }>;
}

/**
 * Test benchmarking system for performance monitoring
 */
class TestBenchmarkingSystem {
  private results: BenchmarkResult[] = [];
  private baselines = new Map<string, BenchmarkResult>();
  private thresholds: Map<string, BenchmarkThresholds> = new Map();
  private alerts: PerformanceAlert[] = [];

  constructor() {
    // Load baseline data if available
    this.loadBaselines();
    
    // Set default thresholds
    this.setDefaultThresholds();
  }

  /**
   * Record a benchmark result
   */
  recordBenchmark(
    testName: string,
    duration: number,
    memoryUsage: number,
    environment: 'local' | 'ci' = 'local'
  ): void {
    const result: BenchmarkResult = {
      testName,
      duration,
      memoryUsage,
      timestamp: new Date(),
      environment,
      branch: process.env.GITHUB_REF_NAME || process.env.BRANCH_NAME,
      commit: process.env.GITHUB_SHA || process.env.COMMIT_SHA,
    };

    this.results.push(result);
    this.checkThresholds(result);
    this.checkRegression(result);
  }

  /**
   * Set performance thresholds for a test
   */
  setThresholds(testName: string, thresholds: BenchmarkThresholds): void {
    this.thresholds.set(testName, thresholds);
  }

  /**
   * Set baseline performance for comparison
   */
  setBaseline(testName: string, result: BenchmarkResult): void {
    this.baselines.set(testName, result);
  }

  /**
   * Generate comprehensive benchmark report
   */
  generateReport(): BenchmarkReport {
    const totalTests = this.results.length;
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);
    const averageDuration = totalTests > 0 ? totalDuration / totalTests : 0;
    const memoryPeak = Math.max(...this.results.map(r => r.memoryUsage));

    // Find slowest tests
    const slowestTests = [...this.results]
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10);

    // Find regressions
    const regressions = this.findRegressions();

    return {
      summary: {
        totalTests,
        averageDuration,
        totalDuration,
        memoryPeak: memoryPeak / 1024 / 1024, // Convert to MB
        alertCount: this.alerts.length,
      },
      alerts: [...this.alerts],
      slowestTests,
      regressions,
    };
  }

  /**
   * Generate CI-friendly report output
   */
  generateCIReport(): string {
    const report = this.generateReport();
    const lines: string[] = [];

    lines.push('## 📊 Test Performance Report');
    lines.push('');
    lines.push('### 📈 Summary');
    lines.push(`- **Total Tests**: ${report.summary.totalTests}`);
    lines.push(`- **Average Duration**: ${report.summary.averageDuration.toFixed(2)}ms`);
    lines.push(`- **Total Duration**: ${report.summary.totalDuration.toFixed(2)}ms`);
    lines.push(`- **Memory Peak**: ${report.summary.memoryPeak.toFixed(2)}MB`);
    lines.push(`- **Alerts**: ${report.summary.alertCount}`);
    lines.push('');

    // Alerts section
    if (report.alerts.length > 0) {
      lines.push('### 🚨 Performance Alerts');
      lines.push('| Test | Type | Severity | Details |');
      lines.push('|------|------|----------|---------|');
      
      report.alerts.forEach(alert => {
        const icon = alert.severity === 'error' ? '🔴' : '⚠️';
        lines.push(`| ${alert.testName} | ${alert.type} | ${icon} ${alert.severity} | ${alert.message} |`);
      });
      lines.push('');
    }

    // Slowest tests
    if (report.slowestTests.length > 0) {
      lines.push('### 🐌 Slowest Tests');
      lines.push('| Test | Duration | Memory |');
      lines.push('|------|----------|--------|');
      
      report.slowestTests.slice(0, 5).forEach(test => {
        lines.push(`| ${test.testName} | ${test.duration.toFixed(2)}ms | ${(test.memoryUsage / 1024 / 1024).toFixed(2)}MB |`);
      });
      lines.push('');
    }

    // Regressions
    if (report.regressions.length > 0) {
      lines.push('### 📉 Performance Regressions');
      lines.push('| Test | Current | Baseline | Regression |');
      lines.push('|------|---------|----------|------------|');
      
      report.regressions.forEach(regression => {
        lines.push(`| ${regression.testName} | ${regression.currentDuration.toFixed(2)}ms | ${regression.baselineDuration.toFixed(2)}ms | +${regression.regressionPercent.toFixed(1)}% |`);
      });
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Export benchmark data for storage
   */
  exportData(): any {
    return {
      results: this.results,
      baselines: Object.fromEntries(this.baselines),
      thresholds: Object.fromEntries(this.thresholds),
      alerts: this.alerts,
      timestamp: new Date().toISOString(),
      environment: process.env.CI ? 'ci' : 'local',
    };
  }

  /**
   * Import benchmark data
   */
  importData(data: any): void {
    if (data.results) {
      this.results = data.results;
    }
    if (data.baselines) {
      this.baselines = new Map(Object.entries(data.baselines));
    }
    if (data.thresholds) {
      this.thresholds = new Map(Object.entries(data.thresholds));
    }
    if (data.alerts) {
      this.alerts = data.alerts;
    }
  }

  /**
   * Check if result exceeds thresholds
   */
  private checkThresholds(result: BenchmarkResult): void {
    const thresholds = this.thresholds.get(result.testName) || this.getDefaultThresholds();
    
    // Check duration threshold
    if (result.duration > thresholds.maxDuration) {
      this.alerts.push({
        type: 'duration',
        severity: result.duration > thresholds.maxDuration * 2 ? 'error' : 'warning',
        testName: result.testName,
        current: result.duration,
        threshold: thresholds.maxDuration,
        message: `Test duration ${result.duration.toFixed(2)}ms exceeds threshold ${thresholds.maxDuration}ms`,
      });
    }

    // Check memory threshold
    const memoryMB = result.memoryUsage / 1024 / 1024;
    if (memoryMB > thresholds.maxMemoryMB) {
      this.alerts.push({
        type: 'memory',
        severity: memoryMB > thresholds.maxMemoryMB * 2 ? 'error' : 'warning',
        testName: result.testName,
        current: memoryMB,
        threshold: thresholds.maxMemoryMB,
        message: `Memory usage ${memoryMB.toFixed(2)}MB exceeds threshold ${thresholds.maxMemoryMB}MB`,
      });
    }
  }

  /**
   * Check for performance regression
   */
  private checkRegression(result: BenchmarkResult): void {
    const baseline = this.baselines.get(result.testName);
    if (!baseline) return;

    const thresholds = this.thresholds.get(result.testName) || this.getDefaultThresholds();
    const regressionPercent = ((result.duration - baseline.duration) / baseline.duration) * 100;

    if (regressionPercent > thresholds.regressionThreshold) {
      this.alerts.push({
        type: 'regression',
        severity: regressionPercent > thresholds.regressionThreshold * 2 ? 'error' : 'warning',
        testName: result.testName,
        current: result.duration,
        threshold: baseline.duration * (1 + thresholds.regressionThreshold / 100),
        baseline: baseline.duration,
        message: `Performance regression of ${regressionPercent.toFixed(1)}% detected`,
      });
    }
  }

  /**
   * Find all performance regressions
   */
  private findRegressions(): Array<{
    testName: string;
    currentDuration: number;
    baselineDuration: number;
    regressionPercent: number;
  }> {
    const regressions: Array<{
      testName: string;
      currentDuration: number;
      baselineDuration: number;
      regressionPercent: number;
    }> = [];

    this.results.forEach(result => {
      const baseline = this.baselines.get(result.testName);
      if (baseline) {
        const regressionPercent = ((result.duration - baseline.duration) / baseline.duration) * 100;
        if (regressionPercent > 10) { // 10% threshold for reporting
          regressions.push({
            testName: result.testName,
            currentDuration: result.duration,
            baselineDuration: baseline.duration,
            regressionPercent,
          });
        }
      }
    });

    return regressions.sort((a, b) => b.regressionPercent - a.regressionPercent);
  }

  /**
   * Load baseline data from storage
   */
  private loadBaselines(): void {
    try {
      // In a real implementation, would load from file or database
      const baselineData = process.env.BENCHMARK_BASELINES;
      if (baselineData) {
        const baselines = JSON.parse(baselineData);
        this.baselines = new Map(Object.entries(baselines));
      }
    } catch (error) {
      console.warn('Failed to load benchmark baselines:', error);
    }
  }

  /**
   * Set default performance thresholds
   */
  private setDefaultThresholds(): void {
    const defaultThresholds: BenchmarkThresholds = {
      maxDuration: 1000, // 1 second
      maxMemoryMB: 50, // 50MB
      regressionThreshold: 20, // 20% increase
    };

    // Set specific thresholds for different test types
    this.thresholds.set('unit', {
      maxDuration: 100,
      maxMemoryMB: 10,
      regressionThreshold: 15,
    });

    this.thresholds.set('integration', {
      maxDuration: 2000,
      maxMemoryMB: 100,
      regressionThreshold: 25,
    });

    this.thresholds.set('e2e', {
      maxDuration: 10000,
      maxMemoryMB: 200,
      regressionThreshold: 30,
    });
  }

  /**
   * Get default thresholds
   */
  private getDefaultThresholds(): BenchmarkThresholds {
    return {
      maxDuration: 1000,
      maxMemoryMB: 50,
      regressionThreshold: 20,
    };
  }

  /**
   * Clear all data
   */
  reset(): void {
    this.results = [];
    this.alerts = [];
  }
}

// Global instance
export const testBenchmarkingSystem = new TestBenchmarkingSystem();

/**
 * Jest helper for automatic benchmarking
 */
export function withBenchmarking(testType: 'unit' | 'integration' | 'e2e' = 'unit') {
  beforeEach(() => {
    const testName = expect.getState().currentTestName || 'unknown';
    const startTime = performance.now();
    const startMemory = process.memoryUsage().heapUsed;
    
    // Store start metrics
    (global as any).__testStartTime = startTime;
    (global as any).__testStartMemory = startMemory;
  });

  afterEach(() => {
    const testName = expect.getState().currentTestName || 'unknown';
    const endTime = performance.now();
    const endMemory = process.memoryUsage().heapUsed;
    
    const duration = endTime - (global as any).__testStartTime;
    const memoryUsage = endMemory - (global as any).__testStartMemory;
    
    testBenchmarkingSystem.recordBenchmark(
      testName,
      duration,
      memoryUsage,
      process.env.CI ? 'ci' : 'local'
    );
  });
}

/**
 * Manual benchmark recording
 */
export function recordBenchmark(testName: string, duration: number, memoryUsage: number): void {
  testBenchmarkingSystem.recordBenchmark(testName, duration, memoryUsage);
}

/**
 * Generate and save benchmark report
 */
export async function saveBenchmarkReport(outputPath: string = 'coverage/benchmark-report.json'): Promise<void> {
  const report = testBenchmarkingSystem.generateReport();
  const data = testBenchmarkingSystem.exportData();
  
  try {
    // Save detailed data
    const fs = await import('fs');
    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
    
    // Save CI report
    const ciReport = testBenchmarkingSystem.generateCIReport();
    fs.writeFileSync(outputPath.replace('.json', '-ci.md'), ciReport);
    
    console.log(`📊 Benchmark report saved to ${outputPath}`);
  } catch (error) {
    console.error('Failed to save benchmark report:', error);
  }
}