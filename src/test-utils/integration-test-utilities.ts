/**
 * Integration Test Utilities - Catch real integration issues
 * Implements Requirements 4.3, 4.4
 */

// Import Next.js types conditionally for test environment
let NextRequest: any;
let NextResponse: any;

try {
  const nextServer = require('next/server');
  NextRequest = nextServer.NextRequest;
  NextResponse = nextServer.NextResponse;
} catch (error) {
  // Fallback for test environment
  NextRequest = class MockNextRequest {
    constructor(public url: string, public init?: RequestInit) {
      this.method = init?.method || 'GET';
      this.headers = new Headers(init?.headers);
      this.body = init?.body;
    }
    
    method: string;
    headers: Headers;
    body: any;
    
    async json() { 
      if (typeof this.body === 'string') {
        return JSON.parse(this.body);
      }
      return this.body || {};
    }
    
    async text() {
      return typeof this.body === 'string' ? this.body : JSON.stringify(this.body || {});
    }
  };
  
  NextResponse = class MockNextResponse {
    constructor(public body: any, public init?: ResponseInit) {
      this.status = init?.status || 200;
      this.headers = new Headers(init?.headers);
    }
    
    status: number;
    headers: Headers;
    
    static json(data: any, init?: ResponseInit) {
      return new MockNextResponse(JSON.stringify(data), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        ...init,
      });
    }
    
    async json() { 
      if (typeof this.body === 'string') {
        return JSON.parse(this.body);
      }
      return this.body;
    }
    
    async text() {
      return typeof this.body === 'string' ? this.body : JSON.stringify(this.body);
    }
  };
}
import { DatabaseTestManager, TestDataSeed } from './database-test-manager';
import { TestDatasetFactory } from './realistic-test-data';

export interface IntegrationTestConfig {
  seedData?: TestDataSeed;
  mockAuth?: boolean;
  mockDatabase?: boolean;
  enableRealValidation?: boolean;
  enableRealErrorHandling?: boolean;
}

export interface APITestResult {
  response: Response;
  data: any;
  status: number;
  headers: Headers;
  executionTime: number;
}

/**
 * Integration Test Manager for API routes and database operations
 */
export class IntegrationTestManager {
  private databaseManager: DatabaseTestManager;
  private originalModules: Map<string, any> = new Map();

  constructor() {
    this.databaseManager = new DatabaseTestManager();
  }

  async setup(config: IntegrationTestConfig = {}): Promise<void> {
    const {
      seedData,
      mockAuth = true,
      mockDatabase = true,
      enableRealValidation = true,
      enableRealErrorHandling = true,
    } = config;

    // Setup database mocking
    if (mockDatabase) {
      await this.databaseManager.setup({
        useInMemory: true,
        mockQueries: true,
        seedData: seedData || TestDatasetFactory.createMinimalDataset(),
      });
    }

    // Setup authentication mocking
    if (mockAuth) {
      this.setupAuthMocks();
    }

    // Setup validation mocking (or use real validation)
    if (!enableRealValidation) {
      this.setupValidationMocks();
    }

    // Setup error handling (or use real error handling)
    if (!enableRealErrorHandling) {
      this.setupErrorHandlingMocks();
    }
  }

  async teardown(): Promise<void> {
    await this.databaseManager.teardown();
    this.restoreOriginalModules();
  }

  private setupAuthMocks(): void {
    const mockAuth = {
      validateRequest: jest.fn(() => Promise.resolve({
        user: { id: 1, email: 'test@example.com', name: 'Test User' },
        session: { id: 'session-123', userId: 1, expiresAt: new Date(Date.now() + 86400000) },
      })),
      requireAuthSession: jest.fn(() => Promise.resolve({
        user: { id: 1, email: 'test@example.com', name: 'Test User' },
        session: { id: 'session-123', userId: 1, expiresAt: new Date(Date.now() + 86400000) },
      })),
    };

    jest.doMock('@/lib/auth/server', () => mockAuth);
  }

  private setupValidationMocks(): void {
    // Mock validation schemas to always pass
    const mockValidation = {
      plantInstanceFilterSchema: {
        parse: jest.fn((data) => ({ userId: 1, ...data })),
      },
      createPlantInstanceSchema: {
        parse: jest.fn((data) => data),
      },
      careLogSchema: {
        parse: jest.fn((data) => data),
      },
      propagationCreateSchema: {
        parse: jest.fn((data) => data),
      },
    };

    jest.doMock('@/lib/validation/plant-schemas', () => mockValidation);
    jest.doMock('@/lib/validation/care-schemas', () => mockValidation);
    jest.doMock('@/lib/validation/propagation-schemas', () => mockValidation);
  }

