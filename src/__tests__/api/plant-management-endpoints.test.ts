import { PUT as updatePlantInstanceHandler } from "@/app/api/plant-instances/[id]/route";
import { POST as createPlantInstanceHandler } from "@/app/api/plant-instances/route";
import { GET as getPlantsHandler } from "@/app/api/plants/route";
import {
  createTestPlant,
  createTestPlantInstance,
} from "@/test-utils/factories/plant-factory";
import { createTestUser } from "@/test-utils/factories/user-factory";
import { resetApiMocks } from "@/test-utils/helpers/api-helpers";
import { NextRequest } from "next/server";

// Mock auth functions
jest.mock("@/lib/auth/server", () => ({
  validateRequest: jest.fn(),
  validateVerifiedRequest: jest.fn(),
}));

// Mock database queries
jest.mock("@/lib/db/queries/plant-taxonomy", () => ({
  getPlantsWithStats: jest.fn(),
}));

jest.mock("@/lib/db/queries/plant-instances", () => ({
  PlantInstanceQueries: {
    create: jest.fn(),
    getEnhancedById: jest.fn(),
    update: jest.fn(),
  },
}));

// Mock validation schemas
jest.mock("@/lib/validation/plant-schemas", () => ({
  plantFilterSchema: {
    parse: jest.fn(),
  },
  createPlantInstanceSchema: {
    parse: jest.fn(),
  },
  updatePlantInstanceSchema: {
    parse: jest.fn(),
  },
}));

import { validateRequest, validateVerifiedRequest } from "@/lib/auth/server";
import { PlantInstanceQueries } from "@/lib/db/queries/plant-instances";
import { getPlantsWithStats } from "@/lib/db/queries/plant-taxonomy";
import {
  createPlantInstanceSchema,
  plantFilterSchema,
  updatePlantInstanceSchema,
} from "@/lib/validation/plant-schemas";

