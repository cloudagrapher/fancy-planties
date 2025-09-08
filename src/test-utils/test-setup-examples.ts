/**
 * Test Setup Examples - Demonstrates how to use the robust test infrastructure
 * This file provides examples and templates for different types of tests
 */

import { 
  DatabaseTestManager, 
  getDatabaseTestManager,
  TestDatasetFactory,
  TestUserFactory,
  TestPlantFactory,
  TestPlantInstanceFactory,
} from './database-test-manager';
import { renderWithTestConfig } from './component-test-helpers';
import { IntegrationTestManager, getIntegrationTestManager, TestScenarios } from './integration-test-utilities';

/**
 * Example: Setting up a component test with realistic data
 */
export async function setupComponentTestExample() {
  // Create realistic test data
  const testUser = TestUserFactory.create({ email: 'testuser@example.com' });
  const testPlants = TestPlantFactory.createMany(5);
  const testPlantInstances = TestPlantInstanceFactory.createMany(3, { userId: testUser.id! });

  // Configure component test
  const config = {
    mockUser: testUser,
    mockPlants: testPlants,
    mockPlantInstances: testPlantInstances,
    enableQueryClient: true,
    enableUserEvents: true,
  };

  return { config, testUser, testPlants, testPlantInstances };
}

/**
 * Example: Setting up an integration test with database mocking
 */
export async function setupIntegrationTestExample() {
  const manager = getIntegrationTestManager();
  
  // Create comprehensive test dataset
  const testData = TestDatasetFactory.createCompleteDataset({
    userCount: 2,
    plantCount: 8,
    instanceCount: 12,
    propagationCount: 6,
    careHistoryCount: 20,
  });

  await manager.setup({
    seedData: testData,
    mockAuth: true,
    mockDatabase: true,
    enableRealValidation: true,
    enableRealErrorHandling: true,
  });

  return { manager, testData };
}

/**
 * Example: Testing a complete plant management workflow
 */
export async function testPlantManagementWorkflowExample() {
  const { manager } = await setupIntegrationTestExample();
  
  // Import the actual API handlers
  const { POST: createPlantInstance } = await import('@/app/api/plant-instances/route');
  const { POST: logCare } = await import('@/app/api/care/log/route');
  const { GET: getPlantInstances } = await import('@/app/api/plant-instances/route');

  // Define workflow steps
  const workflowSteps = [
    {
      ...TestScenarios.plantManagement.createPlant({
        plantId: 1,
        nickname: 'Test Monstera',
        location: 'Living Room',
        fertilizerSchedule: '2 weeks',
      }),
      handler: createPlantInstance,
    },
    {
      ...TestScenarios.plantManagement.logCare({
        plantInstanceId: 1,
        careType: 'fertilizer',
        notes: 'First fertilizer application',
      }),
      handler: logCare,
    },
    {
      ...TestScenarios.plantManagement.listPlants(),
      handler: getPlantInstances,
      validate: (result) => {
        expect(result.data.data.instances).toHaveLength(1);
        expect(result.data.data.instances[0].nickname).toBe('Test Monstera');
      },
    },
  ];

  // Execute workflow
  const result = await manager.testWorkflow(workflowSteps);
  
  await manager.teardown();
  return result;
}

/**
 * Example: Testing authentication scenarios
 */
export async function testAuthenticationScenariosExample() {
  const { manager } = await setupIntegrationTestExample();
  
  const { GET: getPlantInstances } = await import('@/app/api/plant-instances/route');

  const authScenarios = [
    {
      name: 'Authenticated User',
      ...TestScenarios.authentication.authenticated,
      handler: getPlantInstances,
      request: {
        url: 'http://localhost:3000/api/plant-instances',
      },
    },
    {
      name: 'Unauthenticated User',
      ...TestScenarios.authentication.unauthenticated,
      handler: getPlantInstances,
      request: {
        url: 'http://localhost:3000/api/plant-instances',
      },
    },
  ];

  const result = await manager.testAuthenticationFlow(authScenarios);
  
  await manager.teardown();
  return result;
}

/**
 * Example: Testing error handling
 */
export async function testErrorHandlingExample() {
  const { manager } = await setupIntegrationTestExample();
  
  const { GET: getPlantInstances } = await import('@/app/api/plant-instances/route');
  const { POST: createPlantInstance } = await import('@/app/api/plant-instances/route');

  const errorScenarios = [
    {
      name: 'Database Connection Error',
      ...TestScenarios.errors.databaseError,
      handler: getPlantInstances,
      request: {
        url: 'http://localhost:3000/api/plant-instances',
      },
    },
    {
      name: 'Validation Error',
      ...TestScenarios.errors.validationError,
      handler: createPlantInstance,
      request: {
        url: 'http://localhost:3000/api/plant-instances',
        method: 'POST',
        body: { invalid: 'data' },
      },
    },
  ];

  const result = await manager.testErrorHandling(errorScenarios);
  
  await manager.teardown();
  return result;
}

/**
 * Example: Testing database operations directly
 */
