import 'server-only';
import { logger } from './logger';

interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count';
  timestamp: string;
  tags?: Record<string, string>;
}

interface DatabaseMetrics {
  queryCount: number;
  slowQueries: number;
  connectionPoolSize: number;
  activeConnections: number;
}

interface ApplicationMetrics {
  requestCount: number;
  errorCount: number;
  averageResponseTime: number;
  memoryUsage: NodeJS.MemoryUsage;
}

class MonitoringService {
  private metrics: PerformanceMetric[] = [];
  private isEnabled: boolean;

  constructor() {
    this.isEnabled = process.env.ENABLE_METRICS === 'true';
  }

  recordMetric(name: string, value: number, unit: 'ms' | 'bytes' | 'count', tags?: Record<string, string>): void {
    if (!this.isEnabled) return;

    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: new Date().toISOString(),
      tags,
    };

    this.metrics.push(metric);
    
    // Keep only last 1000 metrics in memory
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }

    // Log significant metrics
    if (this.isSignificantMetric(metric)) {
      logger.info(`Metric: ${name}`, { value, unit, tags });
    }
  }

  private isSignificantMetric(metric: PerformanceMetric): boolean {
    // Define what constitutes a significant metric worth logging
    switch (metric.name) {
      case 'api_response_time':
        return metric.value > 1000; // Log slow API responses (>1s)
      case 'database_query_time':
        return metric.value > 500; // Log slow database queries (>500ms)
      case 'memory_usage':
        return metric.value > 500 * 1024 * 1024; // Log high memory usage (>500MB)
      case 'error_count':
        return metric.value > 0; // Log all errors
      default:
        return false;
    }
  }

  // Timing utilities
  startTimer(name: string): () => void {
    const startTime = Date.now();
    return () => {
      const duration = Date.now() - startTime;
      this.recordMetric(name, duration, 'ms');
    };
  }

  // Database monitoring
  recordDatabaseQuery(queryType: string, duration: number, success: boolean): void {
    this.recordMetric('database_query_time', duration, 'ms', { 
      queryType, 
      success: success.toString() 
    });
    
    if (!success) {
      this.recordMetric('database_error_count', 1, 'count', { queryType });
    }
  }

  // API monitoring
  recordApiRequest(method: string, path: string, statusCode: number, duration: number): void {
    this.recordMetric('api_response_time', duration, 'ms', {
      method,
      path,
      statusCode: statusCode.toString(),
    });

    this.recordMetric('api_request_count', 1, 'count', {
      method,
      path,
      statusCode: statusCode.toString(),
    });

    if (statusCode >= 400) {
      this.recordMetric('api_error_count', 1, 'count', {
        method,
        path,
        statusCode: statusCode.toString(),
      });
    }
  }

  // Memory monitoring
  recordMemoryUsage(): void {
    if (typeof process !== 'undefined') {
      const memUsage = process.memoryUsage();
      this.recordMetric('memory_heap_used', memUsage.heapUsed, 'bytes');
      this.recordMetric('memory_heap_total', memUsage.heapTotal, 'bytes');
      this.recordMetric('memory_rss', memUsage.rss, 'bytes');
    }
  }

  // Get current metrics summary
  getMetricsSummary(): {
    database: Partial<DatabaseMetrics>;
    application: Partial<ApplicationMetrics>;
    recent: PerformanceMetric[];
  } {
    const recentMetrics = this.metrics.slice(-50); // Last 50 metrics
    
    // Calculate database metrics
    const dbQueries = this.metrics.filter(m => m.name === 'database_query_time');
    const dbErrors = this.metrics.filter(m => m.name === 'database_error_count');
    
    // Calculate application metrics
    const apiRequests = this.metrics.filter(m => m.name === 'api_request_count');
    const apiErrors = this.metrics.filter(m => m.name === 'api_error_count');
    const responseTimes = this.metrics.filter(m => m.name === 'api_response_time');
    
    const avgResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((sum, m) => sum + m.value, 0) / responseTimes.length
      : 0;

    return {
      database: {
        queryCount: dbQueries.length,
        slowQueries: dbQueries.filter(m => m.value > 500).length,
      },
      application: {
        requestCount: apiRequests.length,
        errorCount: apiErrors.length,
        averageResponseTime: avgResponseTime,
        memoryUsage: typeof process !== 'undefined' ? process.memoryUsage() : undefined,
      },
      recent: recentMetrics,
    };
  }

  // Export metrics for external monitoring systems
  exportMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  // Clear metrics (useful for testing)
  clearMetrics(): void {
    this.metrics = [];
  }
}

export const monitoring = new MonitoringService();

// Middleware helper for API route monitoring
export function withMonitoring<T extends (...args: any[]) => Promise<Response>>(
  handler: T,
  routeName: string
): T {
  return (async (...args: any[]) => {
    const startTime = Date.now();
    const request = args[0] as Request;
    
    try {
      const response = await handler(...args);
      const duration = Date.now() - startTime;
      
      monitoring.recordApiRequest(
        request.method,
        routeName,
        response.status,
        duration
      );
      
      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      monitoring.recordApiRequest(
        request.method,
        routeName,
        500,
        duration
      );
      
      throw error;
    }
  }) as T;
}