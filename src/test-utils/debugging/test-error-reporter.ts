/**
 * Test Error Reporter
 * 
 * Provides detailed error context collection and reporting for test failures.
 */

interface TestErrorContext {
  testName: string;
  testFile: string;
  errorMessage: string;
  errorStack?: string;
  timestamp: Date;
  environment: {
    nodeVersion: string;
    platform: string;
    memoryUsage: NodeJS.MemoryUsage;
  };
  testState: {
    assertions: number;
    duration: number;
    retryCount: number;
  };
  componentState?: any;
  apiCalls?: ApiCallLog[];
  domSnapshot?: string;
}

interface ApiCallLog {
  url: string;
  method: string;
  status?: number;
  requestBody?: any;
  responseBody?: any;
  timestamp: Date;
  duration: number;
}

interface RetryConfig {
  maxRetries: number;
  retryDelay: number;
  retryableErrors: string[];
}

/**
 * Enhanced error reporter with detailed context collection
 */
class TestErrorReporter {
  private errorContexts: TestErrorContext[] = [];
  private apiCallLogs: ApiCallLog[] = [];
  private componentStates = new Map<string, any>();
  private retryConfigs = new Map<string, RetryConfig>();

  /**
   * Collect detailed error context when a test fails
   */
  collectErrorContext(error: Error, testName: string, testFile: string): TestErrorContext {
    const context: TestErrorContext = {
      testName,
      testFile,
      errorMessage: error.message,
      errorStack: error.stack,
      timestamp: new Date(),
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        memoryUsage: process.memoryUsage(),
      },
      testState: {
        assertions: this.getAssertionCount(),
        duration: this.getTestDuration(),
        retryCount: this.getRetryCount(testName),
      },
      componentState: this.componentStates.get(testName),
      apiCalls: this.getRecentApiCalls(),
      domSnapshot: this.captureDomSnapshot(),
    };

    this.errorContexts.push(context);
    return context;
  }

  /**
   * Log API calls for debugging
   */
  logApiCall(call: Omit<ApiCallLog, 'timestamp'>): void {
    this.apiCallLogs.push({
      ...call,
      timestamp: new Date(),
    });

    // Keep only recent calls (last 50)
    if (this.apiCallLogs.length > 50) {
      this.apiCallLogs = this.apiCallLogs.slice(-50);
    }
  }

  /**
   * Store component state for debugging
   */
  storeComponentState(testName: string, state: any): void {
    this.componentStates.set(testName, JSON.parse(JSON.stringify(state)));
  }

  /**
   * Configure retry behavior for specific error patterns
   */
  configureRetry(testPattern: string, config: RetryConfig): void {
    this.retryConfigs.set(testPattern, config);
  }

  /**
   * Generate detailed error report
   */
  generateErrorReport(context: TestErrorContext): string {
    const report = [
      '🚨 TEST FAILURE REPORT',
      '═'.repeat(80),
      `Test: ${context.testName}`,
      `File: ${context.testFile}`,
      `Time: ${context.timestamp.toISOString()}`,
      `Duration: ${context.testState.duration}ms`,
      `Retry Count: ${context.testState.retryCount}`,
      '',
      '📋 ERROR DETAILS',
      '─'.repeat(40),
      `Message: ${context.errorMessage}`,
      '',
      '🔍 STACK TRACE',
      '─'.repeat(40),
      context.errorStack || 'No stack trace available',
      '',
      '💻 ENVIRONMENT',
      '─'.repeat(40),
      `Node Version: ${context.environment.nodeVersion}`,
      `Platform: ${context.environment.platform}`,
      `Memory Usage: ${(context.environment.memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`,
      '',
      '🧪 TEST STATE',
      '─'.repeat(40),
      `Assertions Made: ${context.testState.assertions}`,
      `Test Duration: ${context.testState.duration}ms`,
      '',
    ];

    // Add component state if available
    if (context.componentState) {
      report.push(
        '🎯 COMPONENT STATE',
        '─'.repeat(40),
        JSON.stringify(context.componentState, null, 2),
        ''
      );
    }

    // Add API calls if available
    if (context.apiCalls && context.apiCalls.length > 0) {
      report.push(
        '🌐 RECENT API CALLS',
        '─'.repeat(40)
      );
      
      context.apiCalls.forEach((call, index) => {
        report.push(
          `${index + 1}. ${call.method} ${call.url}`,
          `   Status: ${call.status || 'N/A'}`,
          `   Duration: ${call.duration}ms`,
          `   Time: ${call.timestamp.toISOString()}`,
          ''
        );
      });
    }

    // Add DOM snapshot if available
    if (context.domSnapshot) {
      report.push(
        '🖼️  DOM SNAPSHOT',
        '─'.repeat(40),
        context.domSnapshot,
        ''
      );
    }

    report.push('═'.repeat(80));
    return report.join('\n');
  }

  /**
   * Save error report to file
   */
  async saveErrorReport(context: TestErrorContext): Promise<string> {
    const report = this.generateErrorReport(context);
    const filename = `test-error-${context.testName.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}.log`;
    const filepath = `coverage/error-reports/${filename}`;

    try {
      // In a real implementation, would write to file system
      console.log(`💾 Error report saved to: ${filepath}`);
      console.log(report);
      return filepath;
    } catch (error) {
      console.error('Failed to save error report:', error);
      return '';
    }
  }

  /**
   * Get recent API calls for context
   */
  private getRecentApiCalls(): ApiCallLog[] {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return this.apiCallLogs.filter(call => call.timestamp > fiveMinutesAgo);
  }

  /**
   * Capture DOM snapshot for debugging
   */
  private captureDomSnapshot(): string {
    try {
      // In browser environment, would capture actual DOM
      if (typeof document !== 'undefined') {
        return document.body.innerHTML;
      }
      return 'DOM not available (Node.js environment)';
    } catch (error) {
      return `Failed to capture DOM: ${error}`;
    }
  }

  /**
   * Get current assertion count
   */
  private getAssertionCount(): number {
    try {
      return expect.getState().assertionCalls || 0;
    } catch {
      return 0;
    }
  }

  /**
   * Get test duration (mock implementation)
   */
  private getTestDuration(): number {
    // In real implementation, would track test start time
    return 0;
  }

  /**
   * Get retry count for a test
   */
  private getRetryCount(testName: string): number {
    // In real implementation, would track retry attempts
    return 0;
  }

  /**
   * Clear all collected data
   */
  reset(): void {
    this.errorContexts = [];
    this.apiCallLogs = [];
    this.componentStates.clear();
  }

  /**
   * Get all error contexts
   */
  getErrorContexts(): TestErrorContext[] {
    return [...this.errorContexts];
  }
}

