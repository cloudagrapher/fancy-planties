// Care Tracking API Endpoint Tests
// Tests POST /api/care, GET /api/care/history, GET /api/dashboard endpoints

import { NextRequest, NextResponse } from 'next/server';
import { POST as logCareHandler } from '@/app/api/care/log/route';
import { POST as quickLogCareHandler } from '@/app/api/care/quick-log/route';
import { GET as getCareHistoryHandler } from '@/app/api/care/history/[plantInstanceId]/route';
import { GET as getCareDashboardHandler } from '@/app/api/care/dashboard/route';
import { GET as getDashboardHandler } from '@/app/api/dashboard/route';
import { createTestUser, createTestSession } from '@/test-utils/factories/user-factory';
import { createTestPlantInstance, createTestCareRecord } from '@/test-utils/factories/plant-factory';
import { resetApiMocks } from '@/test-utils/helpers/api-helpers';

// Mock the auth functions
jest.mock('@/lib/auth/server', () => ({
  requireAuthSession: jest.fn(),
  validateRequest: jest.fn(),
}));

// Mock the care service
jest.mock('@/lib/services/care-service', () => ({
  CareService: {
    logCareEvent: jest.fn(),
    quickCareLog: jest.fn(),
    getCareDashboard: jest.fn(),
  },
}));

// Mock care history queries
jest.mock('@/lib/db/queries/care-history', () => ({
  CareHistoryQueries: {
    getCareHistoryForPlant: jest.fn(),
  },
}));

// Mock database and schema
jest.mock('@/lib/db', () => ({
  db: {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
  },
}));

jest.mock('@/lib/db/schema', () => ({
  plantInstances: {
    id: 'id',
    userId: 'userId',
    isActive: 'isActive',
    fertilizerDue: 'fertilizerDue',
    nickname: 'nickname',
  },
  propagations: {
    userId: 'userId',
    status: 'status',
  },
}));

// Mock care validation
jest.mock('@/lib/validation/care-schemas', () => ({
  careValidation: {
    validateCareForm: jest.fn(),
    validateQuickCareLog: jest.fn(),
  },
}));

// Import mocked functions
import { requireAuthSession, validateRequest } from '@/lib/auth/server';
import { CareService } from '@/lib/services/care-service';
import { CareHistoryQueries } from '@/lib/db/queries/care-history';
import { careValidation } from '@/lib/validation/care-schemas';
import { db } from '@/lib/db';

