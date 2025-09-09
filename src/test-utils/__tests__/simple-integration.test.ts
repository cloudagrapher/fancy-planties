/**
 * Simple Integration Test - Basic functionality verification
 */

import { 
  IntegrationTestManager,
  getIntegrationTestManager,
  createTestRequest,
} from '../integration-test-utilities';
import { TestDatasetFactory } from '../realistic-test-data';

describe('Simple Integration Test Infrastructure', () => {
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

  describe('Basic Functionality', () => {
    it('should create integration manager', () => {
      expect(integrationManager).toBeInstanceOf(IntegrationTestManager);
    });

    it('should provide database manager', () => {
      const dbManager = integrationManager.getDatabaseManager();
      expect(dbManager).toBeDefined();
    });

    it('should create test requests', () => {
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

    it('should measure performance', async () => {
      const operation = async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return 'result';
      };

      const result = await integrationManager.measurePerformance(operation, 100);
      
      expect(result.result).toBe('result');
      expect(result.executionTime).toBeGreaterThan(40);
      expect(result.executionTime).toBeLessThan(80);
      expect(result.withinExpectedTime).toBe(true);
    });

    it('should validate API response structure', () => {
      const mockResponse = {
        success: true,
        data: { id: 1, name: 'Test' },
      };

      expect(() => {
        integrationManager.validateAPIResponse(mockResponse, {
          success: true,
          data: { id: 1 },
        });
      }).not.toThrow();

      expect(() => {
        integrationManager.validateAPIResponse(mockResponse, {
          success: false, // Wrong expectation
        });
      }).toThrow();
    });

    it('should handle database operations', async () => {
      const operations = [
        {
          name: 'Get Users',
          operation: async () => {
            const dbManager = integrationManager.getDatabaseManager();
            return dbManager.getTableData('users');
          },
          validate: (result: any[]) => {
            expect(Array.isArray(result)).toBe(true);
          },
        },
        {
          name: 'Count Records',
          operation: async () => {
            const dbManager = integrationManager.getDatabaseManager();
            return dbManager.countRecords('plants');
          },
          validate: (result: number) => {
            expect(typeof result).toBe('number');
            expect(result).toBeGreaterThanOrEqual(0);
          },
        },
      ];

      const result = await integrationManager.testDatabaseOperations(operations);
      
      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(2);
      expect(result.results[0].success).toBe(true);
      expect(result.results[1].success).toBe(true);
    });
  });

  describe('Mock Setup Verification', () => {
    it('should have seeded test data', () => {
      const dbManager = integrationManager.getDatabaseManager();
      
      const users = dbManager.getTableData('users');
      expect(users.length).toBeGreaterThan(0);
      
      const plants = dbManager.getTableData('plants');
      expect(plants.length).toBeGreaterThan(0);
      
      const plantInstances = dbManager.getTableData('plantInstances');
      expect(plantInstances.length).toBeGreaterThan(0);
    });

    it('should provide working database mocks', async () => {
      const db = integrationManager.getDatabaseManager().getMockDb();
      
      // Test basic operations
      expect(db.select).toBeDefined();
      expect(db.insert).toBeDefined();
      expect(db.update).toBeDefined();
      expect(db.delete).toBeDefined();
      expect(db.transaction).toBeDefined();
      
      // Test that they're jest mocks
      expect(jest.isMockFunction(db.select)).toBe(true);
      expect(jest.isMockFunction(db.insert)).toBe(true);
    });

    it('should clear and seed data correctly', async () => {
      const dbManager = integrationManager.getDatabaseManager();
      
      // Clear data
      await dbManager.clearTestData();
      expect(dbManager.countRecords('users')).toBe(0);
      
      // Seed new data
      const newData = TestDatasetFactory.createMinimalDataset();
      await dbManager.seedTestData(newData);
      
      expect(dbManager.countRecords('users')).toBe(newData.users.length);
      expect(dbManager.countRecords('plants')).toBe(newData.plants.length);
    });
  });
});