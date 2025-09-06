import { OfflineService } from '../offline-service';
import { db } from '@/lib/db';

// Mock the database
jest.mock('@/lib/db', () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
  },
}));

// Mock the schema
jest.mock('@/lib/db/schema', () => ({
  plantInstances: {
    id: 'id',
    userId: 'userId',
    plantId: 'plantId',
    nickname: 'nickname',
    location: 'location',
    lastFertilized: 'lastFertilized',
    fertilizerSchedule: 'fertilizerSchedule',
    fertilizerDue: 'fertilizerDue',
    lastRepot: 'lastRepot',
    notes: 'notes',
    images: 'images',
    isActive: 'isActive',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
  },
  plants: {
    id: 'id',
    family: 'family',
    genus: 'genus',
    species: 'species',
    commonName: 'commonName',
    careInstructions: 'careInstructions',
  },
  propagations: {
    id: 'id',
    userId: 'userId',
    plantId: 'plantId',
    nickname: 'nickname',
    location: 'location',
    dateStarted: 'dateStarted',
    status: 'status',
    notes: 'notes',
    images: 'images',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
  },
  careHistory: {
    userId: 'userId',
    plantInstanceId: 'plantInstanceId',
    careType: 'careType',
    notes: 'notes',
    createdAt: 'createdAt',
  },
}));

const mockDb = db as jest.Mocked<typeof db>;

describe('OfflineService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getOfflineData', () => {
    it('should return user offline data', async () => {
      const mockPlants = [
        {
          id: 1,
          nickname: 'Test Plant',
          location: 'Living Room',
          plant: {
            id: 1,
            family: 'Araceae',
            genus: 'Monstera',
            species: 'deliciosa',
            commonName: 'Monstera',
          },
        },
      ];

      const mockPropagations = [
        {
          id: 1,
          nickname: 'Test Prop',
          status: 'rooting',
          plant: {
            id: 1,
            family: 'Araceae',
            genus: 'Monstera',
            species: 'deliciosa',
            commonName: 'Monstera',
          },
        },
      ];

      const mockCareHistory = [
        {
          id: 1,
          careType: 'fertilizer',
          createdAt: new Date(),
        },
      ];

      // Mock the database queries
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue(mockPlants),
          }),
        }),
      } as any);

      // Mock for propagations query
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue(mockPlants),
          }),
        }),
      } as any);

      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue(mockPropagations),
          }),
        }),
      } as any);

      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue(mockCareHistory),
            }),
          }),
        }),
      } as any);

      const result = await OfflineService.getOfflineData(1);

      expect(result).toHaveProperty('plants');
      expect(result).toHaveProperty('propagations');
      expect(result).toHaveProperty('careHistory');
      expect(result).toHaveProperty('lastSync');
      expect(typeof result.lastSync).toBe('string');
    });

    it('should handle database errors', async () => {
      mockDb.select.mockImplementation(() => {
        throw new Error('Database error');
      });

      await expect(OfflineService.getOfflineData(1)).rejects.toThrow('Failed to prepare offline data');
    });
  });

  describe('processPendingCareEntries', () => {
    it('should process pending care entries successfully', async () => {
      const pendingEntries = [
        {
          id: 'pending-1',
          plantInstanceId: 1,
          careType: 'fertilizer',
          notes: 'Test care',
          timestamp: new Date().toISOString(),
        },
      ];

      const mockInsertResult = [{ id: 1, careType: 'fertilizer' }];

      mockDb.insert.mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue(mockInsertResult),
        }),
      } as any);

      const results = await OfflineService.processPendingCareEntries(1, pendingEntries);

      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        success: true,
        entry: pendingEntries[0],
        result: mockInsertResult[0],
      });
    });

    it('should handle individual entry failures', async () => {
      const pendingEntries = [
        {
          id: 'pending-1',
          plantInstanceId: 1,
          careType: 'fertilizer',
          notes: 'Test care',
          timestamp: new Date().toISOString(),
        },
      ];

      mockDb.insert.mockImplementation(() => {
        throw new Error('Insert failed');
      });

      const results = await OfflineService.processPendingCareEntries(1, pendingEntries);

      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        success: false,
        entry: pendingEntries[0],
        error: 'Insert failed',
      });
    });
  });

  describe('getDataSince', () => {
    it('should return data updated since last sync', async () => {
      const lastSync = '2023-01-01T00:00:00Z';
      const mockUpdatedData = {
        plants: [],
        propagations: [],
        careHistory: [],
      };

      // Mock the database queries for updated data
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([]),
          }),
        }),
      } as any);

      const result = await OfflineService.getDataSince(1, lastSync);

      expect(result).toHaveProperty('plants');
      expect(result).toHaveProperty('propagations');
      expect(result).toHaveProperty('careHistory');
      expect(result).toHaveProperty('syncTimestamp');
      expect(typeof result.syncTimestamp).toBe('string');
    });

    it('should handle errors when getting updated data', async () => {
      mockDb.select.mockImplementation(() => {
        throw new Error('Database error');
      });

      await expect(OfflineService.getDataSince(1, '2023-01-01T00:00:00Z'))
        .rejects.toThrow('Failed to get updated data');
    });
  });
});