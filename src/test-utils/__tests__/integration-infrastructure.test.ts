/**
 * Integration Infrastructure Test - Verify integration testing utilities work
 */

import { 
  IntegrationTestManager,
  getIntegrationTestManager,
  createTestRequest,
  assertAPIResponse,
  TestScenarios,
} from '../integration-test-utilities';
import { TestDatasetFactory } from '../realistic-test-data';

describe('Integration Test Infrastructure', () => {
  let integrationManager: IntegrationTestManager;

  beforeEach(async () => {
    integrationManager = getIntegrationTestManager();
    await integrationManager.setup({
      seedData: TestDatasetFactory.createMinimalDataset(),
      mockAuth: true,
      mockDatabase: true,
    });
  });

  afterEach(async () => {
    await integrationManager.teardown();
  });

  describe('API Route Testing', () => {
    it('should test API routes with realistic request/response handling', async () => {
      // Mock a simple API handler
      const mockHandler = jest.fn(async (request) => {
        const url = new URL(request.url);
        const searchParams = url.searchParams;
        
        // Use the mock NextResponse from our utilities
        const { NextResponse } = require('../integration-test-utilities');
        
        return NextResponse.json({
          success: true,
          data: {
            message: 'Hello World',
            params: Object.fromEntries(searchParams.entries()),
          },
        });
      });

      const result = await integrationManager.testAPIRoute(mockHandler, {
        url: 'http://localhost:3000/api/test?param=value',
        method: 'GET',
      });

      expect(result.status).toBe(200);
      expect(result.data.success).toBe(true);
      expect(result.data.data.params.param).toBe('value');
      expect(result.executionTime).toBeGreaterThan(0);
    });

    it('should handle POST requests with body data', async () => {
      const mockHandler = jest.fn(async (request) => {
        const body = await request.json();
        const { NextResponse } = require('../integration-test-utilities');
        
        return NextResponse.json({
          success: true,
          data: {
            received: body,
            id: 123,
          },
        }, { status: 201 });
      });

      const result = await integrationManager.testAPIRoute(mockHandler, {
        url: 'http://localhost:3000/api/create',
        method: 'POST',
        body: { name: 'Test Item', value: 42 },
      });

      expect(result.status).toBe(201);
      expect(result.data.success).toBe(true);
      expect(result.data.data.received.name).toBe('Test Item');
      expect(result.data.data.received.value).toBe(42);
    });

    it('should handle error responses', async () => {
      const mockHandler = jest.fn(async () => {
        const { NextResponse } = require('../integration-test-utilities');
        
        return NextResponse.json({
          success: false,
          error: 'Something went wrong',
        }, { status: 500 });
      });

      const result = await integrationManager.testAPIRoute(mockHandler, {
        url: 'http://localhost:3000/api/error',
      });

      expect(result.status).toBe(500);
      expect(result.data.success).toBe(false);
      expect(result.data.error).toBe('Something went wrong');
    });
  });

  describe('Workflow Testing', () => {
    it('should test complete workflows', async () => {
      const { NextResponse } = require('../integration-test-utilities');
      
      const mockCreateHandler = jest.fn(async (request) => {
        const body = await request.json();
        return NextResponse.json({ 
          success: true, 
          data: { id: 1, ...body } 
        }, { status: 201 });
      });
      
      const mockGetHandler = jest.fn(async () => 
        NextResponse.json({ 
          success: true, 
          data: [{ id: 1, name: 'Test Resource' }] 
        })
      );

      const workflow = [
        {
          name: 'Create Resource',
          handler: mockCreateHandler,
          request: createTestRequest('http://localhost:3000/api/resource', {
            method: 'POST',
            body: { name: 'Test Resource' },
          }),
          expectedStatus: 201,
        },
        {
          name: 'Get Resource',
          handler: mockGetHandler,
          request: createTestRequest('http://localhost:3000/api/resource'),
          expectedStatus: 200,
          validate: (result) => {
            expect(result.data.data).toHaveLength(1);
            expect(result.data.data[0].name).toBe('Test Resource');
          },
        },
      ];

      const result = await integrationManager.testWorkflow(workflow);
      
      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(2);
      expect(result.totalTime).toBeGreaterThan(0);
      expect(result.results[0].stepName).toBe('Create Resource');
      expect(result.results[1].stepName).toBe('Get Resource');
    });

    it('should handle workflow failures', async () => {
      const { NextResponse } = require('../integration-test-utilities');
      
      const mockSuccessHandler = jest.fn(async () => 
        NextResponse.json({ success: true, data: {} })
      );
      
      const mockFailHandler = jest.fn(async () => 
        NextResponse.json({ success: false, error: 'Failed' }, { status: 400 })
      );

      const workflow = [
        {
          name: 'Success Step',
          handler: mockSuccessHandler,
          request: createTestRequest('http://localhost:3000/api/success'),
          expectedStatus: 200,
        },
        {
          name: 'Fail Step',
          handler: mockFailHandler,
          request: createTestRequest('http://localhost:3000/api/fail'),
          expectedStatus: 200, // This should fail because we expect 200 but get 400
        },
      ];

      const result = await integrationManager.testWorkflow(workflow);
      
      expect(result.success).toBe(false);
      expect(result.results).toHaveLength(2);
      expect(result.results[0].status).toBe(200);
      expect(result.results[1].status).toBe(400);
    });
  });

  describe('Authentication Testing', () => {
    it('should test authentication flows', async () => {
      const { NextResponse } = require('../integration-test-utilities');
      
      const mockProtectedHandler = jest.fn(async () => 
        NextResponse.json({ success: true, data: 'protected' })
      );

      const mockUnauthorizedHandler = jest.fn(async () => 
        NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
      );

      const authScenarios = [
        {
          name: 'Authenticated Request',
          mockUser: { id: 1, email: 'test@example.com' },
          mockSession: { id: 'session-123' },
          expectAuthenticated: true,
          handler: mockProtectedHandler,
          request: createTestRequest('http://localhost:3000/api/protected'),
        },
        {
          name: 'Unauthenticated Request',
          mockUser: null,
          mockSession: null,
          expectAuthenticated: false,
          handler: mockUnauthorizedHandler,
          request: createTestRequest('http://localhost:3000/api/protected'),
        },
      ];

      const result = await integrationManager.testAuthenticationFlow(authScenarios);
      
      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(2);
      expect(result.results[0].authenticated).toBe(true);
      expect(result.results[1].authenticated).toBe(false);
    });
  });

  describe('Error Handling Testing', () => {
    it('should test error handling scenarios', async () => {
      const { NextResponse } = require('../integration-test-utilities');
      
      const errorScenarios = [
        {
          name: 'Database Error',
          setup: async () => {
            // Setup database to throw error
            const db = integrationManager.getDatabaseManager().getMockDb();
            db.select.mockImplementationOnce(() => {
              throw new Error('Database connection failed');
            });
          },
          handler: jest.fn(async () => {
            throw new Error('Database connection failed');
          }),
          request: createTestRequest('http://localhost:3000/api/test'),
          expectedStatus: 500,
        },
        {
          name: 'Validation Error',
          setup: async () => {
            // Setup validation to fail
          },
          handler: jest.fn(async () => 
            NextResponse.json({ 
              success: false, 
              error: 'Validation failed' 
            }, { status: 400 })
          ),
          request: createTestRequest('http://localhost:3000/api/test', {
            method: 'POST',
            body: { invalid: 'data' },
          }),
          expectedStatus: 400,
        },
      ];

      const result = await integrationManager.testErrorHandling(errorScenarios);
      
      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(2);
      expect(result.results[0].status).toBe(500);
      expect(result.results[1].status).toBe(400);
    });
  });

  describe('Performance Testing', () => {
    it('should measure performance', async () => {
      const operation = async () => {
        await new Promise(resolve => setTimeout(resolve, 100)); // Simulate work
        return 'result';
      };

      const result = await integrationManager.measurePerformance(operation, 200);
      
      expect(result.result).toBe('result');
      expect(result.executionTime).toBeGreaterThan(90);
      expect(result.executionTime).toBeLessThan(150);
      expect(result.withinExpectedTime).toBe(true);
    });

    it('should detect performance issues', async () => {
      const slowOperation = async () => {
        await new Promise(resolve => setTimeout(resolve, 200)); // Slow operation
        return 'result';
      };

      const result = await integrationManager.measurePerformance(slowOperation, 100);
      
      expect(result.result).toBe('result');
      expect(result.executionTime).toBeGreaterThan(190);
      expect(result.withinExpectedTime).toBe(false);
    });
  });

  describe('Concurrent Testing', () => {
    it('should test concurrent requests', async () => {
      const { NextResponse } = require('../integration-test-utilities');
      
      const mockHandler = jest.fn(async (request) => {
        const url = new URL(request.url);
        const id = url.searchParams.get('id');
        
        await new Promise(resolve => setTimeout(resolve, 50)); // Simulate processing
        
        return NextResponse.json({ 
          success: true, 
          data: { id, processed: true } 
        });
      });

      const requests = Array.from({ length: 5 }, (_, i) => 
        createTestRequest(`http://localhost:3000/api/test?id=${i}`)
      );

      const result = await integrationManager.testConcurrentRequests(mockHandler, requests);
      
      expect(result.results).toHaveLength(5);
      expect(result.allSuccessful).toBe(true);
      expect(result.totalTime).toBeLessThan(100); // Should be faster than sequential
      expect(mockHandler).toHaveBeenCalledTimes(5);
      
      // Verify each request got the correct ID
      result.results.forEach((res, index) => {
        expect(res.data.data.id).toBe(String(index));
      });
    });
  });

  describe('Utility Functions', () => {
    it('should create realistic test requests', () => {
      const request = createTestRequest('http://localhost:3000/api/test', {
        method: 'POST',
        body: { data: 'test' },
        headers: { 'Authorization': 'Bearer token' },
      });

      expect(request.url).toBe('http://localhost:3000/api/test');
      expect(request.method).toBe('POST');
      expect(request.body).toEqual({ data: 'test' });
      expect(request.headers['Content-Type']).toBe('application/json');
      expect(request.headers['Authorization']).toBe('Bearer token');
    });

    it('should assert API responses correctly', () => {
      const mockResult = {
        response: {} as Response,
        data: {
          success: true,
          data: { id: 1, name: 'Test' },
        },
        status: 200,
        headers: new Headers(),
        executionTime: 100,
      };

      expect(() => {
        assertAPIResponse(mockResult, {
          status: 200,
          success: true,
          hasData: true,
          dataShape: { id: 1 },
        });
      }).not.toThrow();

      expect(() => {
        assertAPIResponse(mockResult, {
          status: 400, // Wrong status
        });
      }).toThrow();
    });
  });

  describe('Test Scenarios', () => {
    it('should provide plant management scenarios', () => {
      const createPlantScenario = TestScenarios.plantManagement.createPlant({
        plantId: 1,
        nickname: 'Test Plant',
        location: 'Living Room',
      });

      expect(createPlantScenario.name).toBe('Create Plant Instance');
      expect(createPlantScenario.request.method).toBe('POST');
      expect(createPlantScenario.request.body.nickname).toBe('Test Plant');
      expect(createPlantScenario.expectedStatus).toBe(201);
    });

    it('should provide authentication scenarios', () => {
      const authScenario = TestScenarios.authentication.authenticated;
      expect(authScenario.mockUser).toBeDefined();
      expect(authScenario.mockSession).toBeDefined();
      expect(authScenario.expectAuthenticated).toBe(true);

      const unauthScenario = TestScenarios.authentication.unauthenticated;
      expect(unauthScenario.mockUser).toBeNull();
      expect(unauthScenario.mockSession).toBeNull();
      expect(unauthScenario.expectAuthenticated).toBe(false);
    });

    it('should provide error scenarios', () => {
      const dbErrorScenario = TestScenarios.errors.databaseError;
      expect(dbErrorScenario.setup).toBeDefined();
      expect(dbErrorScenario.expectedStatus).toBe(500);

      const validationErrorScenario = TestScenarios.errors.validationError;
      expect(validationErrorScenario.setup).toBeDefined();
      expect(validationErrorScenario.expectedStatus).toBe(400);
    });
  });
});