export async function testDatabaseOperationsExample() {
  const dbManager = getDatabaseTestManager();
  
  await dbManager.setup({
    useInMemory: true,
    mockQueries: true,
    seedData: TestDatasetFactory.createMinimalDataset(),
  });

  const operations = [
    {
      name: 'Insert User',
      operation: async () => {
        const db = dbManager.getMockDb();
        return await db.insert('users').values({
          email: 'newuser@example.com',
          hashedPassword: 'hashed',
          name: 'New User',
        }).returning();
      },
      validate: (result) => {
        expect(result).toHaveLength(1);
        expect(result[0].email).toBe('newuser@example.com');
      },
    },
    {
      name: 'Query Users',
      operation: async () => {
        const db = dbManager.getMockDb();
        return await db.select().from('users').execute();
      },
      validate: (result) => {
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeGreaterThan(0);
      },
    },
    {
      name: 'Update User',
      operation: async () => {
        const db = dbManager.getMockDb();
        return await db.update('users')
          .set({ name: 'Updated Name' })
          .where((user) => user.id === 1)
          .returning();
      },
      validate: (result) => {
        expect(result).toHaveLength(1);
        expect(result[0].name).toBe('Updated Name');
      },
    },
  ];

  const result = await new IntegrationTestManager().testDatabaseOperations(operations);
  
  await dbManager.teardown();
  return result;
}

/**
 * Example: Performance testing
 */
export async function testPerformanceExample() {
  const { manager } = await setupIntegrationTestExample();
  
  const { GET: getPlantInstances } = await import('@/app/api/plant-instances/route');

  // Test single request performance
  const singleRequestPerf = await manager.measurePerformance(
    () => manager.testAPIRoute(getPlantInstances, {
      url: 'http://localhost:3000/api/plant-instances',
    }),
    1000 // Expected max time: 1 second
  );

  // Test concurrent requests
  const concurrentRequests = Array.from({ length: 10 }, (_, i) => ({
    url: `http://localhost:3000/api/plant-instances?offset=${i * 10}`,
  }));

  const concurrentPerf = await manager.testConcurrentRequests(
    getPlantInstances,
    concurrentRequests
  );

  await manager.teardown();
  
  return {
    singleRequest: singleRequestPerf,
    concurrent: concurrentPerf,
  };
}

/**
 * Example: Component test with error boundary
 */
export async function testComponentWithErrorBoundaryExample() {
  const { config } = await setupComponentTestExample();
  
  // Mock a component that might throw an error
  const TestComponent = () => {
    throw new Error('Component error for testing');
  };

  const { createTestWrapper } = await import('./component-test-helpers');
  
  let caughtError: Error | null = null;
  const ErrorWrapper = createTestWrapper({
    onError: (error) => {
      caughtError = error;
    },
  });

  const { getByTestId } = renderWithTestConfig(
    <TestComponent />,
    {
      config,
      wrapper: ErrorWrapper,
    }
  );

  // Verify error boundary caught the error
  expect(getByTestId('error-boundary')).toBeInTheDocument();
  expect(caughtError).toBeInstanceOf(Error);
  expect(caughtError?.message).toBe('Component error for testing');
}

/**
 * Template for a complete test suite setup
 */
export class TestSuiteTemplate {
  private dbManager: DatabaseTestManager;
  private integrationManager: IntegrationTestManager;

  constructor() {
    this.dbManager = getDatabaseTestManager();
    this.integrationManager = getIntegrationTestManager();
  }

  async setupSuite(options: {
    seedData?: any;
    mockAuth?: boolean;
    enableRealValidation?: boolean;
  } = {}) {
    await this.integrationManager.setup({
      seedData: options.seedData || TestDatasetFactory.createCompleteDataset(),
      mockAuth: options.mockAuth ?? true,
      enableRealValidation: options.enableRealValidation ?? true,
    });
  }

  async teardownSuite() {
    await this.integrationManager.teardown();
  }

  async setupTest() {
    // Reset data between tests
    await this.dbManager.clearTestData();
    await this.dbManager.seedTestData(TestDatasetFactory.createMinimalDataset());
  }

  async teardownTest() {
    // Clean up after each test
    jest.clearAllMocks();
  }

  getDatabaseManager() {
    return this.dbManager;
  }

  getIntegrationManager() {
    return this.integrationManager;
  }
}

/**
 * Utility to create a test suite with proper setup/teardown
 */
export function createTestSuite(
  suiteName: string,
  tests: (template: TestSuiteTemplate) => void,
  options: {
    seedData?: any;
    mockAuth?: boolean;
    enableRealValidation?: boolean;
  } = {}
) {
  describe(suiteName, () => {
    const template = new TestSuiteTemplate();

    beforeAll(async () => {
      await template.setupSuite(options);
    });

    afterAll(async () => {
      await template.teardownSuite();
    });

    beforeEach(async () => {
      await template.setupTest();
    });

    afterEach(async () => {
      await template.teardownTest();
    });

    tests(template);
  });
}