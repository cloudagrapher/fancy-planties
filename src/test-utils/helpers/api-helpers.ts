import { createTestUser, createTestSession } from '../factories/user-factory';
import type { User, Session } from '@/lib/db/schema';

// Store original fetch for restoration
const originalFetch = global.fetch;

/**
 * API Mock Configuration Types
 */
export interface ApiMockConfig {
  [pattern: string]: ApiMockResponse | ((url: string, options?: RequestInit) => ApiMockResponse);
}

export interface ApiMockResponse {
  status?: number;
  statusText?: string;
  headers?: Record<string, string>;
  data?: any;
}

export interface AuthenticatedApiOptions {
  user?: User;
  session?: Session;
  requireAuth?: boolean;
}

export interface DatabaseTestOptions {
  isolateTransactions?: boolean;
  cleanupAfterEach?: boolean;
  seedData?: boolean;
}

/**
 * Enhanced API mock helpers for consistent request/response testing
 */
export class ApiTestHelper {
  private static instance: ApiTestHelper;
  private mockResponses: Map<string, any> = new Map();
  private callHistory: Array<{ url: string; options?: RequestInit; timestamp: Date }> = [];

  static getInstance(): ApiTestHelper {
    if (!ApiTestHelper.instance) {
      ApiTestHelper.instance = new ApiTestHelper();
    }
    return ApiTestHelper.instance;
  }

  /**
   * Mock API responses with pattern matching
   */
  mockApiResponse(responses: ApiMockConfig, options: { defaultStatus?: number; defaultHeaders?: Record<string, string> } = {}): void {
    const { defaultStatus = 200, defaultHeaders = { 'Content-Type': 'application/json' } } = options;
    
    global.fetch = jest.fn((url: string | URL, requestOptions: RequestInit = {}) => {
      const urlString = url.toString();
      const method = requestOptions.method || 'GET';
      
      // Record call for verification
      this.callHistory.push({
        url: urlString,
        options: requestOptions,
        timestamp: new Date()
      });
      
      // Find matching response pattern
      for (const [pattern, responseConfig] of Object.entries(responses)) {
        const [patternMethod, patternUrl] = pattern.includes(' ') 
          ? pattern.split(' ', 2) 
          : ['GET', pattern];
        
        if (method === patternMethod && this.matchesPattern(urlString, patternUrl)) {
          const response = typeof responseConfig === 'function' 
            ? responseConfig(urlString, requestOptions)
            : responseConfig;
          
          return Promise.resolve(this.createMockResponse(response, defaultStatus, defaultHeaders));
        }
      }
      
      // Default 404 response for unmatched requests
      return Promise.resolve(this.createMockResponse(
        { error: 'Not found' },
        404,
        defaultHeaders
      ));
    });
  }

  /**
   * Mock successful API responses
   */
  mockSuccessResponse<T>(data: T, status: number = 200): void {
    this.mockApiResponse({
      '*': {
        status,
        statusText: 'OK',
        data
      }
    });
  }

  /**
   * Mock error responses
   */
  mockErrorResponse(status: number, message: string, details?: any): void {
    this.mockApiResponse({
      '*': {
        status,
        statusText: this.getStatusText(status),
        data: { error: message, details }
      }
    });
  }

  /**
   * Verify that an API call was made with expected parameters
   */
  expectApiCall(expectedUrl: string, expectedOptions: Partial<RequestInit> = {}, method: string = 'GET'): void {
    const calls = this.getApiCalls();
    const matchingCall = calls.find(call => 
      call.url.includes(expectedUrl) && 
      (call.options?.method || 'GET') === method
    );

    expect(matchingCall).toBeDefined();
    
    if (expectedOptions.headers) {
      expect(matchingCall?.options?.headers).toEqual(
        expect.objectContaining(expectedOptions.headers)
      );
    }
    
    if (expectedOptions.body) {
      expect(matchingCall?.options?.body).toEqual(expectedOptions.body);
    }
  }

  /**
   * Get all API calls made during testing
   */
  getApiCalls(): Array<{ url: string; options?: RequestInit; timestamp: Date }> {
    return [...this.callHistory];
  }

  /**
   * Get the number of times an API endpoint was called
   */
  getApiCallCount(urlPattern: string, method?: string): number {
    return this.callHistory.filter(call => {
      const urlMatches = this.matchesPattern(call.url, urlPattern);
      const methodMatches = !method || (call.options?.method || 'GET') === method;
      return urlMatches && methodMatches;
    }).length;
  }

  /**
   * Reset all API mocks and call history
   */
  reset(): void {
    this.mockResponses.clear();
    this.callHistory = [];
    
    if (global.fetch && (global.fetch as any).mockRestore) {
      (global.fetch as any).mockRestore();
    }
    
    if (originalFetch) {
      global.fetch = originalFetch;
    }
    
    jest.clearAllMocks();
  }

