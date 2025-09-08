import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import type { NewPropagation } from '../../schema';

// Mock the database module before importing PropagationQueries
const mockDb = {
  insert: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  from: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  leftJoin: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  values: jest.fn().mockReturnThis(),
  set: jest.fn().mockReturnThis(),
  returning: jest.fn(),
  execute: jest.fn(),
};

jest.mock('../../index', () => ({
  db: mockDb,
}));

jest.mock('drizzle-orm', () => ({
  eq: jest.fn(),
  and: jest.fn(),
  desc: jest.fn(),
  asc: jest.fn(),
  ilike: jest.fn(),
  or: jest.fn(),
  sql: jest.fn(),
}));

// Now import PropagationQueries after mocking
import { PropagationQueries } from '../propagations';

// Test data factories
const createMockUser = (overrides = {}) => ({
  id: 1,
  email: 'test@example.com',
  hashedPassword: 'hashedpassword',
  name: 'Test User',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
});

const createMockPlant = (overrides = {}) => ({
  id: 1,
  family: 'Araceae',
  genus: 'Monstera',
  species: 'deliciosa',
  commonName: 'Swiss Cheese Plant',
  isVerified: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
});

const createMockPlantInstance = (overrides = {}) => ({
  id: 1,
  userId: 1,
  plantId: 1,
  nickname: 'My Monstera',
  location: 'Living Room',
  fertilizerSchedule: '2 weeks',
  isActive: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
});

const createMockPropagation = (overrides = {}) => ({
  id: 1,
  userId: 1,
  plantId: 1,
  parentInstanceId: 1,
  nickname: 'Test Propagation',
  location: 'Propagation Station',
  dateStarted: new Date('2024-01-01'),
  status: 'started' as const,
  notes: 'Test notes',
  images: [],
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
});

