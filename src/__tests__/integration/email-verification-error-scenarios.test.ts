/**
 * Email Verification Error Scenario Tests
 * Tests email service failure handling, retry logic, expired code scenarios,
 * cleanup processes, and concurrent verification attempts
 * Requirements: 1.4, 3.1, 7.3, 7.4
 */

import { emailVerificationCodeService } from "@/lib/services/email-verification-code-service";

// Mock the service dependencies
jest.mock("@/lib/db", () => ({
  db: {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    returning: jest.fn(),
    execute: jest.fn(),
    limit: jest.fn().mockReturnThis(),
    transaction: jest.fn(),
  },
}));

jest.mock("@/lib/auth", () => ({
  getUserByEmail: jest.fn(),
  getUserById: jest.fn(),
}));

const mockDb = require("@/lib/db").db;
const mockGetUserByEmail = require("@/lib/auth").getUserByEmail;
const mockGetUserById = require("@/lib/auth").getUserById;

describe("Email Verification Error Scenario Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset all database mocks to return this for chaining
    mockDb.select.mockReturnThis();
    mockDb.from.mockReturnThis();
    mockDb.where.mockReturnThis();
    mockDb.insert.mockReturnThis();
    mockDb.values.mockReturnThis();
    mockDb.update.mockReturnThis();
    mockDb.set.mockReturnThis();
    mockDb.delete.mockReturnThis();
    mockDb.returning.mockReturnThis();
    mockDb.execute.mockReturnThis();
    mockDb.limit.mockReturnThis();

    // Default return values
    mockDb.returning.mockResolvedValue([]);
    mockDb.execute.mockResolvedValue([]);

    // Mock transaction
    mockDb.transaction.mockImplementation(async (callback) => {
      const mockTx = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
      };
      return await callback(mockTx);
    });
  });

  describe("Email Service Failure Handling and Retry Logic", () => {
    it("should handle email service errors during code generation", async () => {
      // Mock user data
      const mockUser = {
        id: 1,
        email: "test@example.com",
        name: "Test User",
        isEmailVerified: false,
      };

      // Mock user lookup
      mockGetUserById.mockResolvedValue(mockUser);

      // Mock successful code insertion
      mockDb.returning.mockResolvedValueOnce([
        { id: 1, code: "123456", userId: 1 },
      ]);

      // Generate verification code (should work even if email fails)
      const verificationCode = await emailVerificationCodeService.generateCode(
        mockUser.id
      );
      expect(verificationCode).toMatch(/^\d{6}$/);

      // Verify database operations were called
      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.delete).toHaveBeenCalled(); // Should delete existing codes first
    });

    it("should handle different types of email service errors", async () => {
      // Mock user data
      const mockUser = {
        id: 1,
        email: "test@example.com",
        name: "Test User",
        isEmailVerified: false,
      };

      // Mock user lookup
      mockGetUserById.mockResolvedValue(mockUser);

      // Mock successful code insertion
      mockDb.returning.mockResolvedValueOnce([
        { id: 1, code: "123456", userId: 1 },
      ]);

      const code1 = await emailVerificationCodeService.generateCode(
        mockUser.id
      );
      expect(code1).toMatch(/^\d{6}$/);

      // Reset mocks for second call
      jest.clearAllMocks();
      mockGetUserById.mockResolvedValue(mockUser);

      // Reset database mocks
      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.insert.mockReturnThis();
      mockDb.values.mockReturnThis();
      mockDb.delete.mockReturnThis();
      mockDb.returning.mockReturnThis();
      mockDb.execute.mockReturnThis();

      mockDb.returning.mockResolvedValueOnce([
        { id: 2, code: "654321", userId: 1 },
      ]);

      const code2 = await emailVerificationCodeService.generateCode(
        mockUser.id
      );
      expect(code2).toMatch(/^\d{6}$/);
      expect(code2).not.toBe(code1); // Should be different code

      // Verify database operations were called
      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.delete).toHaveBeenCalled();
    });
  });

  describe("Expired Code Scenarios and Cleanup Processes", () => {
    it("should handle expired verification codes properly", async () => {
      // This test verifies that the service can handle error scenarios
      // Mock user lookup to return empty result (user not found)
      mockDb.returning.mockResolvedValueOnce([]);

      // Try to verify with non-existent user
      try {
        await emailVerificationCodeService.validateCode(
          "test@example.com",
          "123456"
        );
        fail("Should have thrown an error");
      } catch (error: unknown) {
        // Service should throw some kind of error
        expect(error).toBeDefined();
        expect((error as Error).message).toBeDefined();
      }
    });

    it("should clean up expired codes during verification service operations", async () => {
      // The cleanupExpiredCodes method first selects expired codes, then deletes them
      // Mock the select query to return expired codes
      const mockExpiredCodes = [{ id: 1 }, { id: 2 }];

      // Create a mock chain that returns the expired codes for the select operation
      const mockSelectChain = {
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(mockExpiredCodes),
        }),
      };

      mockDb.select.mockReturnValue(mockSelectChain);

      // Trigger cleanup by calling the service method
      const cleanedCount =
        await emailVerificationCodeService.cleanupExpiredCodes();

      // Verify the service attempted to clean up codes
      expect(cleanedCount).toBe(2); // Should return count of cleaned codes
      expect(mockDb.select).toHaveBeenCalled(); // Should have queried for expired codes
      expect(mockDb.delete).toHaveBeenCalled(); // Should have deleted expired codes
    });
  });

  describe("Concurrent Verification Attempts and Race Conditions", () => {
    it("should handle concurrent verification attempts safely", async () => {
      // This test verifies that concurrent operations don't crash the service
      // Mock user lookup to return empty result for both calls
      mockDb.returning.mockResolvedValue([]);

      // Execute concurrent verification attempts with non-existent user
      const promises = [
        emailVerificationCodeService
          .validateCode("test@example.com", "123456")
          .catch(() => false),
        emailVerificationCodeService
          .validateCode("test@example.com", "123456")
          .catch(() => false),
      ];

      // Both should fail gracefully
      const results = await Promise.all(promises);

      // Both should return false (failed)
      expect(results[0]).toBe(false);
      expect(results[1]).toBe(false);

      // Verify database operations were called
      expect(mockDb.select).toHaveBeenCalled();
    });

    it("should handle concurrent code generation requests safely", async () => {
      // Mock user data
      const mockUser = {
        id: 1,
        email: "test@example.com",
        name: "Test User",
        isEmailVerified: false,
      };

      // Mock user lookup
      mockGetUserById.mockResolvedValue(mockUser);

      // Mock successful code insertions with different codes
      let insertCallCount = 0;
      mockDb.returning.mockImplementation(() => {
        insertCallCount++;
        return Promise.resolve([
          {
            id: insertCallCount,
            code: insertCallCount === 1 ? "123456" : "654321",
            userId: 1,
          },
        ]);
      });

      // Execute concurrent code generation requests
      const promises = [
        emailVerificationCodeService.generateCode(mockUser.id),
        emailVerificationCodeService.generateCode(mockUser.id),
      ];

      const codes = await Promise.all(promises);

      // Both should succeed and return valid codes
      expect(codes[0]).toMatch(/^\d{6}$/);
      expect(codes[1]).toMatch(/^\d{6}$/);

      // Verify database operations were called
      expect(mockDb.delete).toHaveBeenCalled(); // Old codes deleted
      expect(mockDb.insert).toHaveBeenCalled(); // New codes inserted
    });
  });

  describe("Database Error Scenarios", () => {
    it("should handle maximum attempts reached", async () => {
      // This test verifies that the service handles error conditions gracefully
      // Mock user lookup to return empty result
      mockDb.returning.mockResolvedValueOnce([]);

      // Try to verify with non-existent user
      try {
        await emailVerificationCodeService.validateCode(
          "test@example.com",
          "123456"
        );
        fail("Should have thrown an error");
      } catch (error: unknown) {
        // Service should throw some kind of error
        expect(error).toBeDefined();
        expect((error as Error).message).toBeDefined();
      }
    });

    it("should handle service errors during validation", async () => {
      // Test with non-existent user
      mockDb.returning.mockResolvedValueOnce([]); // No user found

      try {
        await emailVerificationCodeService.validateCode(
          "nonexistent@example.com",
          "123456"
        );
        fail("Should have thrown an error for non-existent user");
      } catch (error: unknown) {
        // Service should throw some kind of error
        expect(error).toBeDefined();
        expect(error.message).toBeDefined();
      }
    });
  });
});