  private matchesPattern(url: string, pattern: string): boolean {
    if (pattern === '*') return true;
    if (pattern.includes('*')) {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      return regex.test(url);
    }
    return url.includes(pattern);
  }

  private createMockResponse(response: ApiMockResponse, defaultStatus: number, defaultHeaders: Record<string, string>): Response {
    const status = response.status || defaultStatus;
    const headers = { ...defaultHeaders, ...response.headers };
    const data = response.data !== undefined ? response.data : response;

    return {
      ok: status < 400,
      status,
      statusText: response.statusText || this.getStatusText(status),
      headers: new Headers(headers),
      json: () => Promise.resolve(data),
      text: () => Promise.resolve(JSON.stringify(data)),
      blob: () => Promise.resolve(new Blob([JSON.stringify(data)])),
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
      formData: () => Promise.resolve(new FormData()),
      clone: () => this.createMockResponse(response, defaultStatus, defaultHeaders),
      body: null,
      bodyUsed: false,
      redirected: false,
      type: 'basic' as ResponseType,
      url: ''
    } as Response;
  }

  private getStatusText(status: number): string {
    const statusTexts: Record<number, string> = {
      200: 'OK',
      201: 'Created',
      204: 'No Content',
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      409: 'Conflict',
      422: 'Unprocessable Entity',
      500: 'Internal Server Error',
    };
    
    return statusTexts[status] || 'Unknown';
  }
}

/**
 * Authentication test utilities for protected endpoints
 */
export class AuthTestHelper {
  private static instance: AuthTestHelper;
  private currentUser: User | null = null;
  private currentSession: Session | null = null;

  static getInstance(): AuthTestHelper {
    if (!AuthTestHelper.instance) {
      AuthTestHelper.instance = new AuthTestHelper();
    }
    return AuthTestHelper.instance;
  }

  /**
   * Create authenticated API request headers
   */
  createAuthHeaders(user?: User, session?: Session): Record<string, string> {
    const testUser = user || this.currentUser || createTestUser();
    const testSession = session || this.currentSession || createTestSession(testUser);
    
    // Store current user and session for future use
    this.currentUser = testUser;
    this.currentSession = testSession;
    
    return {
      'Content-Type': 'application/json',
      'Cookie': `auth-session=${testSession.id}`,
      'Authorization': `Bearer ${testSession.id}`,
    };
  }

  /**
   * Mock authenticated API requests
   */
  mockAuthenticatedApi(responses: ApiMockConfig, options: AuthenticatedApiOptions = {}): void {
    const { user, session, requireAuth = true } = options;
    const testUser = user || createTestUser();
    const testSession = session || createTestSession(testUser);
    
    this.currentUser = testUser;
    this.currentSession = testSession;
    
    const apiHelper = ApiTestHelper.getInstance();
    
    global.fetch = jest.fn((url: string | URL, requestOptions: RequestInit = {}) => {
      const urlString = url.toString();
      const method = requestOptions.method || 'GET';
      
      // Record call for verification (shared with ApiTestHelper)
      apiHelper['callHistory'].push({
        url: urlString,
        options: requestOptions,
        timestamp: new Date()
      });
      
      // Check authentication if required
      if (requireAuth) {
        const hasAuthHeader = requestOptions.headers && (
          (requestOptions.headers as any)['Cookie'] || 
          (requestOptions.headers as any)['Authorization']
        );
        
        if (!hasAuthHeader) {
          return Promise.resolve(apiHelper['createMockResponse'](
            { error: 'Authentication required' },
            401,
            { 'Content-Type': 'application/json' }
          ));
        }
      }
      
      // Find matching response
      for (const [pattern, responseConfig] of Object.entries(responses)) {
        const [patternMethod, patternUrl] = pattern.includes(' ') 
          ? pattern.split(' ', 2) 
          : ['GET', pattern];
        
        if (method === patternMethod && apiHelper['matchesPattern'](urlString, patternUrl)) {
          const response = typeof responseConfig === 'function' 
            ? responseConfig(urlString, requestOptions)
            : responseConfig;
          
          return Promise.resolve(apiHelper['createMockResponse'](
            response,
            200,
            { 'Content-Type': 'application/json' }
          ));
        }
      }
      
      // Default 404 for unmatched authenticated requests
      return Promise.resolve(apiHelper['createMockResponse'](
        { error: 'Endpoint not found' },
        404,
        { 'Content-Type': 'application/json' }
      ));
    });
  }