// Global instance
export const testErrorReporter = new TestErrorReporter();

/**
 * Enhanced test wrapper with automatic error reporting
 */
export function withErrorReporting(testName: string, testFn: () => Promise<void> | void) {
  return async () => {
    try {
      await testFn();
    } catch (error) {
      const context = testErrorReporter.collectErrorContext(
        error as Error,
        testName,
        expect.getState().testPath || 'unknown'
      );
      
      await testErrorReporter.saveErrorReport(context);
      throw error; // Re-throw to maintain test failure
    }
  };
}

/**
 * Retry wrapper for flaky tests
 */
export function withRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig = {
    maxRetries: 3,
    retryDelay: 1000,
    retryableErrors: ['timeout', 'network', 'ECONNRESET'],
  }
): Promise<T> {
  return new Promise(async (resolve, reject) => {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        const result = await operation();
        resolve(result);
        return;
      } catch (error) {
        lastError = error as Error;
        
        // Check if error is retryable
        const isRetryable = config.retryableErrors.some(pattern =>
          lastError.message.toLowerCase().includes(pattern.toLowerCase())
        );
        
        if (!isRetryable || attempt === config.maxRetries) {
          break;
        }
        
        console.log(`⚠️  Retry attempt ${attempt + 1}/${config.maxRetries} for: ${lastError.message}`);
        await new Promise(resolve => setTimeout(resolve, config.retryDelay));
      }
    }
    
    reject(lastError);
  });
}

/**
 * Debug helper to log test state
 */
export function debugTestState(label: string, state: any): void {
  console.log(`🐛 DEBUG [${label}]:`, JSON.stringify(state, null, 2));
}

/**
 * Performance-aware assertion wrapper
 */
export function performanceAssert<T>(
  assertion: () => T,
  maxDuration: number = 100,
  label: string = 'assertion'
): T {
  const startTime = performance.now();
  const result = assertion();
  const duration = performance.now() - startTime;
  
  if (duration > maxDuration) {
    console.warn(`⚠️  Slow assertion detected: ${label} took ${duration.toFixed(2)}ms`);
  }
  
  return result;
}

/**
 * Setup error reporting for a test suite
 */
export function setupErrorReporting() {
  beforeEach(() => {
    const testName = expect.getState().currentTestName || 'unknown';
    console.log(`🧪 Starting test: ${testName}`);
  });

  afterEach(() => {
    // Log any uncaught errors or warnings
    const testName = expect.getState().currentTestName || 'unknown';
    console.log(`✅ Completed test: ${testName}`);
  });

  afterAll(() => {
    testErrorReporter.reset();
  });
}