describe('Care Tracking API Endpoints', () => {
  let testUser;
  let testSession;

  beforeEach(() => {
    jest.clearAllMocks();
    resetApiMocks();

    testUser = createTestUser();
    testSession = createTestSession(testUser);

    // Default auth mocks
    requireAuthSession.mockResolvedValue({
      user: testUser,
      session: testSession,
    });

    validateRequest.mockResolvedValue({
      user: testUser,
      session: testSession,
    });

    // Default service mocks
    CareService.logCareEvent.mockResolvedValue({ id: 1, success: true });
    CareService.quickCareLog.mockResolvedValue({ id: 1, success: true });
    CareService.getCareDashboard.mockResolvedValue({
      upcomingTasks: [],
      overdueTasks: [],
      recentCareEvents: [],
      careStatistics: { thisWeek: 0, thisMonth: 0, total: 0 },
    });

    // Default query mocks
    CareHistoryQueries.getCareHistoryForPlant.mockResolvedValue([]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('POST /api/care/log - Care record creation', () => {
    it('should create care record with valid data', async () => {
      // Arrange
      const testPlantInstance = createTestPlantInstance({ userId: testUser.id });
      const requestBody = {
        plantInstanceId: testPlantInstance.id,
        careType: 'watering',
        careDate: '2024-01-15T10:00:00.000Z',
        notes: 'Regular watering',
      };

      const validatedData = {
        ...requestBody,
        careDate: new Date(requestBody.careDate),
      };

      const createdCareRecord = createTestCareRecord({
        ...validatedData,
        id: 1,
        userId: testUser.id,
      });

      careValidation.validateCareForm.mockReturnValue({
        success: true,
        data: validatedData,
      });

      CareService.logCareEvent.mockResolvedValue({
        success: true,
        careHistory: createdCareRecord,
      });

      const request = new NextRequest('http://localhost:3000/api/care/log', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Act
      const response = await logCareHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData).toEqual({
        ...createdCareRecord,
        // JSON serializes dates to strings
        careDate: createdCareRecord.careDate.toISOString(),
        createdAt: createdCareRecord.createdAt.toISOString(),
        updatedAt: createdCareRecord.updatedAt.toISOString(),
      });

      expect(requireAuthSession).toHaveBeenCalled();
      expect(careValidation.validateCareForm).toHaveBeenCalledWith(validatedData);
      expect(CareService.logCareEvent).toHaveBeenCalledWith(testUser.id, validatedData);
    });

    it('should return validation error for invalid care data', async () => {
      // Arrange
      const requestBody = {
        plantInstanceId: 'invalid',
        careType: 'invalid_type',
        careDate: 'invalid_date',
      };

      careValidation.validateCareForm.mockReturnValue({
        success: false,
        error: {
          issues: [
            { message: 'Plant instance ID must be a number' },
            { message: 'Invalid care type' },
            { message: 'Invalid date format' },
          ],
        },
      });

      const request = new NextRequest('http://localhost:3000/api/care/log', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Act
      const response = await logCareHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(responseData).toEqual({
        error: 'Plant instance ID must be a number',
      });

      expect(CareService.logCareEvent).not.toHaveBeenCalled();
    });

    it('should return error when care service fails', async () => {
      // Arrange
      const requestBody = {
        plantInstanceId: 1,
        careType: 'watering',
        careDate: '2024-01-15T10:00:00.000Z',
      };

      careValidation.validateCareForm.mockReturnValue({
        success: true,
        data: {
          ...requestBody,
          careDate: new Date(requestBody.careDate),
        },
      });

      CareService.logCareEvent.mockResolvedValue({
        success: false,
        error: 'Plant instance not found',
      });

      const request = new NextRequest('http://localhost:3000/api/care/log', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Act
      const response = await logCareHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(responseData).toEqual({
        error: 'Plant instance not found',
      });
    });

    it('should return unauthorized error when user not authenticated', async () => {
      // Arrange
      requireAuthSession.mockRejectedValue(new Error('Unauthorized'));

      const request = new NextRequest('http://localhost:3000/api/care/log', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Act
      const response = await logCareHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(responseData).toEqual({
        error: 'Failed to log care event',
      });

      expect(CareService.logCareEvent).not.toHaveBeenCalled();
    });

    it('should handle malformed JSON request', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/care/log', {
        method: 'POST',
        body: 'invalid json',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Act
      const response = await logCareHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(responseData).toEqual({
        error: 'Failed to log care event',
      });

      expect(CareService.logCareEvent).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/care/quick-log - Quick care logging', () => {
    it('should create quick care log with valid data', async () => {
      // Arrange
      const requestBody = {
        plantInstanceIds: [1, 2, 3],
        careType: 'watering',
        notes: 'Quick watering session',
      };

      const validatedData = {
        ...requestBody,
        careDate: expect.any(Date),
      };

      const careRecords = [
        createTestCareRecord({ id: 1, plantInstanceId: 1 }),
        createTestCareRecord({ id: 2, plantInstanceId: 2 }),
        createTestCareRecord({ id: 3, plantInstanceId: 3 }),
      ];

      careValidation.validateQuickCareLog.mockReturnValue({
        success: true,
        data: validatedData,
      });

      CareService.quickCareLog.mockResolvedValue({
        success: true,
        careHistory: careRecords,
      });

      const request = new NextRequest('http://localhost:3000/api/care/quick-log', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Act
      const response = await quickLogCareHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData).toEqual(careRecords.map(record => ({
        ...record,
        // JSON serializes dates to strings
        careDate: record.careDate.toISOString(),
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString(),
      })));

      expect(requireAuthSession).toHaveBeenCalled();
      expect(careValidation.validateQuickCareLog).toHaveBeenCalledWith(validatedData);
      expect(CareService.quickCareLog).toHaveBeenCalledWith(testUser.id, validatedData);
    });

    it('should return validation error with detailed issues', async () => {
      // Arrange
      const requestBody = {
        plantInstanceIds: [],
        careType: 'invalid',
      };

      careValidation.validateQuickCareLog.mockReturnValue({
        success: false,
        error: {
          issues: [
            { message: 'At least one plant instance is required' },
            { message: 'Invalid care type' },
          ],
        },
      });

      const request = new NextRequest('http://localhost:3000/api/care/quick-log', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Act
      const response = await quickLogCareHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(responseData).toEqual({
        error: 'At least one plant instance is required',
        details: [
          { message: 'At least one plant instance is required' },
          { message: 'Invalid care type' },
        ],
      });

      expect(CareService.quickCareLog).not.toHaveBeenCalled();
    });

    it('should handle quick care service errors', async () => {
      // Arrange
      const requestBody = {
        plantInstanceIds: [999],
        careType: 'watering',
      };

      careValidation.validateQuickCareLog.mockReturnValue({
        success: true,
        data: {
          ...requestBody,
          careDate: new Date(),
        },
      });

      CareService.quickCareLog.mockResolvedValue({
        success: false,
        error: 'Some plant instances not found',
      });

      const request = new NextRequest('http://localhost:3000/api/care/quick-log', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Act
      const response = await quickLogCareHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(responseData).toEqual({
        error: 'Some plant instances not found',
      });
    });
  });

  describe('GET /api/care/history/[plantInstanceId] - Care history retrieval and filtering', () => {
    it('should return care history with default filters', async () => {
      // Arrange
      const plantInstanceId = 1;
      const careHistory = [
        createTestCareRecord({ id: 1, plantInstanceId, careType: 'watering' }),
        createTestCareRecord({ id: 2, plantInstanceId, careType: 'fertilizing' }),
      ];

      CareHistoryQueries.getCareHistoryForPlant.mockResolvedValue(careHistory);

      const request = new NextRequest(`http://localhost:3000/api/care/history/${plantInstanceId}`);
      const params = Promise.resolve({ plantInstanceId: plantInstanceId.toString() });

      // Act
      const response = await getCareHistoryHandler(request, { params });
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData).toEqual(careHistory.map(record => ({
        ...record,
        // JSON serializes dates to strings
        careDate: record.careDate.toISOString(),
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString(),
      })));

      expect(validateRequest).toHaveBeenCalled();
      expect(CareHistoryQueries.getCareHistoryForPlant).toHaveBeenCalledWith(
        plantInstanceId,
        testUser.id,
        {
          careType: undefined,
          startDate: undefined,
          endDate: undefined,
          limit: 50,
          offset: 0,
          sortBy: 'care_date',
          sortOrder: 'desc',
        }
      );
    });

    it('should return care history with custom filters', async () => {
      // Arrange
      const plantInstanceId = 1;
      const careHistory = [
        createTestCareRecord({ id: 1, plantInstanceId, careType: 'watering' }),
      ];

      CareHistoryQueries.getCareHistoryForPlant.mockResolvedValue(careHistory);

      const queryParams = new URLSearchParams({
        careType: 'watering',
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        limit: '10',
        offset: '5',
        sortBy: 'care_type',
        sortOrder: 'asc',
      });

      const request = new NextRequest(`http://localhost:3000/api/care/history/${plantInstanceId}?${queryParams}`);
      const params = Promise.resolve({ plantInstanceId: plantInstanceId.toString() });

      // Act
      const response = await getCareHistoryHandler(request, { params });
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData).toEqual(careHistory.map(record => ({
        ...record,
        // JSON serializes dates to strings
        careDate: record.careDate.toISOString(),
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString(),
      })));

      expect(CareHistoryQueries.getCareHistoryForPlant).toHaveBeenCalledWith(
        plantInstanceId,
        testUser.id,
        {
          careType: 'watering',
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-31'),
          limit: 10,
          offset: 5,
          sortBy: 'care_type',
          sortOrder: 'asc',
        }
      );
    });

    it('should return bad request error for invalid plant instance ID', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/care/history/invalid');
      const params = Promise.resolve({ plantInstanceId: 'invalid' });

      // Act
      const response = await getCareHistoryHandler(request, { params });
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(responseData).toEqual({
        error: 'Invalid plant instance ID',
      });

      expect(CareHistoryQueries.getCareHistoryForPlant).not.toHaveBeenCalled();
    });

    it('should return unauthorized error when user not authenticated', async () => {
      // Arrange
      validateRequest.mockResolvedValue({
        user: null,
        session: null,
      });

      const request = new NextRequest('http://localhost:3000/api/care/history/1');
      const params = Promise.resolve({ plantInstanceId: '1' });

      // Act
      const response = await getCareHistoryHandler(request, { params });
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(responseData).toEqual({
        error: 'Unauthorized',
      });

      expect(CareHistoryQueries.getCareHistoryForPlant).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      CareHistoryQueries.getCareHistoryForPlant.mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/care/history/1');
      const params = Promise.resolve({ plantInstanceId: '1' });

      // Act
      const response = await getCareHistoryHandler(request, { params });
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(responseData).toEqual({
        error: 'Failed to get care history',
      });
    });
  });

  describe('GET /api/dashboard - Dashboard statistics calculation', () => {
    it('should return dashboard statistics with plant and propagation data', async () => {
      // Arrange
      const mockStats = {
        totalPlants: 15,
        activePlants: 12,
        careDueToday: 3,
        totalPropagations: 8,
        activePropagations: 5,
        successfulPropagations: 6,
        propagationSuccessRate: 75,
        fertilizerEvents: [
          {
            id: 'fertilizer-1',
            plantName: 'Monstera Deliciosa',
            plantId: '1',
            date: '2024-01-15',
            type: 'fertilize',
          },
          {
            id: 'fertilizer-2',
            plantName: 'Fiddle Leaf Fig',
            plantId: '2',
            date: '2024-01-16',
            type: 'fertilize',
          },
        ],
      };

      // Mock database queries
      db.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([
            {
              totalPlants: 15,
              activePlants: 12,
              careDueToday: 3,
            },
          ]),
        }),
      });

      // Mock propagation stats query
      db.select
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([
              {
                totalPlants: 15,
                activePlants: 12,
                careDueToday: 3,
              },
            ]),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([
              {
                totalPropagations: 8,
                activePropagations: 5,
                successfulPropagations: 6,
              },
            ]),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([
              {
                count: 8,
              },
            ]),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([
              {
                id: 1,
                nickname: 'Monstera Deliciosa',
                fertilizerDue: new Date('2024-01-15'),
              },
              {
                id: 2,
                nickname: 'Fiddle Leaf Fig',
                fertilizerDue: new Date('2024-01-16'),
              },
            ]),
          }),
        });

      const request = new NextRequest('http://localhost:3000/api/dashboard');

      // Act
      const response = await getDashboardHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData).toMatchObject({
        totalPlants: expect.any(Number),
        activePlants: expect.any(Number),
        careDueToday: expect.any(Number),
        totalPropagations: expect.any(Number),
        activePropagations: expect.any(Number),
        successfulPropagations: expect.any(Number),
        propagationSuccessRate: expect.any(Number),
        fertilizerEvents: expect.any(Array),
      });

      expect(validateRequest).toHaveBeenCalled();
    });

    it('should return unauthorized error when user not authenticated', async () => {
      // Arrange
      validateRequest.mockResolvedValue({
        user: null,
        session: null,
      });

      const request = new NextRequest('http://localhost:3000/api/dashboard');

      // Act
      const response = await getDashboardHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(responseData).toEqual({
        error: 'Unauthorized',
      });
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      db.select.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const request = new NextRequest('http://localhost:3000/api/dashboard');

      // Act
      const response = await getDashboardHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(responseData).toEqual({
        error: 'Failed to get dashboard stats',
      });
    });
  });

  describe('GET /api/care/dashboard - Care-specific dashboard', () => {
    it('should return care dashboard data', async () => {
      // Arrange
      const mockCareDashboard = {
        upcomingCare: [
          {
            plantInstanceId: 1,
            plantName: 'Monstera',
            careType: 'watering',
            dueDate: '2024-01-15',
            overdue: false,
          },
        ],
        recentCare: [
          {
            id: 1,
            plantInstanceId: 1,
            careType: 'watering',
            careDate: '2024-01-10',
            notes: 'Regular watering',
          },
        ],
        careStats: {
          totalCareEvents: 25,
          thisWeekCare: 5,
          overdueCare: 2,
        },
      };

      CareService.getCareDashboard.mockResolvedValue(mockCareDashboard);

      const request = new NextRequest('http://localhost:3000/api/care/dashboard');

      // Act
      const response = await getCareDashboardHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData).toEqual(mockCareDashboard);

      expect(requireAuthSession).toHaveBeenCalled();
      expect(CareService.getCareDashboard).toHaveBeenCalledWith(testUser.id);
    });

    it('should return unauthorized error when user not authenticated', async () => {
      // Arrange
      requireAuthSession.mockRejectedValue(new Error('Unauthorized'));

      const request = new NextRequest('http://localhost:3000/api/care/dashboard');

      // Act
      const response = await getCareDashboardHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(responseData).toEqual({
        error: 'Failed to fetch care dashboard',
      });

      expect(CareService.getCareDashboard).not.toHaveBeenCalled();
    });

    it('should handle care service errors', async () => {
      // Arrange
      CareService.getCareDashboard.mockRejectedValue(new Error('Care service failed'));

      const request = new NextRequest('http://localhost:3000/api/care/dashboard');

      // Act
      const response = await getCareDashboardHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(responseData).toEqual({
        error: 'Failed to fetch care dashboard',
      });
    });
  });

  describe('Care Tracking Integration Tests', () => {
    it('should handle complete care workflow: log -> history -> dashboard', async () => {
      const plantInstanceId = 1;
      
      // Step 1: Log care event
      const careData = {
        plantInstanceId,
        careType: 'watering',
        careDate: '2024-01-15T10:00:00.000Z',
        notes: 'Regular watering',
      };

      const careRecord = createTestCareRecord({
        id: 1,
        ...careData,
        careDate: new Date(careData.careDate),
        userId: testUser.id,
      });

      careValidation.validateCareForm.mockReturnValue({
        success: true,
        data: {
          ...careData,
          careDate: new Date(careData.careDate),
        },
      });

      CareService.logCareEvent.mockResolvedValue({
        success: true,
        careHistory: careRecord,
      });

      const logRequest = new NextRequest('http://localhost:3000/api/care/log', {
        method: 'POST',
        body: JSON.stringify(careData),
        headers: { 'Content-Type': 'application/json' },
      });

      const logResponse = await logCareHandler(logRequest);
      const logResponseData = await logResponse.json();

      expect(logResponse.status).toBe(200);
      expect(logResponseData).toEqual({
        ...careRecord,
        // JSON serializes dates to strings
        careDate: careRecord.careDate.toISOString(),
        createdAt: careRecord.createdAt.toISOString(),
        updatedAt: careRecord.updatedAt.toISOString(),
      });

      // Step 2: Get care history
      const careHistory = [careRecord];
      CareHistoryQueries.getCareHistoryForPlant.mockResolvedValue(careHistory);

      const historyRequest = new NextRequest(`http://localhost:3000/api/care/history/${plantInstanceId}`);
      const historyParams = Promise.resolve({ plantInstanceId: plantInstanceId.toString() });

      const historyResponse = await getCareHistoryHandler(historyRequest, { params: historyParams });
      const historyResponseData = await historyResponse.json();

      expect(historyResponse.status).toBe(200);
      expect(historyResponseData).toEqual(careHistory.map(record => ({
        ...record,
        // JSON serializes dates to strings
        careDate: record.careDate.toISOString(),
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString(),
      })));

      // Step 3: Get care dashboard
      const careDashboard = {
        upcomingCare: [],
        recentCare: [careRecord],
        careStats: {
          totalCareEvents: 1,
          thisWeekCare: 1,
          overdueCare: 0,
        },
      };

      CareService.getCareDashboard.mockResolvedValue(careDashboard);

      const dashboardRequest = new NextRequest('http://localhost:3000/api/care/dashboard');
      const dashboardResponse = await getCareDashboardHandler(dashboardRequest);
      const dashboardResponseData = await dashboardResponse.json();

      expect(dashboardResponse.status).toBe(200);
      expect(dashboardResponseData).toEqual({
        ...careDashboard,
        recentCare: careDashboard.recentCare.map(record => ({
          ...record,
          // JSON serializes dates to strings
          careDate: record.careDate.toISOString(),
          createdAt: record.createdAt.toISOString(),
          updatedAt: record.updatedAt.toISOString(),
        })),
      });

      // Verify all services were called correctly
      expect(CareService.logCareEvent).toHaveBeenCalledWith(testUser.id, expect.any(Object));
      expect(CareHistoryQueries.getCareHistoryForPlant).toHaveBeenCalledWith(plantInstanceId, testUser.id, expect.any(Object));
      expect(CareService.getCareDashboard).toHaveBeenCalledWith(testUser.id);
    });

    it('should handle authorization across all care endpoints', async () => {
      // Test unauthorized access to all care endpoints
      requireAuthSession.mockRejectedValue(new Error('Unauthorized'));
      validateRequest.mockResolvedValue({ user: null, session: null });

      // POST /api/care/log
      const logRequest = new NextRequest('http://localhost:3000/api/care/log', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' },
      });
      const logResponse = await logCareHandler(logRequest);
      expect(logResponse.status).toBe(500); // Service error due to auth failure

      // POST /api/care/quick-log
      const quickLogRequest = new NextRequest('http://localhost:3000/api/care/quick-log', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' },
      });
      const quickLogResponse = await quickLogCareHandler(quickLogRequest);
      expect(quickLogResponse.status).toBe(500); // Service error due to auth failure

      // GET /api/care/history/1
      const historyRequest = new NextRequest('http://localhost:3000/api/care/history/1');
      const historyParams = Promise.resolve({ plantInstanceId: '1' });
      const historyResponse = await getCareHistoryHandler(historyRequest, { params: historyParams });
      expect(historyResponse.status).toBe(401);

      // GET /api/care/dashboard
      const careDashboardRequest = new NextRequest('http://localhost:3000/api/care/dashboard');
      const careDashboardResponse = await getCareDashboardHandler(careDashboardRequest);
      expect(careDashboardResponse.status).toBe(500); // Service error due to auth failure

      // GET /api/dashboard
      const dashboardRequest = new NextRequest('http://localhost:3000/api/dashboard');
      const dashboardResponse = await getDashboardHandler(dashboardRequest);
      expect(dashboardResponse.status).toBe(401);
    });
  });
});