  /**
   * Mock authentication functions for API testing
   */
  mockAuthFunctions(user?: User, session?: Session): { user: User; session: Session } {
    const testUser = user || createTestUser();
    const testSession = session || createTestSession(testUser);
    
    jest.doMock('@/lib/auth/server', () => ({
      validateRequest: jest.fn().mockResolvedValue({
        user: testUser,
        session: testSession,
      }),
      requireAuthSession: jest.fn().mockResolvedValue({
        user: testUser,
        session: testSession,
      }),
      isAuthenticated: jest.fn().mockResolvedValue(true),
    }));
    
    this.currentUser = testUser;
    this.currentSession = testSession;
    
    return { user: testUser, session: testSession };
  }

  /**
   * Mock unauthenticated state for API testing
   */
  mockUnauthenticatedState(): void {
    jest.doMock('@/lib/auth/server', () => ({
      validateRequest: jest.fn().mockResolvedValue({
        user: null,
        session: null,
      }),
      requireAuthSession: jest.fn().mockRejectedValue(new Error('Unauthorized')),
      isAuthenticated: jest.fn().mockResolvedValue(false),
    }));
    
    this.currentUser = null;
    this.currentSession = null;
  }

  /**
   * Verify that an authenticated API call was made
   */
  expectAuthenticatedApiCall(expectedUrl: string, expectedOptions: Partial<RequestInit> = {}, method: string = 'GET'): void {
    const apiHelper = ApiTestHelper.getInstance();
    const calls = apiHelper.getApiCalls();
    
    const matchingCall = calls.find(call => 
      call.url.includes(expectedUrl) && 
      (call.options?.method || 'GET') === method
    );

    expect(matchingCall).toBeDefined();
    expect(matchingCall?.options?.headers).toEqual(
      expect.objectContaining({
        'Content-Type': 'application/json',
      })
    );
    
    if (expectedOptions.headers) {
      expect(matchingCall?.options?.headers).toEqual(
        expect.objectContaining(expectedOptions.headers)
      );
    }
  }

  /**
   * Get current authenticated user
   */
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  /**
   * Get current session
   */
  getCurrentSession(): Session | null {
    return this.currentSession;
  }

  /**
   * Reset authentication state
   */
  reset(): void {
    this.currentUser = null;
    this.currentSession = null;
  }
}

/**
 * Database test helpers with proper cleanup
 */
export class DatabaseTestHelper {
  private static instance: DatabaseTestHelper;
  private mockDb: any = null;
  private transactions: any[] = [];
  private cleanupCallbacks: Array<() => Promise<void>> = [];

  static getInstance(): DatabaseTestHelper {
    if (!DatabaseTestHelper.instance) {
      DatabaseTestHelper.instance = new DatabaseTestHelper();
    }
    return DatabaseTestHelper.instance;
  }

  /**
   * Mock database operations for testing
   */
  mockDatabaseOperations(mockData: Record<string, any> = {}): any {
    const mockDb = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      returning: jest.fn().mockResolvedValue(mockData.returning || []),
      execute: jest.fn().mockResolvedValue(mockData.execute || []),
      transaction: jest.fn().mockImplementation((callback) => {
        const tx = this.createMockTransaction();
        this.transactions.push(tx);
        return callback(tx);
      }),
    };
    
    // Mock the database module
    jest.doMock('@/lib/db', () => ({
      db: mockDb,
    }));
    
    this.mockDb = mockDb;
    return mockDb;
  }

  /**
   * Create test database transaction mock
   */
  createMockTransaction(): any {
    const transaction = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      returning: jest.fn().mockResolvedValue([]),
      execute: jest.fn().mockResolvedValue([]),
      rollback: jest.fn().mockResolvedValue(undefined),
      commit: jest.fn().mockResolvedValue(undefined),
    };
    
    return transaction;
  }

  /**
   * Setup test database with proper isolation
   */
  async setupTestDatabase(options: DatabaseTestOptions = {}): Promise<void> {
    const { isolateTransactions = true, cleanupAfterEach = true, seedData = false } = options;
    
    if (isolateTransactions) {
      // Mock transaction isolation
      this.mockDatabaseOperations();
    }
    
    if (seedData) {
      await this.seedTestData();
    }
    
    if (cleanupAfterEach) {
      this.addCleanupCallback(async () => {
        await this.cleanupTestData();
      });
    }
  }

  /**
   * Seed test data
   */
  async seedTestData(): Promise<void> {
    // Mock seeding test data
    if (this.mockDb) {
      this.mockDb.insert.mockResolvedValue([]);
      this.mockDb.values.mockResolvedValue([]);
    }
  }

  /**
   * Clean up test data
   */
  async cleanupTestData(): Promise<void> {
    // Reset all transactions
    this.transactions = [];
    
    // Reset mock database
    if (this.mockDb) {
      jest.clearAllMocks();
    }
    
    // Run cleanup callbacks
    for (const callback of this.cleanupCallbacks) {
      await callback();
    }
    
    this.cleanupCallbacks = [];
  }

  /**
   * Add cleanup callback
   */
  addCleanupCallback(callback: () => Promise<void>): void {
    this.cleanupCallbacks.push(callback);
  }

  /**
   * Verify database operations
   */
  expectDatabaseCall(operation: string, table?: string, data?: any): void {
    if (!this.mockDb) {
      throw new Error('Database not mocked. Call mockDatabaseOperations() first.');
    }
    
    expect(this.mockDb[operation]).toHaveBeenCalled();
    
    if (table) {
      expect(this.mockDb.from).toHaveBeenCalledWith(expect.objectContaining({
        _: expect.objectContaining({ name: table })
      }));
    }
    
    if (data && operation === 'values') {
      expect(this.mockDb.values).toHaveBeenCalledWith(
        expect.objectContaining(data)
      );
    }
  }

  /**
   * Get all database transactions
   */
  getTransactions(): any[] {
    return [...this.transactions];
  }

  /**
   * Reset database test state
   */
  reset(): void {
    this.mockDb = null;
    this.transactions = [];
    this.cleanupCallbacks = [];
  }
}

