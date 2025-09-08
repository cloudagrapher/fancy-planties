/**
 * Robust Test Infrastructure Demonstration
 * This test file demonstrates the new test infrastructure capabilities
 */

import { 
  DatabaseTestManager,
  getDatabaseTestManager,
  TestDatasetFactory,
  TestUserFactory,
  TestPlantFactory,
  TestPlantInstanceFactory,
} from '../database-test-manager';
import { 
  IntegrationTestManager,
  getIntegrationTestManager,
  createTestRequest,
  assertAPIResponse,
} from '../integration-test-utilities';
import { renderWithTestConfig } from '../component-test-helpers';
import { createTestSuite } from '../test-setup-examples';

describe('Robust Test Infrastructure', () => {
  describe('Database Test Manager', () => {
    let dbManager: DatabaseTestManager;

    beforeEach(async () => {
      dbManager = getDatabaseTestManager();
      await dbManager.setup({
        useInMemory: true,
        mockQueries: true,
        seedData: TestDatasetFactory.createMinimalDataset(),
      });
    });

    afterEach(async () => {
      await dbManager.teardown();
    });

    it('should provide in-memory database functionality', async () => {
      const db = dbManager.getMockDb();
      
      // Test insert
      const insertResult = await db.insert('users').values({
        email: 'test@example.com',
        hashedPassword: 'hashed',
        name: 'Test User',
      }).returning();

      expect(insertResult).toHaveLength(1);
      expect(insertResult[0].email).toBe('test@example.com');

      // Test select
      const selectResult = await db.select().from('users').execute();
      expect(selectResult.length).toBeGreaterThan(0);

      // Test update
      const updateResult = await db.update('users')
        .set({ name: 'Updated User' })
        .where((user: any) => user.id === insertResult[0].id)
        .returning();

      expect(updateResult[0].name).toBe('Updated User');
    });

    it('should provide realistic test data factories', () => {
      const user = TestUserFactory.create();
      expect(user.email).toMatch(/testuser\d+@example\.com/);
      expect(user.hashedPassword).toMatch(/\$2b\$10\$hashedpassword\d+/);

      const plant = TestPlantFactory.createMonstera();
      expect(plant.genus).toBe('Monstera');
      expect(plant.species).toBe('deliciosa');
      expect(plant.family).toBe('Araceae');

      const instance = TestPlantInstanceFactory.createWithCareNeeded();
      expect(instance.fertilizerDue).toBeDefined();
      expect(instance.fertilizerDue!.getTime()).toBeLessThan(Date.now());
    });

    it('should handle complex queries with joins and filters', async () => {
      const db = dbManager.getMockDb();
      
      // Mock a complex query
      const result = await db.select()
        .from('plantInstances')
        .leftJoin('plants', (pi: any, p: any) => pi.plantId === p.id)
        .where((pi: any) => pi.userId === 1)
        .orderBy('createdAt', 'desc')
        .limit(10)
        .execute();

      expect(Array.isArray(result)).toBe(true);
    });

    it('should provide helper methods for test assertions', () => {
      const tableData = dbManager.getTableData('users');
      expect(Array.isArray(tableData)).toBe(true);

      const recordCount = dbManager.countRecords('users');
      expect(typeof recordCount).toBe('number');

      const specificRecord = dbManager.getRecordById('users', 1);
      if (specificRecord) {
        expect(specificRecord.id).toBe(1);
      }
    });
  });

  describe('Integration Test Manager', () => {
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

    it('should test API routes with realistic request/response handling', async () => {
      // Mock a simple API handler
      const mockHandler = jest.fn(async (request) => {
        const url = new URL(request.url);
        const searchParams = url.searchParams;
        
        return new Response(JSON.stringify({
          success: true,
          data: {
            message: 'Hello World',
            params: Object.fromEntries(searchParams.entries()),
          },
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
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

    it('should test complete workflows', async () => {
      const mockCreateHandler = jest.fn(async () => 
        new Response(JSON.stringify({ success: true, data: { id: 1 } }), { status: 201 })
      );
      
      const mockGetHandler = jest.fn(async () => 
        new Response(JSON.stringify({ success: true, data: [{ id: 1 }] }), { status: 200 })
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
          },
        },
      ];

      const result = await integrationManager.testWorkflow(workflow);
      
      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(2);
      expect(result.totalTime).toBeGreaterThan(0);
    });

    it('should test authentication flows', async () => {
      const mockProtectedHandler = jest.fn(async (request) => {
        // This would normally check authentication
        return new Response(JSON.stringify({ success: true, data: 'protected' }), { status: 200 });
      });

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
          handler: jest.fn(async () => 
            new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401 })
          ),
          request: createTestRequest('http://localhost:3000/api/protected'),
        },
      ];

      const result = await integrationManager.testAuthenticationFlow(authScenarios);
      
      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(2);
      expect(result.results[0].authenticated).toBe(true);
      expect(result.results[1].authenticated).toBe(false);
    });

    it('should test error handling scenarios', async () => {
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
            new Response(JSON.stringify({ 
              success: false, 
              error: 'Validation failed' 
            }), { status: 400 })
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

    it('should test concurrent requests', async () => {
      const mockHandler = jest.fn(async (request) => {
        await new Promise(resolve => setTimeout(resolve, 50)); // Simulate processing
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      });

      const requests = Array.from({ length: 5 }, (_, i) => 
        createTestRequest(`http://localhost:3000/api/test?id=${i}`)
      );

      const result = await integrationManager.testConcurrentRequests(mockHandler, requests);
      
      expect(result.results).toHaveLength(5);
      expect(result.allSuccessful).toBe(true);
      expect(result.totalTime).toBeLessThan(100); // Should be faster than sequential
      expect(mockHandler).toHaveBeenCalledTimes(5);
    });
  });

  describe('Component Test Helpers', () => {
    it('should render components with comprehensive mocking', () => {
      const React = require('react');
      const TestComponent = () => React.createElement('div', { 'data-testid': 'test' }, 'Hello World');
      
      const testUser = TestUserFactory.create();
      const testPlants = TestPlantFactory.createMany(3);
      
      const { getByTestId, user } = renderWithTestConfig(React.createElement(TestComponent), {
        config: {
          mockUser: testUser,
          mockPlants: testPlants,
          enableUserEvents: true,
        },
      });

      expect(getByTestId('test')).toBeInTheDocument();
      expect(getByTestId('test')).toHaveTextContent('Hello World');
      expect(user).toBeDefined();
    });

    it('should handle error boundaries', () => {
      const React = require('react');
      const ErrorComponent = () => {
        throw new Error('Test error');
      };

      const { createTestWrapper } = require('../component-test-helpers');
      
      let caughtError: Error | null = null;
      const ErrorWrapper = createTestWrapper({
        onError: (error) => {
          caughtError = error;
        },
      });

      const { getByTestId } = renderWithTestConfig(React.createElement(ErrorComponent), {
        wrapper: ErrorWrapper,
      });

      expect(getByTestId('error-boundary')).toBeInTheDocument();
      expect(caughtError).toBeInstanceOf(Error);
      expect(caughtError?.message).toBe('Test error');
    });
  });

  describe('Test Suite Template', () => {
    createTestSuite('Example Test Suite', (template) => {
      it('should have access to database manager', () => {
        const dbManager = template.getDatabaseManager();
        expect(dbManager).toBeInstanceOf(DatabaseTestManager);
      });

      it('should have access to integration manager', () => {
        const integrationManager = template.getIntegrationManager();
        expect(integrationManager).toBeInstanceOf(IntegrationTestManager);
      });

      it('should have seeded data available', () => {
        const dbManager = template.getDatabaseManager();
        const users = dbManager.getTableData('users');
        expect(users.length).toBeGreaterThan(0);
      });
    }, {
      mockAuth: true,
      enableRealValidation: true,
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
});