  private setupErrorHandlingMocks(): void {
    // Mock error handling to be predictable
    const mockErrorHandler = {
      handleDatabaseError: jest.fn((error) => ({
        status: 500,
        message: 'Database error',
        details: error.message,
      })),
      handleValidationError: jest.fn((error) => ({
        status: 400,
        message: 'Validation error',
        details: error.issues || [error.message],
      })),
    };

    jest.doMock('@/lib/utils/error-handling', () => mockErrorHandler);
  }

  private restoreOriginalModules(): void {
    this.originalModules.forEach((module, path) => {
      jest.doMock(path, () => module);
    });
    this.originalModules.clear();
  }

  /**
   * Test API route with realistic request/response handling
   */
  async testAPIRoute(
    handler: (request: NextRequest, context?: any) => Promise<NextResponse>,
    request: {
      url: string;
      method?: string;
      body?: any;
      headers?: Record<string, string>;
      params?: Record<string, string>;
    }
  ): Promise<APITestResult> {
    const startTime = Date.now();
    
    const nextRequest = new NextRequest(request.url, {
      method: request.method || 'GET',
      body: request.body ? JSON.stringify(request.body) : undefined,
      headers: {
        'Content-Type': 'application/json',
        ...request.headers,
      },
    });

    const context = request.params ? { params: Promise.resolve(request.params) } : undefined;

    try {
      const response = await handler(nextRequest, context);
      const data = await response.json();
      const executionTime = Date.now() - startTime;

      return {
        response,
        data,
        status: response.status,
        headers: response.headers,
        executionTime,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      // Create error response
      const errorResponse = NextResponse.json(
        { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );

      return {
        response: errorResponse,
        data: { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
        status: 500,
        headers: errorResponse.headers,
        executionTime,
      };
    }
  }

  /**
   * Test complete workflow from API to database
   */
  async testWorkflow(steps: Array<{
    name: string;
    handler: (request: NextRequest, context?: any) => Promise<NextResponse>;
    request: {
      url: string;
      method?: string;
      body?: any;
      headers?: Record<string, string>;
      params?: Record<string, string>;
    };
    expectedStatus?: number;
    expectedData?: any;
    validate?: (result: APITestResult) => void;
  }>): Promise<{
    results: Array<APITestResult & { stepName: string }>;
    totalTime: number;
    success: boolean;
  }> {
    const startTime = Date.now();
    const results: Array<APITestResult & { stepName: string }> = [];
    let success = true;

    for (const step of steps) {
      try {
        const result = await this.testAPIRoute(step.handler, step.request);
        
        results.push({
          ...result,
          stepName: step.name,
        });

        // Validate expected status
        if (step.expectedStatus && result.status !== step.expectedStatus) {
          success = false;
          console.error(`Step "${step.name}" failed: expected status ${step.expectedStatus}, got ${result.status}`);
        }

        // Validate expected data
        if (step.expectedData) {
          try {
            expect(result.data).toMatchObject(step.expectedData);
          } catch (error) {
            success = false;
            console.error(`Step "${step.name}" failed data validation:`, error);
          }
        }

        // Run custom validation
        if (step.validate) {
          try {
            step.validate(result);
          } catch (error) {
            success = false;
            console.error(`Step "${step.name}" failed custom validation:`, error);
          }
        }

        // Stop on first failure if status indicates error
        if (result.status >= 400) {
          success = false;
          break;
        }
      } catch (error) {
        success = false;
        console.error(`Step "${step.name}" threw error:`, error);
        break;
      }
    }

    const totalTime = Date.now() - startTime;

    return {
      results,
      totalTime,
      success,
    };
  }

  /**
   * Test database operations directly
   */
  async testDatabaseOperations(operations: Array<{
    name: string;
    operation: () => Promise<any>;
    validate?: (result: any) => void;
  }>): Promise<{
    results: Array<{ name: string; result: any; success: boolean; error?: Error }>;
    success: boolean;
  }> {
    const results: Array<{ name: string; result: any; success: boolean; error?: Error }> = [];
    let overallSuccess = true;

    for (const op of operations) {
      try {
        const result = await op.operation();
        
        // Run validation if provided
        if (op.validate) {
          try {
            op.validate(result);
          } catch (validationError) {
            results.push({
              name: op.name,
              result,
              success: false,
              error: validationError instanceof Error ? validationError : new Error(String(validationError)),
            });
            overallSuccess = false;
            continue;
          }
        }

        results.push({
          name: op.name,
          result,
          success: true,
        });
      } catch (error) {
        results.push({
          name: op.name,
          result: null,
          success: false,
          error: error instanceof Error ? error : new Error(String(error)),
        });
        overallSuccess = false;
      }
    }

    return {
      results,
      success: overallSuccess,
    };
  }

  /**
   * Test authentication flows
   */
  async testAuthenticationFlow(scenarios: Array<{
    name: string;
    mockUser?: any;
    mockSession?: any;
    expectAuthenticated: boolean;
    handler: (request: NextRequest) => Promise<NextResponse>;
    request: {
      url: string;
      method?: string;
      body?: any;
      headers?: Record<string, string>;
    };
  }>): Promise<{
    results: Array<{ name: string; success: boolean; status: number; authenticated: boolean }>;
    success: boolean;
  }> {
    const results: Array<{ name: string; success: boolean; status: number; authenticated: boolean }> = [];
    let overallSuccess = true;

    for (const scenario of scenarios) {
      // Setup auth mock for this scenario
      const { validateRequest } = await import('@/lib/auth/server');
      (validateRequest as jest.Mock).mockResolvedValueOnce({
        user: scenario.mockUser || null,
        session: scenario.mockSession || null,
      });

      try {
        const result = await this.testAPIRoute(scenario.handler, scenario.request);
        
        const authenticated = result.status !== 401;
        const success = authenticated === scenario.expectAuthenticated;

        results.push({
          name: scenario.name,
          success,
          status: result.status,
          authenticated,
        });

        if (!success) {
          overallSuccess = false;
        }
      } catch (error) {
        results.push({
          name: scenario.name,
          success: false,
          status: 500,
          authenticated: false,
        });
        overallSuccess = false;
      }
    }

    return {
      results,
      success: overallSuccess,
    };
  }

  /**
   * Test error handling scenarios
   */
  async testErrorHandling(scenarios: Array<{
    name: string;
    setup: () => Promise<void>;
    handler: (request: NextRequest) => Promise<NextResponse>;
    request: {
      url: string;
      method?: string;
      body?: any;
      headers?: Record<string, string>;
    };
    expectedStatus: number;
    expectedErrorType?: string;
  }>): Promise<{
    results: Array<{ name: string; success: boolean; status: number; errorHandled: boolean }>;
    success: boolean;
  }> {
    const results: Array<{ name: string; success: boolean; status: number; errorHandled: boolean }> = [];
    let overallSuccess = true;

    for (const scenario of scenarios) {
      try {
        // Setup error condition
        await scenario.setup();

        const result = await this.testAPIRoute(scenario.handler, scenario.request);
        
        const errorHandled = result.status === scenario.expectedStatus;
        const hasErrorMessage = result.data.error || result.data.message;

        const success = errorHandled && hasErrorMessage;

        results.push({
          name: scenario.name,
          success,
          status: result.status,
          errorHandled,
        });

        if (!success) {
          overallSuccess = false;
        }
      } catch (error) {
        results.push({
          name: scenario.name,
          success: false,
          status: 500,
          errorHandled: false,
        });
        overallSuccess = false;
      }
    }

    return {
      results,
      success: overallSuccess,
    };
  }

  /**
   * Get database test manager for direct access
   */
  getDatabaseManager(): DatabaseTestManager {
    return this.databaseManager;
  }

  /**
   * Validate API response structure
   */
  validateAPIResponse(response: any, expectedStructure: {
    success?: boolean;
    data?: any;
    error?: string;
    pagination?: boolean;
  }): void {
    if (expectedStructure.success !== undefined) {
      expect(response.success).toBe(expectedStructure.success);
    }

    if (expectedStructure.success !== false && expectedStructure.data !== undefined) {
      expect(response.data).toBeDefined();
      
      if (typeof expectedStructure.data === 'object' && expectedStructure.data !== null) {
        expect(response.data).toMatchObject(expectedStructure.data);
      }
    }

    if (expectedStructure.success === false && expectedStructure.error) {
      expect(response.error).toBeDefined();
      expect(typeof response.error).toBe('string');
    }

    if (expectedStructure.pagination) {
      expect(response.data).toHaveProperty('totalCount');
      expect(response.data).toHaveProperty('hasMore');
      expect(typeof response.data.totalCount).toBe('number');
      expect(typeof response.data.hasMore).toBe('boolean');
    }
  }

  /**
   * Performance testing utilities
   */
  async measurePerformance<T>(
    operation: () => Promise<T>,
    expectedMaxTime?: number
  ): Promise<{ result: T; executionTime: number; withinExpectedTime: boolean }> {
    const startTime = Date.now();
    const result = await operation();
    const executionTime = Date.now() - startTime;
    
    const withinExpectedTime = expectedMaxTime ? executionTime <= expectedMaxTime : true;

    return {
      result,
      executionTime,
      withinExpectedTime,
    };
  }

  /**
   * Concurrent request testing
   */
  async testConcurrentRequests(
    handler: (request: NextRequest) => Promise<NextResponse>,
    requests: Array<{
      url: string;
      method?: string;
      body?: any;
      headers?: Record<string, string>;
    }>,
    expectedConcurrency: number = requests.length
  ): Promise<{
    results: APITestResult[];
    totalTime: number;
    averageTime: number;
    allSuccessful: boolean;
  }> {
    const startTime = Date.now();
    
    const promises = requests.map(request => this.testAPIRoute(handler, request));
    const results = await Promise.all(promises);
    
    const totalTime = Date.now() - startTime;
    const averageTime = totalTime / results.length;
    const allSuccessful = results.every(result => result.status < 400);

    return {
      results,
      totalTime,
      averageTime,
      allSuccessful,
    };
  }
}

/**
 * Global integration test manager instance
 */
let globalIntegrationManager: IntegrationTestManager | null = null;

export function getIntegrationTestManager(): IntegrationTestManager {
  if (!globalIntegrationManager) {
    globalIntegrationManager = new IntegrationTestManager();
  }
  return globalIntegrationManager;
}

export function resetIntegrationTestManager(): void {
  globalIntegrationManager = null;
}

/**
 * Utility functions for common integration test patterns
 */

/**
 * Create a test request with realistic data
 */
export function createTestRequest(
  url: string,
  options: {
    method?: string;
    body?: any;
    headers?: Record<string, string>;
    params?: Record<string, string>;
  } = {}
): {
  url: string;
  method?: string;
  body?: any;
  headers?: Record<string, string>;
  params?: Record<string, string>;
} {
  return {
    url,
    method: options.method || 'GET',
    body: options.body,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Test Agent',
      ...options.headers,
    },
    params: options.params,
  };
}

/**
 * Assert API response matches expected pattern
 */
export function assertAPIResponse(
  response: APITestResult,
  expected: {
    status?: number;
    success?: boolean;
    hasData?: boolean;
    hasError?: boolean;
    dataShape?: any;
  }
): void {
  if (expected.status) {
    expect(response.status).toBe(expected.status);
  }

  if (expected.success !== undefined) {
    expect(response.data.success).toBe(expected.success);
  }

  if (expected.hasData) {
    expect(response.data.data).toBeDefined();
  }

  if (expected.hasError) {
    expect(response.data.error).toBeDefined();
  }

  if (expected.dataShape && response.data.data) {
    expect(response.data.data).toMatchObject(expected.dataShape);
  }
}

/**
 * Create realistic test scenarios for common workflows
 */
export const TestScenarios = {
  /**
   * Plant management workflow
   */
  plantManagement: {
    createPlant: (plantData: any) => ({
      name: 'Create Plant Instance',
      request: createTestRequest('/api/plant-instances', {
        method: 'POST',
        body: plantData,
      }),
      expectedStatus: 201,
      expectedData: { success: true },
    }),
    
    listPlants: (filters?: any) => ({
      name: 'List Plant Instances',
      request: createTestRequest(`/api/plant-instances${filters ? `?${new URLSearchParams(filters)}` : ''}`),
      expectedStatus: 200,
      expectedData: { success: true },
    }),
    
    logCare: (careData: any) => ({
      name: 'Log Plant Care',
      request: createTestRequest('/api/care/log', {
        method: 'POST',
        body: careData,
      }),
      expectedStatus: 201,
      expectedData: { success: true },
    }),
  },

  /**
   * Authentication scenarios
   */
  authentication: {
    authenticated: {
      mockUser: { id: 1, email: 'test@example.com' },
      mockSession: { id: 'session-123', userId: 1 },
      expectAuthenticated: true,
    },
    
    unauthenticated: {
      mockUser: null,
      mockSession: null,
      expectAuthenticated: false,
    },
  },

  /**
   * Error scenarios
   */
  errors: {
    databaseError: {
      setup: async () => {
        const manager = getIntegrationTestManager();
        const db = manager.getDatabaseManager().getMockDb();
        db.select.mockImplementationOnce(() => {
          throw new Error('Database connection failed');
        });
      },
      expectedStatus: 500,
    },
    
    validationError: {
      setup: async () => {
        const { createPlantInstanceSchema } = await import('@/lib/validation/plant-schemas');
        (createPlantInstanceSchema.parse as jest.Mock).mockImplementationOnce(() => {
          const error = new Error('Validation failed');
          (error as any).issues = [{ message: 'Invalid data' }];
          throw error;
        });
      },
      expectedStatus: 400,
    },
  },
};