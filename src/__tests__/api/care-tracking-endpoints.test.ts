import { GET as careHistoryHandler } from "@/app/api/care/history/[plantInstanceId]/route";
import { POST as careLogHandler } from "@/app/api/care/log/route";
import { GET as dashboardHandler } from "@/app/api/dashboard/route";
import {
  createTestCareHistory,
  createTestFertilizerRecord,
  createTestWateringRecord,
} from "@/test-utils/factories/care-factory";
import { createTestPlantInstance } from "@/test-utils/factories/plant-factory";
import { createTestUser } from "@/test-utils/factories/user-factory";
import { resetApiMocks } from "@/test-utils/helpers/api-helpers";
import { NextRequest } from "next/server";

// Mock auth functions
jest.mock("@/lib/auth/server", () => ({
  requireAuthSession: jest.fn(),
  validateRequest: jest.fn(),
}));

// Mock care service
jest.mock("@/lib/services/care-service", () => ({
  CareService: {
    logCareEvent: jest.fn(),
  },
}));

// Mock care history queries
jest.mock("@/lib/db/queries/care-history", () => ({
  CareHistoryQueries: {
    getCareHistoryForPlant: jest.fn(),
  },
}));

// Mock database
jest.mock("@/lib/db", () => ({
  db: {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    eq: jest.fn(),
    and: jest.fn(),
    sql: jest.fn(),
    inArray: jest.fn(),
  },
}));

// Mock validation schemas
jest.mock("@/lib/validation/care-schemas", () => ({
  careValidation: {
    validateCareForm: jest.fn(),
  },
}));

import { requireAuthSession, validateRequest } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { CareHistoryQueries } from "@/lib/db/queries/care-history";
import { CareService } from "@/lib/services/care-service";
import { careValidation } from "@/lib/validation/care-schemas";

