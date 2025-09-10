/**
 * Test Failure Analyzer
 * 
 * Analyzes test failures to identify patterns and suggest fixes.
 */

interface FailurePattern {
  pattern: RegExp;
  category: string;
  description: string;
  suggestedFix: string;
  commonCauses: string[];
}

interface FailureAnalysis {
  category: string;
  confidence: number;
  description: string;
  suggestedFix: string;
  commonCauses: string[];
  relatedPatterns: string[];
}

interface TestFailureStats {
  totalFailures: number;
  categorizedFailures: Record<string, number>;
  mostCommonFailures: Array<{ pattern: string; count: number }>;
  flakyTests: string[];
  slowTests: string[];
}

/**
 * Analyzes test failures and provides actionable insights
 */
class TestFailureAnalyzer {
  private failurePatterns: FailurePattern[] = [
    {
      pattern: /Cannot read propert(y|ies) of undefined/i,
      category: 'Null/Undefined Access',
      description: 'Attempting to access properties on undefined or null values',
      suggestedFix: 'Add null checks or use optional chaining (?.)',
      commonCauses: [
        'Component props not properly mocked',
        'Async data not loaded before test assertion',
        'Missing default values in component state',
      ],
    },
    {
      pattern: /act\(\) warning|not wrapped in act/i,
      category: 'React Testing',
      description: 'React state updates not wrapped in act()',
      suggestedFix: 'Wrap state updates in act() or use waitFor()',
      commonCauses: [
        'Async state updates in useEffect',
        'Timer-based state changes',
        'Promise-based state updates',
      ],
    },
    {
      pattern: /timeout|exceeded.*timeout/i,
      category: 'Timeout',
      description: 'Test exceeded maximum execution time',
      suggestedFix: 'Increase timeout or optimize async operations',
      commonCauses: [
        'Slow API calls or database queries',
        'Infinite loops or recursive calls',
        'Waiting for elements that never appear',
      ],
    },
    {
      pattern: /network error|fetch.*failed|ECONNREFUSED/i,
      category: 'Network',
      description: 'Network-related test failures',
      suggestedFix: 'Mock network calls or check test environment setup',
      commonCauses: [
        'Unmocked API calls in tests',
        'Test environment network restrictions',
        'External service dependencies',
      ],
    },
    {
      pattern: /element not found|unable to find.*element/i,
      category: 'DOM/Element',
      description: 'Expected DOM elements not found',
      suggestedFix: 'Check element selectors and rendering conditions',
      commonCauses: [
        'Incorrect test selectors',
        'Conditional rendering not met',
        'Async rendering not awaited',
      ],
    },
    {
      pattern: /memory.*leak|heap.*out.*memory/i,
      category: 'Memory',
      description: 'Memory-related issues in tests',
      suggestedFix: 'Check for memory leaks and improve cleanup',
      commonCauses: [
        'Event listeners not cleaned up',
        'Timers not cleared',
        'Large test data sets',
      ],
    },
    {
      pattern: /database.*error|connection.*failed/i,
      category: 'Database',
      description: 'Database connection or query failures',
      suggestedFix: 'Check database setup and connection configuration',
      commonCauses: [
        'Test database not properly initialized',
        'Connection pool exhaustion',
        'Transaction isolation issues',
      ],
    },
    {
      pattern: /authentication.*failed|unauthorized|403|401/i,
      category: 'Authentication',
      description: 'Authentication-related test failures',
      suggestedFix: 'Verify test user setup and authentication mocks',
      commonCauses: [
        'Test user not properly authenticated',
        'Session mocks not configured',
        'Permission checks failing',
      ],
    },
  ];

  private failureHistory: Array<{
    testName: string;
    error: string;
    timestamp: Date;
    category: string;
  }> = [];

  /**
   * Analyze a test failure and provide insights
   */
  analyzeFailure(error: Error, testName: string): FailureAnalysis {
    const errorMessage = error.message + (error.stack || '');
    
    // Find matching patterns
    const matches = this.failurePatterns
      .map(pattern => ({
        pattern,
        match: pattern.pattern.test(errorMessage),
        confidence: this.calculateConfidence(pattern.pattern, errorMessage),
      }))
      .filter(match => match.match)
      .sort((a, b) => b.confidence - a.confidence);

    const bestMatch = matches[0];
    
    if (bestMatch) {
      // Record failure for statistics
      this.recordFailure(testName, errorMessage, bestMatch.pattern.category);
      
      return {
        category: bestMatch.pattern.category,
        confidence: bestMatch.confidence,
        description: bestMatch.pattern.description,
        suggestedFix: bestMatch.pattern.suggestedFix,
        commonCauses: bestMatch.pattern.commonCauses,
        relatedPatterns: matches.slice(1, 3).map(m => m.pattern.category),
      };
    }

    // Unknown failure pattern
    this.recordFailure(testName, errorMessage, 'Unknown');
    
    return {
      category: 'Unknown',
      confidence: 0,
      description: 'Unrecognized failure pattern',
      suggestedFix: 'Review error message and stack trace for specific issues',
      commonCauses: ['Unique test scenario', 'New type of error'],
      relatedPatterns: [],
    };
  }