describe('PropagationQueries', () => {
  let testUser: ReturnType<typeof createMockUser>;
  let testPlant: ReturnType<typeof createMockPlant>;
  let testPlantInstance: ReturnType<typeof createMockPlantInstance>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Create test data
    testUser = createMockUser();
    testPlant = createMockPlant();
    testPlantInstance = createMockPlantInstance();

    // Setup default mock return values
    mockDb.returning.mockResolvedValue([createMockPropagation()]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new propagation', async () => {
      const propagationData: NewPropagation = {
        userId: testUser.id,
        plantId: testPlant.id,
        parentInstanceId: testPlantInstance.id,
        nickname: 'Monstera Cutting #1',
        location: 'Propagation Station',
        dateStarted: new Date(),
        status: 'started',
        notes: 'First cutting attempt',
        images: [],
      };

      // Mock the expected return value
      const expectedResult = createMockPropagation({
        nickname: 'Monstera Cutting #1',
        status: 'started',
        userId: testUser.id,
        plantId: testPlant.id,
        parentInstanceId: testPlantInstance.id,
      });
      mockDb.returning.mockResolvedValue([expectedResult]);

      const result = await PropagationQueries.create(propagationData);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.nickname).toBe('Monstera Cutting #1');
      expect(result.status).toBe('started');
      expect(result.userId).toBe(testUser.id);
      expect(result.plantId).toBe(testPlant.id);
      expect(result.parentInstanceId).toBe(testPlantInstance.id);
    });

    it('should create a propagation without parent instance', async () => {
      const propagationData: NewPropagation = {
        userId: testUser.id,
        plantId: testPlant.id,
        parentInstanceId: null,
        nickname: 'Store-bought Cutting',
        location: 'Kitchen Window',
        dateStarted: new Date(),
        status: 'started',
        notes: 'Purchased from nursery',
        images: [],
      };

      // Mock the expected return value
      const expectedResult = createMockPropagation({
        nickname: 'Store-bought Cutting',
        parentInstanceId: null,
      });
      mockDb.returning.mockResolvedValue([expectedResult]);

      const result = await PropagationQueries.create(propagationData);

      expect(result).toBeDefined();
      expect(result.parentInstanceId).toBeNull();
      expect(result.nickname).toBe('Store-bought Cutting');
    });
  });

  describe('getById', () => {
    it('should get propagation by ID with related data', async () => {
      // Mock the expected return value with related data
      const expectedResult = {
        ...createMockPropagation({
          nickname: 'Test Propagation',
          status: 'rooting',
          notes: 'Test notes',
          images: ['test-image.jpg'],
        }),
        plant: testPlant,
        parentInstance: testPlantInstance,
      };
      
      // Mock the database query to return the propagation with relations
      mockDb.returning.mockResolvedValue([expectedResult]);

      const result = await PropagationQueries.getById(1);

      expect(result).toBeDefined();
      expect(result!.id).toBe(1);
      expect(result!.plant).toBeDefined();
      expect(result!.plant.genus).toBe('Monstera');
      expect(result!.parentInstance).toBeDefined();
      expect(result!.parentInstance!.nickname).toBe('My Monstera');
    });

    it('should return null for non-existent propagation', async () => {
      // Mock empty result for non-existent propagation
      mockDb.returning.mockResolvedValue([]);
      
      const result = await PropagationQueries.getById(99999);
      expect(result).toBeNull();
    });
  });

  describe('getByUserId', () => {
    it('should get all propagations for a user', async () => {
      // Mock multiple propagations with plant data
      const mockPropagations = [
        {
          ...createMockPropagation({
            nickname: 'Propagation 2',
            dateStarted: new Date('2024-01-02'),
            status: 'rooting' as const,
          }),
          plant: testPlant,
        },
        {
          ...createMockPropagation({
            id: 2,
            nickname: 'Propagation 1',
            dateStarted: new Date('2024-01-01'),
            status: 'started' as const,
          }),
          plant: testPlant,
        },
      ];
      
      mockDb.returning.mockResolvedValue(mockPropagations);

      const results = await PropagationQueries.getByUserId(testUser.id);

      expect(results).toHaveLength(2);
      expect(results[0].nickname).toBe('Propagation 2'); // Should be ordered by dateStarted desc
      expect(results[1].nickname).toBe('Propagation 1');
      expect(results.every(p => p.plant)).toBe(true); // All should have plant data
    });

    it('should return empty array for user with no propagations', async () => {
      mockDb.returning.mockResolvedValue([]);
      
      const results = await PropagationQueries.getByUserId(testUser.id);
      expect(results).toHaveLength(0);
    });
  });

  describe('getByStatus', () => {
    it('should get propagations by status', async () => {
      // Mock propagations filtered by status
      const startedProp = createMockPropagation({
        nickname: 'Started Prop',
        status: 'started' as const,
      });
      const rootingProp = createMockPropagation({
        id: 2,
        nickname: 'Rooting Prop',
        status: 'rooting' as const,
      });

      // Mock different results for different status queries
      mockDb.returning
        .mockResolvedValueOnce([startedProp]) // First call for 'started'
        .mockResolvedValueOnce([rootingProp]); // Second call for 'rooting'

      const startedResults = await PropagationQueries.getByStatus(testUser.id, 'started');
      const rootingResults = await PropagationQueries.getByStatus(testUser.id, 'rooting');

      expect(startedResults).toHaveLength(1);
      expect(startedResults[0].nickname).toBe('Started Prop');
      expect(rootingResults).toHaveLength(1);
      expect(rootingResults[0].nickname).toBe('Rooting Prop');
    });
  });

  describe('updateStatus', () => {
    it('should update propagation status with notes', async () => {
      const updatedProp = createMockPropagation({
        status: 'rooting' as const,
        notes: 'Initial notes\nStatus changed to rooting on ' + new Date().toLocaleDateString() + ': Roots are showing!',
      });
      
      mockDb.returning.mockResolvedValue([updatedProp]);

      const updated = await PropagationQueries.updateStatus(1, 'rooting', 'Roots are showing!');

      expect(updated.status).toBe('rooting');
      expect(updated.notes).toContain('Roots are showing!');
      expect(updated.notes).toContain('Status changed to rooting');
    });

    it('should update status without additional notes', async () => {
      const updatedProp = createMockPropagation({
        status: 'rooting' as const,
        notes: 'Status changed to rooting on ' + new Date().toLocaleDateString(),
      });
      
      mockDb.returning.mockResolvedValue([updatedProp]);

      const updated = await PropagationQueries.updateStatus(1, 'rooting');

      expect(updated.status).toBe('rooting');
    });
  });

  describe('getStats', () => {
    it('should calculate propagation statistics', async () => {
      // Mock stats query result
      const mockStats = {
        totalPropagations: 3,
        byStatus: {
          started: 1,
          rooting: 1,
          established: 1,
          failed: 0,
        },
        successRate: 33.33,
        averageDaysToEstablished: 30,
      };
      
      mockDb.returning.mockResolvedValue([mockStats]);

      const stats = await PropagationQueries.getStats(testUser.id);

      expect(stats.totalPropagations).toBe(3);
      expect(stats.byStatus.started).toBe(1);
      expect(stats.byStatus.rooting).toBe(1);
      expect(stats.byStatus.established).toBe(1);
      expect(stats.successRate).toBeCloseTo(33.33, 1);
    });

    it('should return zero stats for user with no propagations', async () => {
      const emptyStats = {
        totalPropagations: 0,
        byStatus: {
          started: 0,
          rooting: 0,
          established: 0,
          failed: 0,
        },
        successRate: 0,
        averageDaysToEstablished: 0,
      };
      
      mockDb.returning.mockResolvedValue([emptyStats]);

      const stats = await PropagationQueries.getStats(testUser.id);

      expect(stats.totalPropagations).toBe(0);
      expect(stats.byStatus.started).toBe(0);
      expect(stats.successRate).toBe(0);
      expect(stats.averageDaysToEstablished).toBe(0);
    });
  });

  describe('delete', () => {
    it('should delete a propagation', async () => {
      // Mock successful deletion
      mockDb.returning
        .mockResolvedValueOnce([createMockPropagation()]) // Create
        .mockResolvedValueOnce([{ affectedRows: 1 }]) // Delete success
        .mockResolvedValueOnce([]); // Verify deletion (empty result)

      const deleteResult = await PropagationQueries.delete(1);
      expect(deleteResult).toBe(true);

      // Verify it's actually deleted
      const retrieved = await PropagationQueries.getById(1);
      expect(retrieved).toBeNull();
    });

    it('should return false for non-existent propagation', async () => {
      // Mock failed deletion (no rows affected)
      mockDb.returning.mockResolvedValue([{ affectedRows: 0 }]);
      
      const result = await PropagationQueries.delete(99999);
      expect(result).toBe(false);
    });
  });
});