describe("Plant Management API Endpoints", () => {
  let testUser: any;

  beforeEach(() => {
    jest.clearAllMocks();
    resetApiMocks();

    testUser = createTestUser();

    // Default auth mocks
    (validateRequest as jest.Mock).mockResolvedValue({
      user: testUser,
      session: { id: "test-session" },
    });

    (validateVerifiedRequest as jest.Mock).mockResolvedValue({
      user: testUser,
      session: { id: "test-session" },
    });
  });

  describe("GET /api/plants - Plant filtering and pagination", () => {
    it("should return plants with default filters", async () => {
      // Arrange
      const mockPlants = [
        createTestPlant({ id: 1, family: "Araceae", genus: "Monstera" }),
        createTestPlant({ id: 2, family: "Araceae", genus: "Philodendron" }),
      ];

      (plantFilterSchema.parse as jest.Mock).mockReturnValue({
        family: undefined,
        genus: undefined,
        limit: 20,
        offset: 0,
      });

      (getPlantsWithStats as jest.Mock).mockResolvedValue(mockPlants);

      const request = new NextRequest("http://localhost:3000/api/plants");

      // Act
      const response = await getPlantsHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data).toHaveLength(2);
      expect(responseData.data[0]).toMatchObject({
        id: 1,
        family: "Araceae",
        genus: "Monstera",
      });

      expect(validateRequest).toHaveBeenCalled();
      expect(plantFilterSchema.parse).toHaveBeenCalled();
      expect(getPlantsWithStats).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 20, offset: 0 }),
        testUser.id
      );
    });

    it("should return plants with family filter", async () => {
      // Arrange
      const mockPlants = [createTestPlant({ family: "Araceae" })];

      (plantFilterSchema.parse as jest.Mock).mockReturnValue({
        family: "Araceae",
        limit: 20,
        offset: 0,
      });

      (getPlantsWithStats as jest.Mock).mockResolvedValue(mockPlants);

      const request = new NextRequest(
        "http://localhost:3000/api/plants?family=Araceae"
      );

      // Act
      const response = await getPlantsHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(plantFilterSchema.parse).toHaveBeenCalledWith(
        expect.objectContaining({ family: "Araceae" })
      );
    });

    it("should return plants with pagination", async () => {
      // Arrange
      const mockPlants = [createTestPlant()];

      (plantFilterSchema.parse as jest.Mock).mockReturnValue({
        limit: 10,
        offset: 20,
      });

      (getPlantsWithStats as jest.Mock).mockResolvedValue(mockPlants);

      const request = new NextRequest(
        "http://localhost:3000/api/plants?limit=10&offset=20"
      );

      // Act
      const response = await getPlantsHandler(request);

      // Assert
      expect(response.status).toBe(200);
      expect(plantFilterSchema.parse).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 10, offset: 20 })
      );
    });

    it("should return unauthorized when user not authenticated", async () => {
      // Arrange
      (validateRequest as jest.Mock).mockResolvedValue({
        user: null,
        session: null,
      });

      const request = new NextRequest("http://localhost:3000/api/plants");

      // Act
      const response = await getPlantsHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(responseData.error).toBe("Unauthorized");
      expect(getPlantsWithStats).not.toHaveBeenCalled();
    });

    it("should handle validation errors", async () => {
      // Arrange
      const { ZodError } = require("zod");
      const validationError = new ZodError([
        { path: ["limit"], message: "Invalid limit", code: "invalid_type" },
      ]);

      (plantFilterSchema.parse as jest.Mock).mockImplementation(() => {
        throw validationError;
      });

      const request = new NextRequest(
        "http://localhost:3000/api/plants?limit=invalid"
      );

      // Act
      const response = await getPlantsHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(responseData.error).toBe("Invalid filter parameters");
      expect(responseData.details).toEqual(validationError.issues);
    });

    it("should handle database errors", async () => {
      // Arrange
      (plantFilterSchema.parse as jest.Mock).mockReturnValue({});
      (getPlantsWithStats as jest.Mock).mockRejectedValue(
        new Error("Database error")
      );

      const request = new NextRequest("http://localhost:3000/api/plants");

      // Act
      const response = await getPlantsHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(responseData.error).toBe("Internal server error");
    });
  });

  describe("POST /api/plant-instances - Plant instance creation with data validation", () => {
    it("should create plant instance with valid JSON data", async () => {
      // Arrange
      const requestBody = {
        plantId: 1,
        nickname: "My Monstera",
        location: "Living Room",
        notes: "Beautiful plant",
      };

      const validatedData = {
        ...requestBody,
        userId: testUser.id,
        lastFertilized: null,
        lastRepot: null,
      };

      const createdInstance = createTestPlantInstance({
        id: 1,
        ...validatedData,
      });
      const enhancedInstance = {
        ...createdInstance,
        plant: createTestPlant({ id: 1 }),
      };

      (createPlantInstanceSchema.parse as jest.Mock).mockReturnValue(
        validatedData
      );
      (PlantInstanceQueries.create as jest.Mock).mockResolvedValue(
        createdInstance
      );
      (PlantInstanceQueries.getEnhancedById as jest.Mock).mockResolvedValue(
        enhancedInstance
      );

      const request = new NextRequest(
        "http://localhost:3000/api/plant-instances",
        {
          method: "POST",
          body: JSON.stringify(requestBody),
          headers: { "Content-Type": "application/json" },
        }
      );

      // Act
      const response = await createPlantInstanceHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(201);
      expect(responseData.success).toBe(true);
      expect(responseData.data).toMatchObject({
        id: 1,
        nickname: "My Monstera",
        location: "Living Room",
        plant: expect.objectContaining({ id: 1 }),
      });

      expect(createPlantInstanceSchema.parse).toHaveBeenCalledWith(
        validatedData
      );
      expect(PlantInstanceQueries.create).toHaveBeenCalledWith(validatedData);
      expect(PlantInstanceQueries.getEnhancedById).toHaveBeenCalledWith(1);
    });

    it("should create plant instance with additional fields", async () => {
      // Arrange
      const requestBody = {
        plantId: 1,
        nickname: "My Plant",
        location: "Kitchen",
        isActive: true,
        fertilizerSchedule: "monthly",
        notes: "Test notes",
      };

      const validatedData = {
        ...requestBody,
        userId: testUser.id,
        lastFertilized: null,
        lastRepot: null,
      };

      const createdInstance = createTestPlantInstance(validatedData);
      const enhancedInstance = { ...createdInstance, plant: createTestPlant() };

      (createPlantInstanceSchema.parse as jest.Mock).mockReturnValue(
        validatedData
      );
      (PlantInstanceQueries.create as jest.Mock).mockResolvedValue(
        createdInstance
      );
      (PlantInstanceQueries.getEnhancedById as jest.Mock).mockResolvedValue(
        enhancedInstance
      );

      const request = new NextRequest(
        "http://localhost:3000/api/plant-instances",
        {
          method: "POST",
          body: JSON.stringify(requestBody),
          headers: { "Content-Type": "application/json" },
        }
      );

      // Act
      const response = await createPlantInstanceHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(201);
      expect(responseData.success).toBe(true);
      expect(responseData.data).toMatchObject({
        nickname: "My Plant",
        location: "Kitchen",
        isActive: true,
        fertilizerSchedule: "monthly",
        notes: "Test notes",
      });
      expect(PlantInstanceQueries.create).toHaveBeenCalledWith(validatedData);
    });

    it("should return validation error for invalid data", async () => {
      // Arrange
      const requestBody = { plantId: "invalid", nickname: "" };

      const { ZodError } = require("zod");
      const validationError = new ZodError([
        {
          path: ["plantId"],
          message: "Plant ID must be a number",
          code: "invalid_type",
        },
        {
          path: ["nickname"],
          message: "Nickname is required",
          code: "invalid_type",
        },
      ]);

      (createPlantInstanceSchema.parse as jest.Mock).mockImplementation(() => {
        throw validationError;
      });

      const request = new NextRequest(
        "http://localhost:3000/api/plant-instances",
        {
          method: "POST",
          body: JSON.stringify(requestBody),
          headers: { "Content-Type": "application/json" },
        }
      );

      // Act
      const response = await createPlantInstanceHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe("Validation failed");
      expect(responseData.details).toEqual(validationError.issues);
      expect(PlantInstanceQueries.create).not.toHaveBeenCalled();
    });

    it("should return unauthorized when user not verified", async () => {
      // Arrange
      (validateVerifiedRequest as jest.Mock).mockResolvedValue({
        user: null,
        error: "Email verification required",
      });

      const request = new NextRequest(
        "http://localhost:3000/api/plant-instances",
        {
          method: "POST",
          body: JSON.stringify({ plantId: 1 }),
          headers: { "Content-Type": "application/json" },
        }
      );

      // Act
      const response = await createPlantInstanceHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(403);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe("Email verification required");
      expect(PlantInstanceQueries.create).not.toHaveBeenCalled();
    });

    it("should handle empty request body", async () => {
      // Arrange
      const request = new NextRequest(
        "http://localhost:3000/api/plant-instances",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );

      // Act
      const response = await createPlantInstanceHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe("Request body is required");
    });

    it("should handle malformed JSON", async () => {
      // Arrange
      const request = new NextRequest(
        "http://localhost:3000/api/plant-instances",
        {
          method: "POST",
          body: "invalid json",
          headers: { "Content-Type": "application/json" },
        }
      );

      // Act
      const response = await createPlantInstanceHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe("Invalid JSON in request body");
    });

    it("should calculate fertilizer due date from schedule", async () => {
      // Arrange
      const requestBody = {
        plantId: 1,
        nickname: "Test Plant",
        fertilizerSchedule: "2 weeks",
      };

      const now = new Date();
      const expectedDue = new Date(now);
      expectedDue.setDate(expectedDue.getDate() + 14);

      const validatedData = {
        ...requestBody,
        userId: testUser.id,
        lastFertilized: null,
        lastRepot: null,
        fertilizerDue: expectedDue,
      };

      (createPlantInstanceSchema.parse as jest.Mock).mockReturnValue(
        validatedData
      );
      (PlantInstanceQueries.create as jest.Mock).mockResolvedValue(
        createTestPlantInstance()
      );
      (PlantInstanceQueries.getEnhancedById as jest.Mock).mockResolvedValue({
        ...createTestPlantInstance(),
        plant: createTestPlant(),
      });

      const request = new NextRequest(
        "http://localhost:3000/api/plant-instances",
        {
          method: "POST",
          body: JSON.stringify(requestBody),
          headers: { "Content-Type": "application/json" },
        }
      );

      // Act
      const response = await createPlantInstanceHandler(request);

      // Assert
      expect(response.status).toBe(201);

      const createCall = (PlantInstanceQueries.create as jest.Mock).mock
        .calls[0][0];
      expect(createCall.fertilizerDue).toBeInstanceOf(Date);

      // Verify it's the expected due date (2 weeks from now)
      const timeDiff = Math.abs(
        createCall.fertilizerDue.getTime() - expectedDue.getTime()
      );
      expect(timeDiff).toBeLessThan(1000); // Less than 1 second difference
    });
  });

  describe("PUT /api/plant-instances/[id] - Plant instance updates with authorization", () => {
    it("should update plant instance with valid data and authorization", async () => {
      // Arrange
      const existingInstance = createTestPlantInstance({
        id: 1,
        userId: testUser.id,
        nickname: "Old Name",
      });

      const updateData = {
        nickname: "New Name",
        location: "New Location",
        notes: "Updated notes",
      };

      const validatedData = {
        ...updateData,
        id: 1,
        userId: testUser.id,
        lastFertilized: null,
        lastRepot: null,
      };

      const updatedInstance = { ...existingInstance, ...updateData };
      const enhancedInstance = { ...updatedInstance, plant: createTestPlant() };

      (PlantInstanceQueries.getEnhancedById as jest.Mock)
        .mockResolvedValueOnce(existingInstance)
        .mockResolvedValueOnce(enhancedInstance);
      (updatePlantInstanceSchema.parse as jest.Mock).mockReturnValue(
        validatedData
      );
      (PlantInstanceQueries.update as jest.Mock).mockResolvedValue(
        updatedInstance
      );

      const request = new NextRequest(
        "http://localhost:3000/api/plant-instances/1",
        {
          method: "PUT",
          body: JSON.stringify(updateData),
          headers: { "Content-Type": "application/json" },
        }
      );

      const params = Promise.resolve({ id: "1" });

      // Act
      const response = await updatePlantInstanceHandler(request, { params });
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData).toMatchObject({
        id: 1,
        nickname: "New Name",
        location: "New Location",
        notes: "Updated notes",
      });

      expect(PlantInstanceQueries.getEnhancedById).toHaveBeenCalledWith(1);
      expect(updatePlantInstanceSchema.parse).toHaveBeenCalledWith(
        validatedData
      );
      expect(PlantInstanceQueries.update).toHaveBeenCalledWith(1, {
        nickname: "New Name",
        location: "New Location",
        notes: "Updated notes",
        lastFertilized: null,
        lastRepot: null,
      });
    });

    it("should return forbidden when user does not own plant instance", async () => {
      // Arrange
      const otherUser = createTestUser({ id: 999 });
      const existingInstance = createTestPlantInstance({
        id: 1,
        userId: otherUser.id, // Different user
      });

      (PlantInstanceQueries.getEnhancedById as jest.Mock).mockResolvedValue(
        existingInstance
      );

      const request = new NextRequest(
        "http://localhost:3000/api/plant-instances/1",
        {
          method: "PUT",
          body: JSON.stringify({ nickname: "Updated" }),
          headers: { "Content-Type": "application/json" },
        }
      );

      const params = Promise.resolve({ id: "1" });

      // Act
      const response = await updatePlantInstanceHandler(request, { params });
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(403);
      expect(responseData.error).toBe("Forbidden");
      expect(PlantInstanceQueries.update).not.toHaveBeenCalled();
    });

    it("should return not found when plant instance does not exist", async () => {
      // Arrange
      (PlantInstanceQueries.getEnhancedById as jest.Mock).mockResolvedValue(
        null
      );

      const request = new NextRequest(
        "http://localhost:3000/api/plant-instances/999",
        {
          method: "PUT",
          body: JSON.stringify({ nickname: "Updated" }),
          headers: { "Content-Type": "application/json" },
        }
      );

      const params = Promise.resolve({ id: "999" });

      // Act
      const response = await updatePlantInstanceHandler(request, { params });
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(404);
      expect(responseData.error).toBe("Plant instance not found");
      expect(PlantInstanceQueries.update).not.toHaveBeenCalled();
    });

    it("should return bad request for invalid plant instance ID", async () => {
      // Arrange
      const request = new NextRequest(
        "http://localhost:3000/api/plant-instances/invalid",
        {
          method: "PUT",
          body: JSON.stringify({ nickname: "Updated" }),
          headers: { "Content-Type": "application/json" },
        }
      );

      const params = Promise.resolve({ id: "invalid" });

      // Act
      const response = await updatePlantInstanceHandler(request, { params });
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(responseData.error).toBe("Invalid plant instance ID");
      expect(PlantInstanceQueries.getEnhancedById).not.toHaveBeenCalled();
    });

    it("should return unauthorized when user not authenticated", async () => {
      // Arrange
      (validateRequest as jest.Mock).mockResolvedValue({
        user: null,
        session: null,
      });

      const request = new NextRequest(
        "http://localhost:3000/api/plant-instances/1",
        {
          method: "PUT",
          body: JSON.stringify({ nickname: "Updated" }),
          headers: { "Content-Type": "application/json" },
        }
      );

      const params = Promise.resolve({ id: "1" });

      // Act
      const response = await updatePlantInstanceHandler(request, { params });
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(responseData.error).toBe("Unauthorized");
      expect(PlantInstanceQueries.getEnhancedById).not.toHaveBeenCalled();
    });

    it("should handle date field updates", async () => {
      // Arrange
      const existingInstance = createTestPlantInstance({
        id: 1,
        userId: testUser.id,
      });

      const updateData = {
        nickname: "Updated Name",
        location: "New Location",
        lastFertilized: "2024-01-15T10:00:00.000Z",
        lastRepot: "2024-01-10T10:00:00.000Z",
      };

      const validatedData = {
        ...updateData,
        id: 1,
        userId: testUser.id,
        lastFertilized: new Date("2024-01-15T10:00:00.000Z"),
        lastRepot: new Date("2024-01-10T10:00:00.000Z"),
      };

      const updatedInstance = { ...existingInstance, ...validatedData };
      const enhancedInstance = { ...updatedInstance, plant: createTestPlant() };

      (PlantInstanceQueries.getEnhancedById as jest.Mock)
        .mockResolvedValueOnce(existingInstance)
        .mockResolvedValueOnce(enhancedInstance);
      (updatePlantInstanceSchema.parse as jest.Mock).mockReturnValue(
        validatedData
      );
      (PlantInstanceQueries.update as jest.Mock).mockResolvedValue(
        updatedInstance
      );

      const request = new NextRequest(
        "http://localhost:3000/api/plant-instances/1",
        {
          method: "PUT",
          body: JSON.stringify(updateData),
          headers: { "Content-Type": "application/json" },
        }
      );

      const params = Promise.resolve({ id: "1" });

      // Act
      const response = await updatePlantInstanceHandler(request, { params });
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData).toMatchObject({
        nickname: "Updated Name",
        location: "New Location",
      });

      expect(PlantInstanceQueries.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          nickname: "Updated Name",
          location: "New Location",
          lastFertilized: expect.any(Date),
          lastRepot: expect.any(Date),
        })
      );
    });

    it("should handle validation errors", async () => {
      // Arrange
      const existingInstance = createTestPlantInstance({
        id: 1,
        userId: testUser.id,
      });

      const { ZodError } = require("zod");
      const validationError = new ZodError([
        {
          path: ["nickname"],
          message: "Nickname is required",
          code: "invalid_type",
        },
      ]);

      (PlantInstanceQueries.getEnhancedById as jest.Mock).mockResolvedValue(
        existingInstance
      );
      (updatePlantInstanceSchema.parse as jest.Mock).mockImplementation(() => {
        throw validationError;
      });

      const request = new NextRequest(
        "http://localhost:3000/api/plant-instances/1",
        {
          method: "PUT",
          body: JSON.stringify({ nickname: "" }),
          headers: { "Content-Type": "application/json" },
        }
      );

      const params = Promise.resolve({ id: "1" });

      // Act
      const response = await updatePlantInstanceHandler(request, { params });
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(responseData.error).toBe("Invalid plant instance data");
      expect(responseData.details).toEqual(validationError.issues);
      expect(PlantInstanceQueries.update).not.toHaveBeenCalled();
    });

    it("should handle database errors", async () => {
      // Arrange
      const existingInstance = createTestPlantInstance({
        id: 1,
        userId: testUser.id,
      });

      (PlantInstanceQueries.getEnhancedById as jest.Mock).mockResolvedValue(
        existingInstance
      );
      (updatePlantInstanceSchema.parse as jest.Mock).mockReturnValue({
        id: 1,
        userId: testUser.id,
        nickname: "Updated",
      });
      (PlantInstanceQueries.update as jest.Mock).mockRejectedValue(
        new Error("Database error")
      );

      const request = new NextRequest(
        "http://localhost:3000/api/plant-instances/1",
        {
          method: "PUT",
          body: JSON.stringify({ nickname: "Updated" }),
          headers: { "Content-Type": "application/json" },
        }
      );

      const params = Promise.resolve({ id: "1" });

      // Act
      const response = await updatePlantInstanceHandler(request, { params });
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(responseData.error).toBe("Failed to update plant instance");
    });
  });
});