  /**
   * Generate failure statistics and insights
   */
  generateFailureStats(): TestFailureStats {
    const categorizedFailures: Record<string, number> = {};
    const testFailureCounts: Record<string, number> = {};
    
    // Count failures by category and test
    this.failureHistory.forEach(failure => {
      categorizedFailures[failure.category] = (categorizedFailures[failure.category] || 0) + 1;
      testFailureCounts[failure.testName] = (testFailureCounts[failure.testName] || 0) + 1;
    });

    // Find most common failure patterns
    const mostCommonFailures = Object.entries(categorizedFailures)
      .map(([pattern, count]) => ({ pattern, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Identify flaky tests (multiple failures)
    const flakyTests = Object.entries(testFailureCounts)
      .filter(([, count]) => count > 1)
      .map(([testName]) => testName);

    return {
      totalFailures: this.failureHistory.length,
      categorizedFailures,
      mostCommonFailures,
      flakyTests,
      slowTests: [], // Would be populated from performance monitoring
    };
  }

  /**
   * Generate actionable failure report
   */
  generateFailureReport(): string {
    const stats = this.generateFailureStats();
    
    const report = [
      '📊 TEST FAILURE ANALYSIS REPORT',
      '═'.repeat(60),
      `Total Failures Analyzed: ${stats.totalFailures}`,
      '',
      '🔥 Most Common Failure Categories:',
      '─'.repeat(40),
    ];

    stats.mostCommonFailures.forEach((failure, index) => {
      report.push(`${index + 1}. ${failure.pattern}: ${failure.count} failures`);
    });

    if (stats.flakyTests.length > 0) {
      report.push(
        '',
        '🎲 Flaky Tests (Multiple Failures):',
        '─'.repeat(40),
        ...stats.flakyTests.map(test => `• ${test}`)
      );
    }

    report.push(
      '',
      '💡 Recommendations:',
      '─'.repeat(40),
    );

    // Generate recommendations based on most common failures
    stats.mostCommonFailures.forEach(failure => {
      const pattern = this.failurePatterns.find(p => p.category === failure.pattern);
      if (pattern) {
        report.push(`• ${pattern.category}: ${pattern.suggestedFix}`);
      }
    });

    report.push('═'.repeat(60));
    return report.join('\n');
  }

  /**
   * Get suggestions for a specific test
   */
  getTestSuggestions(testName: string): string[] {
    const testFailures = this.failureHistory.filter(f => f.testName === testName);
    const suggestions: string[] = [];

    if (testFailures.length > 1) {
      suggestions.push('This test appears to be flaky - consider adding retry logic or improving test stability');
    }

    const categories = [...new Set(testFailures.map(f => f.category))];
    categories.forEach(category => {
      const pattern = this.failurePatterns.find(p => p.category === category);
      if (pattern) {
        suggestions.push(`${category}: ${pattern.suggestedFix}`);
      }
    });

    return suggestions;
  }

  /**
   * Record a failure for analysis
   */
  private recordFailure(testName: string, error: string, category: string): void {
    this.failureHistory.push({
      testName,
      error,
      timestamp: new Date(),
      category,
    });

    // Keep only recent failures (last 1000)
    if (this.failureHistory.length > 1000) {
      this.failureHistory = this.failureHistory.slice(-1000);
    }
  }

  /**
   * Calculate confidence score for pattern match
   */
  private calculateConfidence(pattern: RegExp, errorMessage: string): number {
    const matches = errorMessage.match(pattern);
    if (!matches) return 0;

    // Base confidence on match length and position
    const matchLength = matches[0].length;
    const messageLength = errorMessage.length;
    const position = errorMessage.indexOf(matches[0]);
    
    // Higher confidence for longer matches and matches near the beginning
    const lengthScore = Math.min(matchLength / 50, 1); // Max 1.0
    const positionScore = Math.max(1 - (position / messageLength), 0.1); // Min 0.1
    
    return (lengthScore + positionScore) / 2;
  }

  /**
   * Clear failure history
   */
  reset(): void {
    this.failureHistory = [];
  }

  /**
   * Export failure data for external analysis
   */
  exportFailureData(): any {
    return {
      patterns: this.failurePatterns,
      history: this.failureHistory,
      stats: this.generateFailureStats(),
    };
  }
}

// Global instance
export const testFailureAnalyzer = new TestFailureAnalyzer();

/**
 * Jest setup helper for automatic failure analysis
 */
export function setupFailureAnalysis() {
  // Hook into Jest's error handling
  const originalIt = global.it;
  
  global.it = (name: string, fn?: jest.ProvidesCallback, timeout?: number) => {
    return originalIt(name, async () => {
      try {
        if (fn) {
          await fn();
        }
      } catch (error) {
        const analysis = testFailureAnalyzer.analyzeFailure(error as Error, name);
        
        console.log('\n🔍 FAILURE ANALYSIS');
        console.log('─'.repeat(40));
        console.log(`Category: ${analysis.category} (${(analysis.confidence * 100).toFixed(1)}% confidence)`);
        console.log(`Description: ${analysis.description}`);
        console.log(`Suggested Fix: ${analysis.suggestedFix}`);
        
        if (analysis.commonCauses.length > 0) {
          console.log('Common Causes:');
          analysis.commonCauses.forEach(cause => console.log(`  • ${cause}`));
        }
        
        throw error; // Re-throw to maintain test failure
      }
    }, timeout);
  };
}

/**
 * Manual failure analysis helper
 */
export function analyzeTestFailure(error: Error, testName: string): void {
  const analysis = testFailureAnalyzer.analyzeFailure(error, testName);
  console.log('🔍 Test Failure Analysis:', analysis);
}