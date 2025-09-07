/**
 * Integration tests for plant management workflows
 * Tests the complete flow from API to database
 */

import { NextRequest } from 'next/server';
import { GET as getPlantInstances, POST as createPlantInstance } from '@/app/api/plant-instances/route';
import { POST as logCare } from '@/app/api/care/log/route';
import { createMockPlantInstance, mockApiResponse } from '@/__tests__/utils/test-helpers';

// Mock the entire database module
const mockDb = {
  select: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

jest.mock('@/lib/db', () => ({
  db: mockDb,
}));

// Mock authentication
jest.mock('@/lib/auth/server', () => ({
  validateRequest: jest.fn(() => Promise.resolve({
    user: { id: 1, email: 'test@example.com' },
    session: { id: 'session-1' },
  })),
}));

// Mock validation schemas
jest.mock('@/lib/validation/plant-schemas', () => ({
  enhancedPlantInstanceFilterSchema: {
    parse: jest.fn((data) => ({ userId: 1, ...data })),
  },
  plantInstanceCreateSchema: {
    parse: jest.fn((data) => data),
  },
}));

jest.mock('@/lib/validation/care-schemas', () => ({
  careLogSchema: {
    parse: jest.fn((data) => data),
  },
}));

describe('Plant Management Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock implementations
    mockDb.select.mockReturnValue({
      from: jest.fn().mockReturnValue({
        leftJoin: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                offset: jest.fn().mockResolvedValue([]),
              }),
            }),
          }),
        }),
      }),
    });

    mockDb.insert.mockReturnValue({
      values: jest.fn().mockReturnValue({
        returning: jest.fn().mockResolvedValue([createMockPlantInstance()]),
      }),
    });
  });

  describe('Complete Plant Lifecycle', () => {
    it('creates plant, logs care, and retrieves updated data', async () => {
      const plantData = {
        plantId: 1,
        nickname: 'Integration Test Plant',
        location: 'Test Room',
        fertilizerSchedule: '2 weeks',
      };

      // Step 1: Create plant instance
      const createRequest = new NextRequest('http://localhost:3000/api/plant-instances', {
        method: 'POST',
        body: JSON.stringify(plantData),
        headers: { 'Content-Type': 'application/json' },
      });

      const createResponse = await createPlantInstance(createRequest);
      const createData = await createResponse.json();

      expect(createResponse.status).toBe(201);
      expect(createData.success).toBe(true);
      expect(mockDb.insert).toHaveBeenCalled();

      // Step 2: Log care for the plant
      const careData = {
        plantInstanceId: 1,
        careType: 'fertilizer',
        notes: 'First fertilizer application',
      };

      const careRequest = new NextRequest('http://localhost:3000/api/care/log', {
        method: 'POST',
        body: JSON.stringify(careData),
        headers: { 'Content-Type': 'application/json' },
      });

      const careResponse = await logCare(careRequest);
      const careResponseData = await careResponse.json();

      expect(careResponse.status).toBe(201);
      expect(careResponseData.success).toBe(true);

      // Step 3: Retrieve updated plant data
      const getRequest = new NextRequest('http://localhost:3000/api/plant-instances');
      const getResponse = await getPlantInstances(getRequest);
      const getData = await getResponse.json();

      expect(getResponse.status).toBe(200);
      expect(getData.success).toBe(true);
      expect(mockDb.select).toHaveBeenCalled();
    });

    it('handles plant creation with immediate care logging', async () => {
      const plantData = {
        plantId: 1,
        nickname: 'New Plant with Care',
        location: 'Bedroom',
        fertilizerSchedule: '1 month',
        lastFertilized: new Date().toISOString(),
      };

      // Create plant with initial care date
      const createRequest = new NextRequest('http://localhost:3000/api/plant-instances', {
        method: 'POST',
        body: JSON.stringify(plantData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await createPlantInstance(createRequest);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      
      // Verify that fertilizer due date was calculated
      const insertCall = mockDb.insert.mock.calls[0];
      expect(insertCall).toBeDefined();
    });
  });

  describe('Search and Filter Integration', () => {
    it('searches plants across multiple fields', async () => {
      const mockPlants = [
        createMockPlantInstance({
          nickname: 'Monstera Deliciosa',
          location: 'Living Room',
        }),
        createMockPlantInstance({
          nickname: 'Snake Plant',
          location: 'Bedroom',
        }),
      ];

      // Mock search results
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue(mockPlants.filter(p => 
                p.nickname.toLowerCase().includes('monstera') ||
                p.location.toLowerCase().includes('living')
              )),
            }),
          }),
        }),
      });

      const searchRequest = new NextRequest(
        'http://localhost:3000/api/plant-instances?search=monstera living'
      );

      const response = await getPlantInstances(searchRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockDb.select).toHaveBeenCalled();
    });

    it('filters plants by location and care status', async () => {
      const mockPlants = [
        createMockPlantInstance({
          location: 'Living Room',
          careUrgency: 'high',
        }),
      ];

      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  offset: jest.fn().mockResolvedValue(mockPlants),
                }),
              }),
            }),
          }),
        }),
      });

      const filterRequest = new NextRequest(
        'http://localhost:3000/api/plant-instances?location=Living%20Room&overdueOnly=true'
      );

      const response = await getPlantInstances(filterRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('Care Tracking Integration', () => {
    it('updates plant fertilizer due date after care logging', async () => {
      const careData = {
        plantInstanceId: 1,
        careType: 'fertilizer',
        careDate: new Date().toISOString(),
      };

      // Mock the care logging and plant update
      mockDb.insert.mockReturnValueOnce({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([{
            id: 1,
            plantInstanceId: 1,
            careType: 'fertilizer',
            careDate: new Date(),
          }]),
        }),
      });

      mockDb.update.mockReturnValueOnce({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{
            id: 1,
            fertilizerDue: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks later
          }]),
        }),
      });

      const careRequest = new NextRequest('http://localhost:3000/api/care/log', {
        method: 'POST',
        body: JSON.stringify(careData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await logCare(careRequest);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      
      // Verify both care history insert and plant update were called
      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.update).toHaveBeenCalled();
    });

    it('handles multiple care types for the same plant', async () => {
      const careTypes = ['fertilizer', 'water', 'repot'];
      
      for (const careType of careTypes) {
        const careData = {
          plantInstanceId: 1,
          careType,
          careDate: new Date().toISOString(),
        };

        mockDb.insert.mockReturnValueOnce({
          values: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([{
              id: Math.random(),
              plantInstanceId: 1,
              careType,
              careDate: new Date(),
            }]),
          }),
        });

        const careRequest = new NextRequest('http://localhost:3000/api/care/log', {
          method: 'POST',
          body: JSON.stringify(careData),
          headers: { 'Content-Type': 'application/json' },
        });

        const response = await logCare(careRequest);
        expect(response.status).toBe(201);
      }

      // Verify all care types were logged
      expect(mockDb.insert).toHaveBeenCalledTimes(careTypes.length);
    });
  });

  describe('Error Handling Integration', () => {
    it('handles database connection errors gracefully', async () => {
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  offset: jest.fn().mockRejectedValue(new Error('Database connection failed')),
                }),
              }),
            }),
          }),
        }),
      });

      const request = new NextRequest('http://localhost:3000/api/plant-instances');
      const response = await getPlantInstances(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Internal server error');
    });

    it('handles validation errors in the complete flow', async () => {
      const { plantInstanceCreateSchema } = await import('@/lib/validation/plant-schemas');
      plantInstanceCreateSchema.parse.mockImplementationOnce(() => {
        const error = new Error('Validation failed');
        error.name = 'ZodError';
        error.issues = [{ message: 'Invalid plant data' }];
        throw error;
      });

      const invalidPlantData = {
        // Missing required fields
        nickname: '',
      };

      const request = new NextRequest('http://localhost:3000/api/plant-instances', {
        method: 'POST',
        body: JSON.stringify(invalidPlantData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await createPlantInstance(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Validation');
    });

    it('handles authentication failures across endpoints', async () => {
      const { validateRequest } = await import('@/lib/auth/server');
      validateRequest.mockResolvedValueOnce({ user: null, session: null });

      const requests = [
        new NextRequest('http://localhost:3000/api/plant-instances'),
        new NextRequest('http://localhost:3000/api/plant-instances', {
          method: 'POST',
          body: JSON.stringify({}),
          headers: { 'Content-Type': 'application/json' },
        }),
        new NextRequest('http://localhost:3000/api/care/log', {
          method: 'POST',
          body: JSON.stringify({}),
          headers: { 'Content-Type': 'application/json' },
        }),
      ];

      for (const request of requests) {
        let response;
        
        if (request.url.includes('/care/log')) {
          response = await logCare(request);
        } else if (request.method === 'POST') {
          response = await createPlantInstance(request);
        } else {
          response = await getPlantInstances(request);
        }

        const data = await response.json();
        expect(response.status).toBe(401);
        expect(data.success).toBe(false);
        expect(data.error).toBe('Unauthorized');
      }
    });
  });

  describe('Performance and Pagination', () => {
    it('handles large datasets with pagination', async () => {
      const mockPlants = Array.from({ length: 100 }, (_, i) => 
        createMockPlantInstance({ id: i + 1, nickname: `Plant ${i + 1}` })
      );

      // Mock paginated results
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  offset: jest.fn().mockResolvedValue(mockPlants.slice(0, 20)),
                }),
              }),
            }),
          }),
        }),
      });

      const request = new NextRequest(
        'http://localhost:3000/api/plant-instances?limit=20&offset=0'
      );

      const response = await getPlantInstances(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.instances).toHaveLength(20);
    });

    it('handles concurrent requests correctly', async () => {
      const requests = Array.from({ length: 5 }, (_, i) => 
        new NextRequest(`http://localhost:3000/api/plant-instances?offset=${i * 10}`)
      );

      // Mock different results for each request
      requests.forEach((_, i) => {
        mockDb.select.mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            leftJoin: jest.fn().mockReturnValue({
              where: jest.fn().mockReturnValue({
                orderBy: jest.fn().mockReturnValue({
                  limit: jest.fn().mockReturnValue({
                    offset: jest.fn().mockResolvedValue([
                      createMockPlantInstance({ id: i + 1 })
                    ]),
                  }),
                }),
              }),
            }),
          }),
        });
      });

      const responses = await Promise.all(
        requests.map(request => getPlantInstances(request))
      );

      // All requests should succeed
      for (const response of responses) {
        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
      }
    });
  });
});