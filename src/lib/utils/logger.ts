import 'server-only';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, any>;
  error?: Error;
  userId?: number;
  requestId?: string;
}

class Logger {
  private logLevel: LogLevel;

  constructor() {
    this.logLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
    };
    return levels[level] >= levels[this.logLevel];
  }

  private formatLog(entry: LogEntry): string {
    const { level, message, timestamp, context, error, userId, requestId } = entry;
    
    const logData = {
      level: level.toUpperCase(),
      timestamp,
      message,
      ...(userId && { userId }),
      ...(requestId && { requestId }),
      ...(context && { context }),
      ...(error && { 
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        }
      }),
    };

    return JSON.stringify(logData);
  }

  private log(level: LogLevel, message: string, context?: Record<string, any>, error?: Error): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
      error,
    };

    const formattedLog = this.formatLog(entry);

    // In production, you might want to send logs to external service
    if (process.env.NODE_ENV === 'production') {
      // Send to external logging service (e.g., DataDog, LogRocket, etc.)
      this.sendToExternalLogger(entry);
    }

    // Console output for development and as fallback
    switch (level) {
      case 'debug':
        console.debug(formattedLog);
        break;
      case 'info':
        console.info(formattedLog);
        break;
      case 'warn':
        console.warn(formattedLog);
        break;
      case 'error':
        console.error(formattedLog);
        break;
    }
  }

  private async sendToExternalLogger(entry: LogEntry): Promise<void> {
    // Implement external logging service integration here
    // Example: Send to DataDog, LogRocket, Sentry, etc.
    try {
      // await externalLoggingService.send(entry);
    } catch (error) {
      // Fallback to console if external service fails
      console.error('Failed to send log to external service:', error);
      console.error('Original log entry:', this.formatLog(entry));
    }
  }

  debug(message: string, context?: Record<string, any>): void {
    this.log('debug', message, context);
  }

  info(message: string, context?: Record<string, any>): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: Record<string, any>): void {
    this.log('warn', message, context);
  }

  error(message: string, error?: Error, context?: Record<string, any>): void {
    this.log('error', message, context, error);
  }

  // Specific logging methods for common scenarios
  authEvent(event: string, userId?: number, context?: Record<string, any>): void {
    this.info(`Auth: ${event}`, { ...context, userId });
  }

  databaseEvent(event: string, context?: Record<string, any>): void {
    this.debug(`Database: ${event}`, context);
  }

  apiRequest(method: string, path: string, userId?: number, duration?: number): void {
    this.info(`API: ${method} ${path}`, { userId, duration });
  }

  securityEvent(event: string, context?: Record<string, any>): void {
    this.warn(`Security: ${event}`, context);
  }
}

export const logger = new Logger();

// Error boundary for catching unhandled errors
export function setupErrorHandling(): void {
  if (typeof window === 'undefined') {
    // Server-side error handling
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection', reason instanceof Error ? reason : new Error(String(reason)), {
        promise: promise.toString(),
      });
    });
  }
}