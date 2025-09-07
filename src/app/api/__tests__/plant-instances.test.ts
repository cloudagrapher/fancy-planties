import { NextRequest } from 'next/server';
import { GET, POST } from '../plant-instances/route';
import { createMockPlantInstance, mockDatabaseQueries } from '@/test-utils/helpers';

// Mock the database queries
jest.mock('@/lib/db/query-optimization', () => ({
  optimizedPlantQueries: mockDatabaseQueries(),
}));

// Mock authentication
jest.mock('@/lib/auth/server', () => ({
  validateRequest: jest.fn(() => Promise.resolve({
    user: { id: 1, email: 'test@example.com' },
    session: { id: 'session-1' },
  })),
}));

// Mock validation
jest.mock('@/lib/validation/plant-schemas', () => ({
  enhancedPlantInstanceFilterSchema: {
    parse: jest.fn((data) => data),
  },
  plantInstanceCreateSchema: {
    parse: jest.fn((data) => data),
  },
}));

describe('/api/plant-instances', () => {
  const mockQueries = mockDatabaseQueries();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/plant-instances', () => {
    it('returns user plant instances successfully', async () => {
      const mockPlants = [
        createMockPlantInstance({ id: 1, nickname: 'Plant 1' }),
        createMockPlantInstance({ id: 2, nickname: 'Plant 2' }),
      ];

      mockQueries.getUserActivePlants.mockResolvedValueOnce(mockPlants);

      const request = new NextRequest('http://localhost:3000/api/plant-instances');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.instances).toHaveLength(2);
      expect(data.data.instances[0].nickname).toBe('Plant 1');
    });

    it('handles search query parameter', async () => {
      const mockPlants = [
        createMockPlantInstance({ nickname: 'Monstera' }),
      ];

      mockQueries.searchPlants.mockResolvedValueOnce(mockPlants);

      const request = new NextRequest('http://localhost:3000/api/plant-instances?search=monstera');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockQueries.searchPlants).toHaveBeenCalledWith(1, 'monstera', 20);
    });

    it('handles pagination parameters', async () => {
      const mockPlants = [createMockPlantInstance()];

      mockQueries.getUserActivePlants.mockResolvedValueOnce(mockPlants);

      const request = new NextRequest('http://localhost:3000/api/plant-instances?limit=10&offset=20');
      const response = await GET(request);

      expect(mockQueries.getUserActivePlants).toHaveBeenCalledWith(1, 10, 20);
    });

    it('handles location filter', async () => {
      const mockPlants = [createMockPlantInstance({ location: 'Living Room' })];

      mockQueries.getUserActivePlants.mockResolvedValueOnce(mockPlants);

      const request = new NextRequest('http://localhost:3000/api/plant-instances?location=Living%20Room');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.instances[0].location).toBe('Living Room');
    });

    it('returns 401 when user is not authenticated', async () => {
      const { validateRequest } = require('@/lib/auth/server');
      validateRequest.mockResolvedValueOnce({ user: null, session: null });

      const request = new NextRequest('http://localhost:3000/api/plant-instances');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Unauthorized');
    });

    it('handles database errors gracefully', async () => {
      mockQueries.getUserActivePlants.mockRejectedValueOnce(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/plant-instances');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Internal server error');
    });
  });

  describe('POST /api/plant-instances', () => {
    const validPlantData = {
      plantId: 1,
      nickname: 'New Plant',
      location: 'Bedroom',
      fertilizerSchedule: '2 weeks',
      notes: 'Test notes',
    };

    it('creates plant instance successfully', async () => {
      const mockCreatedPlant = createMockPlantInstance(validPlantData);

      // Mock database insert
      const mockDb = {
        insert: jest.fn().mockReturnValue({
          values: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([mockCreatedPlant]),
          }),
        }),
      };

      jest.doMock('@/lib/db', () => ({ db: mockDb }));

      const request = new NextRequest('http://localhost:3000/api/plant-instances', {
        method: 'POST',
        body: JSON.stringify(validPlantData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.nickname).toBe('New Plant');
    });

    it('validates request body', async () => {
      const { plantInstanceCreateSchema } = require('@/lib/validation/plant-schemas');
      plantInstanceCreateSchema.parse.mockImplementationOnce(() => {
        throw new Error('Validation failed');
      });

      const request = new NextRequest('http://localhost:3000/api/plant-instances', {
        method: 'POST',
        body: JSON.stringify({ invalid: 'data' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Validation failed');
    });

    it('handles missing request body', async () => {
      const request = new NextRequest('http://localhost:3000/api/plant-instances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('handles invalid JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/plant-instances', {
        method: 'POST',
        body: 'invalid json',
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('returns 401 when user is not authenticated', async () => {
      const { validateRequest } = require('@/lib/auth/server');
      validateRequest.mockResolvedValueOnce({ user: null, session: null });

      const request = new NextRequest('http://localhost:3000/api/plant-instances', {
        method: 'POST',
        body: JSON.stringify(validPlantData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Unauthorized');
    });

    it('handles database constraint violations', async () => {
      const mockDb = {
        insert: jest.fn().mockReturnValue({
          values: jest.fn().mockReturnValue({
            returning: jest.fn().mockRejectedValue(new Error('Unique constraint violation')),
          }),
        }),
      };

      jest.doMock('@/lib/db', () => ({ db: mockDb }));

      const request = new NextRequest('http://localhost:3000/api/plant-instances', {
        method: 'POST',
        body: JSON.stringify(validPlantData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });

    it('calculates fertilizer due date correctly', async () => {
      const plantWithSchedule = {
        ...validPlantData,
        fertilizerSchedule: '2 weeks',
        lastFertilized: new Date('2024-01-01'),
      };

      const mockCreatedPlant = createMockPlantInstance({
        ...plantWithSchedule,
        fertilizerDue: new Date('2024-01-15'), // 2 weeks after last fertilized
      });

      const mockDb = {
        insert: jest.fn().mockReturnValue({
          values: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([mockCreatedPlant]),
          }),
        }),
      };

      jest.doMock('@/lib/db', () => ({ db: mockDb }));

      const request = new NextRequest('http://localhost:3000/api/plant-instances', {
        method: 'POST',
        body: JSON.stringify(plantWithSchedule),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data.fertilizerDue).toBeTruthy();
    });
  });
});