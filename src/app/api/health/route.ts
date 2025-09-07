import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { monitoring } from '@/lib/utils/monitoring';
import { logger } from '@/lib/utils/logger';
import '@/lib/init'; // Initialize server services

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Check database connectivity
    const dbStart = Date.now();
    await db.execute('SELECT 1');
    const dbDuration = Date.now() - dbStart;
    
    // Record database performance
    monitoring.recordDatabaseQuery('health_check', dbDuration, true);
    
    // Get metrics summary
    const metrics = monitoring.getMetricsSummary();
    
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '0.1.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      database: {
        status: 'connected',
        responseTime: dbDuration
      },
      metrics: {
        memoryUsage: metrics.application.memoryUsage,
        requestCount: metrics.application.requestCount,
        errorCount: metrics.application.errorCount,
        averageResponseTime: metrics.application.averageResponseTime
      }
    };

    const duration = Date.now() - startTime;
    monitoring.recordApiRequest('GET', '/api/health', 200, duration);
    
    logger.debug('Health check completed', { duration, dbDuration });

    return NextResponse.json(healthData, { 
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    
    // Record database error
    monitoring.recordDatabaseQuery('health_check', duration, false);
    monitoring.recordApiRequest('GET', '/api/health', 503, duration);
    
    logger.error('Health check failed', error instanceof Error ? error : new Error(String(error)));
    
    const errorData = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '0.1.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      database: {
        status: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    };

    return NextResponse.json(errorData, { 
      status: 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  }
}