describe("Care Tracking API Endpoints", () => {
  let testUser: any;
  let testPlantInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();
    resetApiMocks();

    testUser = createTestUser({ id: 1 });
    testPlantInstance = createTestPlantInstance({ id: 1, userId: testUser.id });

    // Default auth mocks
    (requireAuthSession as jest.Mock).mockResolvedValue({
      user: testUser,
      session: { id: "test-session" },
    });

    (validateRequest as jest.Mock).mockResolvedValue({
      user: testUser,
      session: { id: "test-session" },
    });
  });

  describe("POST /api/care/log - Care record creation", () => {
    it("should create care record with valid data", async () => {
      // Arrange
      const careData = {
        plantInstanceId: 1,
        careType: "water",
        careDate: new Date().toISOString(),
        notes: "Watered thoroughly",
      };

      const validatedData = {
        ...careData,
        careDate: new Date(careData.careDate),
      };

      const createdCareRecord = createTestWateringRecord(1, testUser.id, {
        id: 1,
        notes: careData.notes,
      });

      (careValidation.validateCareForm as jest.Mock).mockReturnValue({
        success: true,
        data: validatedData,
      });

      (CareService.logCareEvent as jest.Mock).mockResolvedValue({
        success: true,
        careHistory: {
          ...createdCareRecord,
          daysSinceCare: 0,
          formattedDate: "Today",
          careTypeDisplay: "Watering",
        },
      });

      const request = new NextRequest("http://localhost:3000/api/care/log", {
        method: "POST",
        body: JSON.stringify(careData),
        headers: { "Content-Type": "application/json" },
      });

      // Act
      const response = await careLogHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData).toMatchObject({
        careType: "water",
        notes: "Watered thoroughly",
        daysSinceCare: 0,
        formattedDate: "Today",
        careTypeDisplay: "Watering",
      });

      expect(requireAuthSession).toHaveBeenCalled();
      expect(careValidation.validateCareForm).toHaveBeenCalledWith(
        validatedData
      );
      expect(CareService.logCareEvent).toHaveBeenCalledWith(
        testUser.id,
        validatedData
      );
    });

    it("should create fertilizer care record with fertilizer type", async () => {
      // Arrange
      const careData = {
        plantInstanceId: 1,
        careType: "fertilizer",
        careDate: new Date().toISOString(),
        notes: "Applied balanced fertilizer",
        fertilizerType: "Balanced liquid fertilizer (10-10-10)",
      };

      const validatedData = {
        ...careData,
        careDate: new Date(careData.careDate),
      };

      const createdCareRecord = createTestFertilizerRecord(1, testUser.id, {
        id: 1,
        notes: careData.notes,
        fertilizerType: careData.fertilizerType,
      });

      (careValidation.validateCareForm as jest.Mock).mockReturnValue({
        success: true,
        data: validatedData,
      });

      (CareService.logCareEvent as jest.Mock).mockResolvedValue({
        success: true,
        careHistory: {
          ...createdCareRecord,
          daysSinceCare: 0,
          formattedDate: "Today",
          careTypeDisplay: "Fertilizing",
        },
      });

      const request = new NextRequest("http://localhost:3000/api/care/log", {
        method: "POST",
        body: JSON.stringify(careData),
        headers: { "Content-Type": "application/json" },
      });

      // Act
      const response = await careLogHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData).toMatchObject({
        careType: "fertilizer",
        fertilizerType: "Balanced liquid fertilizer (10-10-10)",
        notes: "Applied balanced fertilizer",
      });

      expect(CareService.logCareEvent).toHaveBeenCalledWith(
        testUser.id,
        validatedData
      );
    });

    it("should return validation error for invalid care data", async () => {
      // Arrange
      const invalidCareData = {
        plantInstanceId: "invalid",
        careType: "invalid_type",
        careDate: "invalid_date",
      };

      const { ZodError } = require("zod");
      const validationError = new ZodError([
        {
          path: ["plantInstanceId"],
          message: "Plant instance ID must be a number",
          code: "invalid_type",
        },
      ]);

      (careValidation.validateCareForm as jest.Mock).mockReturnValue({
        success: false,
        error: validationError,
      });

      const request = new NextRequest("http://localhost:3000/api/care/log", {
        method: "POST",
        body: JSON.stringify(invalidCareData),
        headers: { "Content-Type": "application/json" },
      });

      // Act
      const response = await careLogHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(responseData.error).toBe("Plant instance ID must be a number");
      expect(CareService.logCareEvent).not.toHaveBeenCalled();
    });

    it("should handle care service errors", async () => {
      // Arrange
      const careData = {
        plantInstanceId: 1,
        careType: "water",
        careDate: new Date().toISOString(),
      };

      (careValidation.validateCareForm as jest.Mock).mockReturnValue({
        success: true,
        data: { ...careData, careDate: new Date(careData.careDate) },
      });

      (CareService.logCareEvent as jest.Mock).mockResolvedValue({
        success: false,
        error: "Plant instance not found",
      });

      const request = new NextRequest("http://localhost:3000/api/care/log", {
        method: "POST",
        body: JSON.stringify(careData),
        headers: { "Content-Type": "application/json" },
      });

      // Act
      const response = await careLogHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(responseData.error).toBe("Plant instance not found");
    });
  });

  describe("GET /api/care/history/[plantInstanceId] - Care history retrieval and filtering", () => {
    it("should return care history for plant instance", async () => {
      // Arrange
      const careHistory = createTestCareHistory(1, testUser.id, 5);

      const enhancedCareHistory = careHistory.map((record, index) => ({
        ...record,
        id: index + 1,
        daysSinceCare: index * 2,
        formattedDate: `${index * 2} days ago`,
        careTypeDisplay: record.careType === "water" ? "Watering" : "Care",
      }));

      (
        CareHistoryQueries.getCareHistoryForPlant as jest.Mock
      ).mockResolvedValue(enhancedCareHistory);

      const request = new NextRequest(
        "http://localhost:3000/api/care/history/1"
      );
      const params = Promise.resolve({ plantInstanceId: "1" });

      // Act
      const response = await careHistoryHandler(request, { params });
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData).toHaveLength(5);
      expect(responseData[0]).toMatchObject({
        id: 1,
        plantInstanceId: 1,
        userId: testUser.id,
        daysSinceCare: 0,
        formattedDate: "0 days ago",
      });

      expect(validateRequest).toHaveBeenCalled();
      expect(CareHistoryQueries.getCareHistoryForPlant).toHaveBeenCalledWith(
        1,
        testUser.id,
        expect.objectContaining({
          limit: 50,
          offset: 0,
          sortBy: "care_date",
          sortOrder: "desc",
        })
      );
    });

    it("should return filtered care history by care type", async () => {
      // Arrange
      const wateringRecords = [
        createTestWateringRecord(1, testUser.id, { id: 1 }),
        createTestWateringRecord(1, testUser.id, { id: 2 }),
      ];

      const enhancedRecords = wateringRecords.map((record) => ({
        ...record,
        daysSinceCare: 1,
        formattedDate: "1 day ago",
        careTypeDisplay: "Watering",
      }));

      (
        CareHistoryQueries.getCareHistoryForPlant as jest.Mock
      ).mockResolvedValue(enhancedRecords);

      const request = new NextRequest(
        "http://localhost:3000/api/care/history/1?careType=water"
      );
      const params = Promise.resolve({ plantInstanceId: "1" });

      // Act
      const response = await careHistoryHandler(request, { params });
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData).toHaveLength(2);
      expect(
        responseData.every((record: any) => record.careType === "water")
      ).toBe(true);

      expect(CareHistoryQueries.getCareHistoryForPlant).toHaveBeenCalledWith(
        1,
        testUser.id,
        expect.objectContaining({
          careType: "water",
        })
      );
    });

    it("should return unauthorized when user not authenticated", async () => {
      // Arrange
      (validateRequest as jest.Mock).mockResolvedValue({
        user: null,
        session: null,
      });

      const request = new NextRequest(
        "http://localhost:3000/api/care/history/1"
      );
      const params = Promise.resolve({ plantInstanceId: "1" });

      // Act
      const response = await careHistoryHandler(request, { params });
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(responseData.error).toBe("Unauthorized");
      expect(CareHistoryQueries.getCareHistoryForPlant).not.toHaveBeenCalled();
    });

    it("should return bad request for invalid plant instance ID", async () => {
      // Arrange
      const request = new NextRequest(
        "http://localhost:3000/api/care/history/invalid"
      );
      const params = Promise.resolve({ plantInstanceId: "invalid" });

      // Act
      const response = await careHistoryHandler(request, { params });
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(responseData.error).toBe("Invalid plant instance ID");
      expect(CareHistoryQueries.getCareHistoryForPlant).not.toHaveBeenCalled();
    });
  });

  describe("GET /api/dashboard - Dashboard statistics calculation", () => {
    it("should return dashboard statistics", async () => {
      // Arrange
      const mockPlantStats = {
        totalPlants: 10,
        activePlants: 8,
        careDueToday: 3,
      };

      const mockPropagationStats = {
        totalPropagations: 5,
        activePropagations: 3,
        successfulPropagations: 2,
      };

      const mockFertilizerData = [
        {
          id: 1,
          nickname: "My Monstera",
          fertilizerDue: new Date(Date.now() + 1000 * 60 * 60 * 24 * 15), // 15 days from now
        },
        {
          id: 2,
          nickname: "My Pothos",
          fertilizerDue: new Date(Date.now() + 1000 * 60 * 60 * 24 * 16), // 16 days from now
        },
      ];

      // Mock database queries
      let callCount = 0;
      (db.select as jest.Mock).mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockImplementation(() => {
            callCount++;
            if (callCount === 1) {
              return Promise.resolve([mockPlantStats]);
            } else if (callCount === 2) {
              return Promise.resolve([mockPropagationStats]);
            } else if (callCount === 3) {
              return Promise.resolve([{ count: 3 }]); // Total completed propagations
            } else {
              return Promise.resolve(mockFertilizerData);
            }
          }),
        }),
      });

      const request = new NextRequest("http://localhost:3000/api/dashboard");

      // Act
      const response = await dashboardHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData).toMatchObject({
        totalPlants: 10,
        activePlants: 8,
        careDueToday: 3,
        totalPropagations: 5,
        activePropagations: 3,
        successfulPropagations: 2,
        fertilizerEvents: expect.arrayContaining([
          expect.objectContaining({
            id: "fertilizer-1",
            plantName: "My Monstera",
            type: "fertilize",
          }),
        ]),
      });

      expect(validateRequest).toHaveBeenCalled();
    });

    it("should return empty statistics for new user", async () => {
      // Arrange
      const emptyStats = {
        totalPlants: 0,
        activePlants: 0,
        careDueToday: 0,
        totalPropagations: 0,
        activePropagations: 0,
        successfulPropagations: 0,
        propagationSuccessRate: 0,
        fertilizerEvents: [],
      };

      // Mock database queries to return empty results
      (db.select as jest.Mock).mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([
            {
              totalPlants: 0,
              activePlants: 0,
              careDueToday: 0,
              totalPropagations: 0,
              activePropagations: 0,
              successfulPropagations: 0,
            },
          ]),
        }),
      });

      const request = new NextRequest("http://localhost:3000/api/dashboard");

      // Act
      const response = await dashboardHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData).toMatchObject(emptyStats);
    });

    it("should return unauthorized when user not authenticated", async () => {
      // Arrange
      (validateRequest as jest.Mock).mockResolvedValue({
        user: null,
        session: null,
      });

      const request = new NextRequest("http://localhost:3000/api/dashboard");

      // Act
      const response = await dashboardHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(responseData.error).toBe("Unauthorized");
    });
  });
});