/**
 * Convenience functions for common API testing patterns
 */

// API Helper instance
export const apiHelper = ApiTestHelper.getInstance();

// Auth Helper instance  
export const authHelper = AuthTestHelper.getInstance();

// Database Helper instance
export const dbHelper = DatabaseTestHelper.getInstance();

// Legacy compatibility functions
export const mockApiResponse = (responses: ApiMockConfig, options?: any) => 
  apiHelper.mockApiResponse(responses, options);

export const mockApiError = (urlPattern: string, status: number = 500, errorData: any = { error: 'Internal server error' }, method: string = 'GET') => 
  apiHelper.mockApiResponse({ [`${method} ${urlPattern}`]: { status, data: errorData } });

export const mockApiSuccess = (responses: Record<string, any>) => 
  apiHelper.mockApiResponse(Object.fromEntries(
    Object.entries(responses).map(([pattern, data]) => [pattern, { status: 200, data }])
  ));

export const createAuthHeaders = (user?: User, session?: Session) => 
  authHelper.createAuthHeaders(user, session);

export const mockAuthenticatedApi = (responses: ApiMockConfig, user?: User, session?: Session) => 
  authHelper.mockAuthenticatedApi(responses, { user, session });

export const expectApiCall = (expectedUrl: string, expectedOptions?: Partial<RequestInit>, method?: string) => 
  apiHelper.expectApiCall(expectedUrl, expectedOptions, method);

export const expectAuthenticatedApiCall = (expectedUrl: string, expectedOptions?: Partial<RequestInit>, method?: string) => 
  authHelper.expectAuthenticatedApiCall(expectedUrl, expectedOptions, method);

export const getApiCallCount = (urlPattern: string, method?: string) => 
  apiHelper.getApiCallCount(urlPattern, method);

export const getAllApiCalls = () => 
  apiHelper.getApiCalls();

export const resetApiMocks = () => {
  apiHelper.reset();
  authHelper.reset();
  dbHelper.reset();
};

// Database test helpers
export const databaseTestHelpers = {
  mockDatabaseOperations: (mockData?: Record<string, any>) => dbHelper.mockDatabaseOperations(mockData),
  createMockTransaction: () => dbHelper.createMockTransaction(),
  mockAuthFunctions: (user?: User, session?: Session) => authHelper.mockAuthFunctions(user, session),
  mockUnauthenticatedState: () => authHelper.mockUnauthenticatedState(),
  setupTestDatabase: (options?: DatabaseTestOptions) => dbHelper.setupTestDatabase(options),
  cleanupTestData: () => dbHelper.cleanupTestData(),
  expectDatabaseCall: (operation: string, table?: string, data?: any) => dbHelper.expectDatabaseCall(operation, table, data),
};

// Common API response patterns
export const apiResponsePatterns = {
  success: <T>(data: T, message: string = 'Success') => ({
    success: true,
    message,
    data,
  }),

  error: (message: string, code: string = 'ERROR', details?: any) => ({
    success: false,
    error: message,
    code,
    details,
  }),

  validationError: (errors: any[]) => ({
    success: false,
    error: 'Validation failed',
    code: 'VALIDATION_ERROR',
    details: errors,
  }),

  paginated: <T>(items: T[], page: number = 1, limit: number = 10, total?: number) => ({
    success: true,
    data: items,
    pagination: {
      page,
      limit,
      total: total || items.length,
      totalPages: Math.ceil((total || items.length) / limit),
    },
  }),
};