// Plant Management API Endpoint Tests
// Tests GET /api/plants, POST /api/plant-instances, PUT /api/plant-instances/[id] endpoints

import { NextRequest, NextResponse } from 'next/server';
import { GET as getPlantsHandler, POST as createPlantHandler } from '@/app/api/plants/route';
import { GET as getPlantInstancesHandler, POST as createPlantInstanceHandler } from '@/app/api/plant-instances/route';
import { GET as getPlantInstanceHandler, PUT as updatePlantInstanceHandler, DELETE as deletePlantInstanceHandler } from '@/app/api/plant-instances/[id]/route';
import { createTestUser, createTestSession } from '@/test-utils/factories/user-factory';
import { createTestPlant, createTestPlantInstance } from '@/test-utils/factories/plant-factory';
import { resetApiMocks } from '@/test-utils/helpers/api-helpers';

// Mock the auth functions
jest.mock('@/lib/auth/server', () => ({
  validateRequest: jest.fn(),
  validateVerifiedRequest: jest.fn(),
}));

// Mock the database queries
jest.mock('@/lib/db/queries/plant-taxonomy', () => ({
  createPlant: jest.fn(),
  getPlantsWithStats: jest.fn(),
  validatePlantTaxonomy: jest.fn(),
}));

jest.mock('@/lib/db/queries/plant-instances', () => ({
  PlantInstanceQueries: {
    getWithFilters: jest.fn(),
    create: jest.fn(),
    getEnhancedById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

// Mock validation schemas
jest.mock('@/lib/validation/plant-schemas', () => {
  const { createMockZodSchema } = require('@/test-utils/mocks/validation-mocks');

  return {
    createPlantSchema: createMockZodSchema({
      family: 'Araceae',
      genus: 'Monstera',
      species: 'deliciosa',
      commonName: 'Swiss Cheese Plant',
    }),
    plantFilterSchema: createMockZodSchema({
      limit: 20,
      offset: 0,
      family: undefined,
      genus: undefined,
      search: undefined,
    }),
    createPlantInstanceSchema: createMockZodSchema({
      plantId: 1,
      nickname: 'Test Plant',
      location: 'Living Room',
      fertilizerSchedule: 'monthly',
    }),
    plantInstanceFilterSchema: createMockZodSchema({
      limit: 20,
      offset: 0,
      location: undefined,
      fertilizerSchedule: undefined,
      isActive: true,
    }),
    updatePlantInstanceSchema: createMockZodSchema({
      nickname: 'Updated Plant',
      location: 'Kitchen',
      fertilizerSchedule: 'bi-weekly',
    }),
  };
});

// Import mocked functions
import { validateRequest, validateVerifiedRequest } from '@/lib/auth/server';
import { createPlant, getPlantsWithStats, validatePlantTaxonomy } from '@/lib/db/queries/plant-taxonomy';
import { PlantInstanceQueries } from '@/lib/db/queries/plant-instances';
import {
  createPlantSchema,
  plantFilterSchema,
  createPlantInstanceSchema,
  plantInstanceFilterSchema,
  updatePlantInstanceSchema
} from '@/lib/validation/plant-schemas';

describe('Plant Management API Endpoints', () => {
  let testUser;
  let testSession;

  beforeEach(() => {
    jest.clearAllMocks();
    resetApiMocks();

    testUser = createTestUser();
    testSession = createTestSession(testUser);

    // Default auth mock
    validateRequest.mockResolvedValue({
      user: testUser,
      session: testSession,
    });

    validateVerifiedRequest.mockResolvedValue({
      user: testUser,
      session: testSession,
    });

    // Default database query mocks
    getPlantsWithStats.mockResolvedValue([]);
    createPlant.mockResolvedValue({ id: 1 });
    validatePlantTaxonomy.mockResolvedValue(true);

    PlantInstanceQueries.getWithFilters.mockResolvedValue([]);
    PlantInstanceQueries.create.mockResolvedValue({ id: 1 });
    PlantInstanceQueries.getEnhancedById.mockResolvedValue({ id: 1 });
    PlantInstanceQueries.update.mockResolvedValue({ id: 1 });
    PlantInstanceQueries.delete.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('GET /api/plants - Plant filtering and pagination', () => {
    it('should return plants with default filters', async () => {
      // Arrange
      const mockPlants = [
        { ...createTestPlant({ family: 'Araceae', genus: 'Monstera' }), id: 1 },
        { ...createTestPlant({ family: 'Araceae', genus: 'Philodendron' }), id: 2 },
      ];

      plantFilterSchema.parse.mockReturnValue({
        family: undefined,
        genus: undefined,
        isVerified: undefined,
        createdBy: undefined,
        limit: 20,
        offset: 0,
      });

      getPlantsWithStats.mockResolvedValue(mockPlants);

      const request = new NextRequest('http://localhost:3000/api/plants');

      // Act
      const response = await getPlantsHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData).toEqual({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(Number),
            family: expect.any(String),
            genus: expect.any(String),
            species: expect.any(String),
            commonName: expect.any(String),
            isVerified: true,
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
          })
        ]),
        metadata: {
          operation: 'search',
          timestamp: expect.any(String),
        },
      });

      expect(validateRequest).toHaveBeenCalled();
      expect(plantFilterSchema.parse).toHaveBeenCalledWith({
        family: undefined,
        genus: undefined,
        isVerified: undefined,
        createdBy: undefined,
        limit: 20,
        offset: 0,
      });
      expect(getPlantsWithStats).toHaveBeenCalledWith(expect.any(Object), testUser.id);
    });

    it('should return plants with family filter', async () => {
      // Arrange
      const mockPlants = [
        { ...createTestPlant({ family: 'Araceae', genus: 'Monstera' }), id: 1 },
      ];

      plantFilterSchema.parse.mockReturnValue({
        family: 'Araceae',
        genus: undefined,
        isVerified: undefined,
        createdBy: undefined,
        limit: 20,
        offset: 0,
      });

      getPlantsWithStats.mockResolvedValue(mockPlants);

      const request = new NextRequest('http://localhost:3000/api/plants?family=Araceae');

      // Act
      const response = await getPlantsHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data).toEqual(expect.arrayContaining([
        expect.objectContaining({
          id: expect.any(Number),
          family: 'Araceae',
          genus: 'Monstera',
          commonName: expect.any(String),
          isVerified: true,
        })
      ]));

      expect(plantFilterSchema.parse).toHaveBeenCalledWith({
        family: 'Araceae',
        genus: undefined,
        isVerified: undefined,
        createdBy: undefined,
        limit: 20,
        offset: 0,
      });
    });

    it('should return plants with pagination parameters', async () => {
      // Arrange
      const mockPlants = [{ ...createTestPlant(), id: 1 }];

      plantFilterSchema.parse.mockReturnValue({
        family: undefined,
        genus: undefined,
        isVerified: undefined,
        createdBy: undefined,
        limit: 10,
        offset: 20,
      });

      getPlantsWithStats.mockResolvedValue(mockPlants);

      const request = new NextRequest('http://localhost:3000/api/plants?limit=10&offset=20');

      // Act
      const response = await getPlantsHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);

      expect(plantFilterSchema.parse).toHaveBeenCalledWith({
        family: undefined,
        genus: undefined,
        isVerified: undefined,
        createdBy: undefined,
        limit: 10,
        offset: 20,
      });
    });

    it('should return unauthorized error when user not authenticated', async () => {
      // Arrange
      validateRequest.mockResolvedValue({
        user: null,
        session: null,
      });

      const request = new NextRequest('http://localhost:3000/api/plants');

      // Act
      const response = await getPlantsHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(responseData).toEqual({
        error: 'Unauthorized',
      });

      expect(getPlantsWithStats).not.toHaveBeenCalled();
    });

    it('should return validation error for invalid filter parameters', async () => {
      // Arrange
      const { ZodError } = require('zod');
      const validationError = new ZodError([
        { path: ['limit'], message: 'Limit must be a positive number', code: 'invalid_type' }
      ]);

      plantFilterSchema.parse.mockImplementation(() => {
        throw validationError;
      });

      const request = new NextRequest('http://localhost:3000/api/plants?limit=invalid');

      // Act
      const response = await getPlantsHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(responseData).toEqual({
        error: 'Invalid filter parameters',
        details: validationError.issues,
      });

      expect(getPlantsWithStats).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      plantFilterSchema.parse.mockReturnValue({
        limit: 20,
        offset: 0,
      });

      getPlantsWithStats.mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/plants');

      // Act
      const response = await getPlantsHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(responseData).toEqual({
        error: 'Internal server error',
      });
    });
  });

  describe('POST /api/plant-instances - Plant instance creation with data validation', () => {
    it('should create plant instance with valid JSON data', async () => {
      // Arrange
      const testPlant = { ...createTestPlant(), id: 1 };
      const requestBody = {
        plantId: testPlant.id,
        nickname: 'My Monstera',
        location: 'Living Room',
        notes: 'Beautiful plant',
        isActive: true,
      };

      const expectedInstanceData = {
        ...requestBody,
        userId: testUser.id,
        lastFertilized: null,
        lastRepot: null,
      };

      const createdInstance = createTestPlantInstance({
        ...expectedInstanceData,
        id: 1,
      });

      const enhancedInstance = {
        ...createdInstance,
        plant: testPlant,
      };

      createPlantInstanceSchema.parse.mockReturnValue(expectedInstanceData);
      PlantInstanceQueries.create.mockResolvedValue(createdInstance);
      PlantInstanceQueries.getEnhancedById.mockResolvedValue(enhancedInstance);

      const request = new NextRequest('http://localhost:3000/api/plant-instances', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Act
      const response = await createPlantInstanceHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(201);
      expect(responseData).toEqual({
        success: true,
        data: expect.objectContaining({
          id: enhancedInstance.id,
          nickname: enhancedInstance.nickname,
          location: enhancedInstance.location,
          plantId: enhancedInstance.plantId,
          fertilizerSchedule: enhancedInstance.fertilizerSchedule,
          lastFertilized: enhancedInstance.lastFertilized,
          lastRepot: enhancedInstance.lastRepot,
          notes: enhancedInstance.notes,
          images: enhancedInstance.images,
          isActive: enhancedInstance.isActive,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
          plant: expect.objectContaining({
            id: enhancedInstance.plant.id,
            family: enhancedInstance.plant.family,
            genus: enhancedInstance.plant.genus,
            species: enhancedInstance.plant.species,
            cultivar: enhancedInstance.plant.cultivar,
            commonName: enhancedInstance.plant.commonName,
            isVerified: enhancedInstance.plant.isVerified,
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
          }),
        }),
      });

      expect(createPlantInstanceSchema.parse).toHaveBeenCalledWith(expectedInstanceData);
      expect(PlantInstanceQueries.create).toHaveBeenCalledWith(expectedInstanceData);
      expect(PlantInstanceQueries.getEnhancedById).toHaveBeenCalledWith(createdInstance.id);
    });

    it('should create plant instance with FormData (file upload)', async () => {
      // Arrange
      const testPlant = { ...createTestPlant(), id: 1 };
      const formData = new FormData();
      formData.append('plantId', testPlant.id.toString());
      formData.append('nickname', 'My Monstera');
      formData.append('location', 'Living Room');
      formData.append('fertilizerSchedule', '2 weeks');
      formData.append('isActive', 'true');

      // Mock file
      const mockFile = new File(['test image'], 'test.jpg', { type: 'image/jpeg' });
      formData.append('imageFiles[0]', mockFile);

      const expectedInstanceData = {
        plantId: testPlant.id,
        nickname: 'My Monstera',
        location: 'Living Room',
        fertilizerSchedule: '2 weeks',
        isActive: true,
        userId: testUser.id,
        lastFertilized: null,
        lastRepot: null,
        images: ['data:image/jpeg;base64,dGVzdCBpbWFnZQ=='], // base64 of "test image"
      };

      const createdInstance = createTestPlantInstance(expectedInstanceData);
      const enhancedInstance = { ...createdInstance, plant: testPlant };

      createPlantInstanceSchema.parse.mockReturnValue({
        ...expectedInstanceData,
        fertilizerDue: expect.any(Date), // Allow calculated fertilizer due date
      });
      PlantInstanceQueries.create.mockResolvedValue(createdInstance);
      PlantInstanceQueries.getEnhancedById.mockResolvedValue(enhancedInstance);

      const request = new NextRequest('http://localhost:3000/api/plant-instances', {
        method: 'POST',
        body: formData,
      });

      // Act
      const response = await createPlantInstanceHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(201);
      expect(responseData.success).toBe(true);
      expect(responseData.data).toEqual(expect.objectContaining({
        id: enhancedInstance.id,
        nickname: enhancedInstance.nickname,
        location: enhancedInstance.location,
        plantId: enhancedInstance.plantId,
        fertilizerSchedule: enhancedInstance.fertilizerSchedule,
        lastFertilized: enhancedInstance.lastFertilized,
        lastRepot: enhancedInstance.lastRepot,
        notes: enhancedInstance.notes,
        images: enhancedInstance.images,
        isActive: enhancedInstance.isActive,
        plant: expect.objectContaining({
          id: enhancedInstance.plant.id,
          family: enhancedInstance.plant.family,
          genus: enhancedInstance.plant.genus,
          species: enhancedInstance.plant.species,
          cultivar: enhancedInstance.plant.cultivar,
          commonName: enhancedInstance.plant.commonName,
          isVerified: enhancedInstance.plant.isVerified,
        }),
      }));

      expect(PlantInstanceQueries.create).toHaveBeenCalledWith(expectedInstanceData);
    });

    it('should return validation error for invalid plant instance data', async () => {
      // Arrange
      const requestBody = {
        plantId: 'invalid',
        nickname: '',
        location: '',
      };

      const { ZodError } = require('zod');
      const validationError = new ZodError([
        { path: ['plantId'], message: 'Plant ID must be a number', code: 'invalid_type' },
        { path: ['nickname'], message: 'Nickname is required', code: 'invalid_type' },
      ]);

      createPlantInstanceSchema.parse.mockImplementation(() => {
        throw validationError;
      });

      const request = new NextRequest('http://localhost:3000/api/plant-instances', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Act
      const response = await createPlantInstanceHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(responseData).toEqual({
        success: false,
        error: 'Validation failed',
        details: validationError.issues,
      });

      expect(PlantInstanceQueries.create).not.toHaveBeenCalled();
    });

    it('should return unauthorized error when user not authenticated', async () => {
      // Arrange
      validateVerifiedRequest.mockResolvedValue({
        user: null,
        error: 'Unauthorized',
      });

      const request = new NextRequest('http://localhost:3000/api/plant-instances', {
        method: 'POST',
        body: JSON.stringify({ plantId: 1 }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Act
      const response = await createPlantInstanceHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(responseData).toEqual({
        success: false,
        error: 'Unauthorized',
      });

      expect(PlantInstanceQueries.create).not.toHaveBeenCalled();
    });

    it('should handle empty request body', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/plant-instances', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Act
      const response = await createPlantInstanceHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(responseData).toEqual({
        success: false,
        error: 'Request body is required',
      });

      expect(PlantInstanceQueries.create).not.toHaveBeenCalled();
    });

    it('should handle malformed JSON', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/plant-instances', {
        method: 'POST',
        body: 'invalid json',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Act
      const response = await createPlantInstanceHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(responseData).toEqual({
        success: false,
        error: 'Invalid JSON in request body',
      });

      expect(PlantInstanceQueries.create).not.toHaveBeenCalled();
    });

    it('should calculate fertilizer due date from schedule', async () => {
      // Arrange
      const requestBody = {
        plantId: 1,
        nickname: 'Test Plant',
        location: 'Test Location',
        fertilizerSchedule: '2 weeks',
      };

      const expectedInstanceData = {
        ...requestBody,
        userId: testUser.id,
        lastFertilized: null,
        lastRepot: null,
        fertilizerDue: expect.any(Date),
      };

      const createdInstance = createTestPlantInstance(expectedInstanceData);
      const enhancedInstance = { ...createdInstance, plant: createTestPlant() };

      createPlantInstanceSchema.parse.mockReturnValue(expectedInstanceData);
      PlantInstanceQueries.create.mockResolvedValue(createdInstance);
      PlantInstanceQueries.getEnhancedById.mockResolvedValue(enhancedInstance);

      const request = new NextRequest('http://localhost:3000/api/plant-instances', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Act
      const response = await createPlantInstanceHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(201);
      expect(responseData.success).toBe(true);

      // Verify fertilizer due date was calculated (should be 2 weeks from now)
      const callArgs = PlantInstanceQueries.create.mock.calls[0][0];
      expect(callArgs.fertilizerDue).toBeInstanceOf(Date);

      const now = new Date();
      const expectedDue = new Date(now);
      expectedDue.setDate(expectedDue.getDate() + 14); // 2 weeks

      // Allow for small time differences in test execution
      const timeDiff = Math.abs(new Date(callArgs.fertilizerDue).getTime() - expectedDue.getTime());
      expect(timeDiff).toBeLessThan(1000); // Less than 1 second difference
    });
  });

  describe('PUT /api/plant-instances/[id] - Plant instance updates with authorization checks', () => {
    it('should update plant instance with valid data and authorization', async () => {
      // Arrange
      const testPlant = { ...createTestPlant(), id: 1 };
      const existingInstance = createTestPlantInstance({
        id: 1,
        userId: testUser.id,
        plantId: testPlant.id,
      });

      const updateData = {
        nickname: 'Updated Nickname',
        location: 'New Location',
        notes: 'Updated notes',
      };

      const expectedUpdateData = {
        ...updateData,
        id: 1,
        userId: testUser.id,
        lastFertilized: null,
        lastRepot: null,
      };

      const updatedInstance = { ...existingInstance, ...updateData };
      const enhancedInstance = { ...updatedInstance, plant: testPlant };

      PlantInstanceQueries.getEnhancedById.mockResolvedValueOnce(existingInstance);
      updatePlantInstanceSchema.parse.mockReturnValue(expectedUpdateData);
      PlantInstanceQueries.update.mockResolvedValue(updatedInstance);
      PlantInstanceQueries.getEnhancedById.mockResolvedValueOnce(enhancedInstance);

      const request = new NextRequest('http://localhost:3000/api/plant-instances/1', {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const params = Promise.resolve({ id: '1' });

      // Act
      const response = await updatePlantInstanceHandler(request, { params });
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData).toEqual(expect.objectContaining({
        id: enhancedInstance.id,
        nickname: enhancedInstance.nickname,
        location: enhancedInstance.location,
        plantId: enhancedInstance.plantId,
        fertilizerSchedule: enhancedInstance.fertilizerSchedule,
        lastFertilized: expect.any(String),
        lastRepot: expect.any(String),
        notes: enhancedInstance.notes,
        images: enhancedInstance.images,
        isActive: enhancedInstance.isActive,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
        plant: expect.objectContaining({
          id: enhancedInstance.plant.id,
          family: enhancedInstance.plant.family,
          genus: enhancedInstance.plant.genus,
          species: enhancedInstance.plant.species,
          cultivar: enhancedInstance.plant.cultivar,
          commonName: enhancedInstance.plant.commonName,
          isVerified: enhancedInstance.plant.isVerified,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        }),
      }));

      expect(PlantInstanceQueries.getEnhancedById).toHaveBeenCalledWith(1);
      expect(updatePlantInstanceSchema.parse).toHaveBeenCalledWith(expectedUpdateData);
      expect(PlantInstanceQueries.update).toHaveBeenCalledWith(1, {
        ...updateData,
        lastFertilized: null,
        lastRepot: null,
      });
    });

    it('should return forbidden error when user does not own plant instance', async () => {
      // Arrange
      const otherUser = createTestUser({ id: 999 });
      const existingInstance = createTestPlantInstance({
        id: 1,
        userId: otherUser.id, // Different user
      });

      PlantInstanceQueries.getEnhancedById.mockResolvedValue(existingInstance);

      const request = new NextRequest('http://localhost:3000/api/plant-instances/1', {
        method: 'PUT',
        body: JSON.stringify({ nickname: 'Updated' }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const params = Promise.resolve({ id: '1' });

      // Act
      const response = await updatePlantInstanceHandler(request, { params });
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(403);
      expect(responseData).toEqual({
        error: 'Forbidden',
      });

      expect(PlantInstanceQueries.update).not.toHaveBeenCalled();
    });

    it('should return not found error when plant instance does not exist', async () => {
      // Arrange
      PlantInstanceQueries.getEnhancedById.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/plant-instances/999', {
        method: 'PUT',
        body: JSON.stringify({ nickname: 'Updated' }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const params = Promise.resolve({ id: '999' });

      // Act
      const response = await updatePlantInstanceHandler(request, { params });
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(404);
      expect(responseData).toEqual({
        error: 'Plant instance not found',
      });

      expect(PlantInstanceQueries.update).not.toHaveBeenCalled();
    });

    it('should return bad request error for invalid plant instance ID', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/plant-instances/invalid', {
        method: 'PUT',
        body: JSON.stringify({ nickname: 'Updated' }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const params = Promise.resolve({ id: 'invalid' });

      // Act
      const response = await updatePlantInstanceHandler(request, { params });
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(responseData).toEqual({
        error: 'Invalid plant instance ID',
      });

      expect(PlantInstanceQueries.getEnhancedById).not.toHaveBeenCalled();
    });

    it('should return unauthorized error when user not authenticated', async () => {
      // Arrange
      validateRequest.mockResolvedValue({
        user: null,
        session: null,
      });

      const request = new NextRequest('http://localhost:3000/api/plant-instances/1', {
        method: 'PUT',
        body: JSON.stringify({ nickname: 'Updated' }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const params = Promise.resolve({ id: '1' });

      // Act
      const response = await updatePlantInstanceHandler(request, { params });
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(responseData).toEqual({
        error: 'Unauthorized',
      });

      expect(PlantInstanceQueries.getEnhancedById).not.toHaveBeenCalled();
    });

    it('should handle FormData updates with file uploads', async () => {
      // Arrange
      const testPlant = createTestPlant();
      const existingInstance = createTestPlantInstance({
        id: 1,
        userId: testUser.id,
        plantId: testPlant.id,
      });

      const formData = new FormData();
      formData.append('nickname', 'Updated Nickname');
      formData.append('location', 'New Location');
      formData.append('existingImages[0]', 'existing-image-url');

      const mockFile = new File(['new image'], 'new.jpg', { type: 'image/jpeg' });
      formData.append('imageFiles[0]', mockFile);

      const expectedUpdateData = {
        nickname: 'Updated Nickname',
        location: 'New Location',
        images: ['existing-image-url', 'data:image/jpeg;base64,bmV3IGltYWdl'], // base64 of "new image"
        id: 1,
        userId: testUser.id,
        lastFertilized: null,
        lastRepot: null,
      };

      const updatedInstance = { ...existingInstance, ...expectedUpdateData };
      const enhancedInstance = { ...updatedInstance, plant: testPlant };

      PlantInstanceQueries.getEnhancedById.mockResolvedValueOnce(existingInstance);
      updatePlantInstanceSchema.parse.mockReturnValue(expectedUpdateData);
      PlantInstanceQueries.update.mockResolvedValue(updatedInstance);
      PlantInstanceQueries.getEnhancedById.mockResolvedValueOnce(enhancedInstance);

      const request = new NextRequest('http://localhost:3000/api/plant-instances/1', {
        method: 'PUT',
        body: formData,
      });

      const params = Promise.resolve({ id: '1' });

      // Act
      const response = await updatePlantInstanceHandler(request, { params });
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData).toEqual(expect.objectContaining({
        id: enhancedInstance.id,
        nickname: enhancedInstance.nickname,
        location: enhancedInstance.location,
        fertilizerSchedule: enhancedInstance.fertilizerSchedule,
        lastFertilized: enhancedInstance.lastFertilized,
        lastRepot: enhancedInstance.lastRepot,
        notes: enhancedInstance.notes,
        images: enhancedInstance.images,
        isActive: enhancedInstance.isActive,
        plant: expect.objectContaining({
          id: enhancedInstance.plant.id,
          family: enhancedInstance.plant.family,
          genus: enhancedInstance.plant.genus,
          species: enhancedInstance.plant.species,
          cultivar: enhancedInstance.plant.cultivar,
          commonName: enhancedInstance.plant.commonName,
          isVerified: enhancedInstance.plant.isVerified,
        }),
      }));

      // Verify the update was called with correct data (excluding id and userId)
      const { id, userId, ...updateDataWithoutIds } = expectedUpdateData;
      expect(PlantInstanceQueries.update).toHaveBeenCalledWith(1, updateDataWithoutIds);
    });

    it('should handle validation errors during update', async () => {
      // Arrange
      const existingInstance = createTestPlantInstance({
        id: 1,
        userId: testUser.id,
      });

      const { ZodError } = require('zod');
      const validationError = new ZodError([
        { path: ['nickname'], message: 'Nickname is required', code: 'invalid_type' }
      ]);

      PlantInstanceQueries.getEnhancedById.mockResolvedValue(existingInstance);
      updatePlantInstanceSchema.parse.mockImplementation(() => {
        throw validationError;
      });

      const request = new NextRequest('http://localhost:3000/api/plant-instances/1', {
        method: 'PUT',
        body: JSON.stringify({ nickname: '' }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const params = Promise.resolve({ id: '1' });

      // Act
      const response = await updatePlantInstanceHandler(request, { params });
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(responseData.error).toContain('Invalid plant instance data');

      expect(PlantInstanceQueries.update).not.toHaveBeenCalled();
    });
  });

  describe('Plant Management Integration Tests', () => {
    it('should handle complete plant management workflow: create -> read -> update -> delete', async () => {
      const testPlant = createTestPlant();

      // Step 1: Create plant instance
      const createData = {
        plantId: testPlant.id,
        nickname: 'Test Plant',
        location: 'Test Location',
      };

      const createdInstance = createTestPlantInstance({
        id: 1,
        ...createData,
        userId: testUser.id,
      });

      const enhancedInstance = { ...createdInstance, plant: testPlant };

      createPlantInstanceSchema.parse.mockReturnValue({
        ...createData,
        userId: testUser.id,
        lastFertilized: null,
        lastRepot: null,
      });
      PlantInstanceQueries.create.mockResolvedValue(createdInstance);
      PlantInstanceQueries.getEnhancedById.mockResolvedValue(enhancedInstance);

      const createRequest = new NextRequest('http://localhost:3000/api/plant-instances', {
        method: 'POST',
        body: JSON.stringify(createData),
        headers: { 'Content-Type': 'application/json' },
      });

      const createResponse = await createPlantInstanceHandler(createRequest);
      const createResponseData = await createResponse.json();

      expect(createResponse.status).toBe(201);
      expect(createResponseData.success).toBe(true);

      // Step 2: Read plant instance
      PlantInstanceQueries.getEnhancedById.mockResolvedValue(enhancedInstance);

      const readRequest = new NextRequest('http://localhost:3000/api/plant-instances/1');
      const readParams = Promise.resolve({ id: '1' });

      const readResponse = await getPlantInstanceHandler(readRequest, { params: readParams });
      const readResponseData = await readResponse.json();

      expect(readResponse.status).toBe(200);
      expect(readResponseData).toEqual(expect.objectContaining({
        id: enhancedInstance.id,
        nickname: enhancedInstance.nickname,
        location: enhancedInstance.location,
        fertilizerSchedule: enhancedInstance.fertilizerSchedule,
        lastFertilized: enhancedInstance.lastFertilized,
        lastRepot: enhancedInstance.lastRepot,
        notes: enhancedInstance.notes,
        images: enhancedInstance.images,
        isActive: enhancedInstance.isActive,
        plant: expect.objectContaining({
          id: enhancedInstance.plant.id,
          family: enhancedInstance.plant.family,
          genus: enhancedInstance.plant.genus,
          species: enhancedInstance.plant.species,
          cultivar: enhancedInstance.plant.cultivar,
          commonName: enhancedInstance.plant.commonName,
          isVerified: enhancedInstance.plant.isVerified,
        }),
      }));

      // Step 3: Update plant instance
      const updateData = { nickname: 'Updated Plant' };
      const updatedInstance = { ...enhancedInstance, ...updateData };

      updatePlantInstanceSchema.parse.mockReturnValue({
        ...updateData,
        id: 1,
        userId: testUser.id,
        lastFertilized: null,
        lastRepot: null,
      });
      PlantInstanceQueries.update.mockResolvedValue(updatedInstance);
      PlantInstanceQueries.getEnhancedById.mockResolvedValue(updatedInstance);

      const updateRequest = new NextRequest('http://localhost:3000/api/plant-instances/1', {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: { 'Content-Type': 'application/json' },
      });
      const updateParams = Promise.resolve({ id: '1' });

      const updateResponse = await updatePlantInstanceHandler(updateRequest, { params: updateParams });
      const updateResponseData = await updateResponse.json();

      expect(updateResponse.status).toBe(200);
      expect(updateResponseData.nickname).toBe('Updated Plant');

      // Step 4: Delete plant instance
      PlantInstanceQueries.delete.mockResolvedValue(true);

      const deleteRequest = new NextRequest('http://localhost:3000/api/plant-instances/1', {
        method: 'DELETE',
      });
      const deleteParams = Promise.resolve({ id: '1' });

      const deleteResponse = await deletePlantInstanceHandler(deleteRequest, { params: deleteParams });
      const deleteResponseData = await deleteResponse.json();

      expect(deleteResponse.status).toBe(200);
      expect(deleteResponseData).toEqual({
        success: true,
        message: 'Plant instance deleted successfully',
      });

      // Verify all operations were called
      expect(PlantInstanceQueries.create).toHaveBeenCalled();
      expect(PlantInstanceQueries.update).toHaveBeenCalled();
      expect(PlantInstanceQueries.delete).toHaveBeenCalledWith(1);
    });

    it('should handle authorization checks across all endpoints', async () => {
      // Test unauthorized access to all endpoints
      validateRequest.mockResolvedValue({ user: null, session: null });

      // GET /api/plants
      const getPlantsRequest = new NextRequest('http://localhost:3000/api/plants');
      const getPlantsResponse = await getPlantsHandler(getPlantsRequest);
      expect(getPlantsResponse.status).toBe(401);

      // POST /api/plant-instances
      const createRequest = new NextRequest('http://localhost:3000/api/plant-instances', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' },
      });
      const createResponse = await createPlantInstanceHandler(createRequest);
      expect(createResponse.status).toBe(401);

      // GET /api/plant-instances/1
      const getRequest = new NextRequest('http://localhost:3000/api/plant-instances/1');
      const getParams = Promise.resolve({ id: '1' });
      const getResponse = await getPlantInstanceHandler(getRequest, { params: getParams });
      expect(getResponse.status).toBe(401);

      // PUT /api/plant-instances/1
      const updateRequest = new NextRequest('http://localhost:3000/api/plant-instances/1', {
        method: 'PUT',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' },
      });
      const updateParams = Promise.resolve({ id: '1' });
      const updateResponse = await updatePlantInstanceHandler(updateRequest, { params: updateParams });
      expect(updateResponse.status).toBe(401);

      // DELETE /api/plant-instances/1
      const deleteRequest = new NextRequest('http://localhost:3000/api/plant-instances/1', {
        method: 'DELETE',
      });
      const deleteParams = Promise.resolve({ id: '1' });
      const deleteResponse = await deletePlantInstanceHandler(deleteRequest, { params: deleteParams });
      expect(deleteResponse.status).toBe(401);
    });
  });
});