import 'server-only';
import { setupErrorHandling, logger } from '@/lib/utils/logger';
import { monitoring } from '@/lib/utils/monitoring';

// Initialize error handling and monitoring
let initialized = false;

export function initializeServerServices() {
  if (initialized) return;
  
  // Setup global error handling
  setupErrorHandling();
  
  // Log application startup
  logger.info('Fancy Planties application starting', {
    nodeEnv: process.env.NODE_ENV,
    version: process.env.npm_package_version || '0.1.0',
    pid: process.pid,
  });
  
  // Start memory monitoring in production
  if (process.env.NODE_ENV === 'production') {
    setInterval(() => {
      monitoring.recordMemoryUsage();
    }, 60000); // Every minute
  }
  
  initialized = true;
}

// Auto-initialize when this module is imported
initializeServerServices();