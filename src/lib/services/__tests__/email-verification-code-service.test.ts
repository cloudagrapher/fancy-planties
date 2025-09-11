import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock the database BEFORE importing the service
const mockDb = {
  insert: jest.fn(),
  select: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  transaction: jest.fn(),
};

jest.mock('@/lib/db', () => ({
  db: mockDb,
}));

// Import after mocking
import { EmailVerificationCodeService, VerificationError, VerificationCodeError } from '../email-verification-code-service';

describe('EmailVerificationCodeService', () => {
  let service: EmailVerificationCodeService;
  const mockUserId = 1;
  const mockEmail = 'test@example.com';
  const mockCode = '123456';

  beforeEach(() => {
    service = new EmailVerificationCodeService();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('generateCode', () => {
    it('should generate a 6-digit code', async () => {
      // Mock deleteUserCodes to resolve
      const deleteUserCodesSpy = jest.spyOn(service, 'deleteUserCodes').mockResolvedValue();
      
      // Mock insert chain
      const mockValues = jest.fn().mockResolvedValue(undefined);
      mockDb.insert.mockReturnValue({ values: mockValues });
      
      const code = await service.generateCode(mockUserId);
      
      expect(code).toMatch(/^\d{6}$/);
      expect(deleteUserCodesSpy).toHaveBeenCalledWith(mockUserId);
      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUserId,
          code: expect.stringMatching(/^\d{6}$/),
          expiresAt: expect.any(Date),
          attemptsUsed: 0,
        })
      );
    });

    it('should delete existing codes before generating new one', async () => {
      const deleteUserCodesSpy = jest.spyOn(service, 'deleteUserCodes').mockResolvedValue();
      const mockValues = jest.fn().mockResolvedValue(undefined);
      mockDb.insert.mockReturnValue({ values: mockValues });
      
      await service.generateCode(mockUserId);
      
      expect(deleteUserCodesSpy).toHaveBeenCalledWith(mockUserId);
    });

    it('should store code with correct expiration time', async () => {
      jest.spyOn(service, 'deleteUserCodes').mockResolvedValue();
      const mockValues = jest.fn().mockResolvedValue(undefined);
      mockDb.insert.mockReturnValue({ values: mockValues });
      
      const beforeTime = Date.now();
      await service.generateCode(mockUserId);
      const afterTime = Date.now();
      
      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUserId,
          code: expect.stringMatching(/^\d{6}$/),
          expiresAt: expect.any(Date),
          attemptsUsed: 0,
        })
      );
      
      // Check that expiration is approximately 10 minutes from now
      const callArgs = mockValues.mock.calls[0][0];
      const expirationTime = callArgs.expiresAt.getTime();
      const expectedMin = beforeTime + 9.5 * 60 * 1000; // 9.5 minutes
      const expectedMax = afterTime + 10.5 * 60 * 1000; // 10.5 minutes
      
      expect(expirationTime).toBeGreaterThan(expectedMin);
      expect(expirationTime).toBeLessThan(expectedMax);
    });
  });

  describe('validateCode', () => {
    const mockUser = { id: mockUserId, isEmailVerified: false };
    const mockVerificationCode = {
      id: 1,
      userId: mockUserId,
      code: mockCode,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes from now
      createdAt: new Date(),
      attemptsUsed: 0,
    };

    it('should validate correct code successfully', async () => {
      // Mock user lookup
      const mockUserLimit = jest.fn().mockResolvedValue([mockUser]);
      const mockUserWhere = jest.fn().mockReturnValue({ limit: mockUserLimit });
      const mockUserFrom = jest.fn().mockReturnValue({ where: mockUserWhere });
      mockDb.select.mockReturnValueOnce({ from: mockUserFrom });

      // Mock verification code lookup
      const mockCodeLimit = jest.fn().mockResolvedValue([mockVerificationCode]);
      const mockCodeWhere = jest.fn().mockReturnValue({ limit: mockCodeLimit });
      const mockCodeFrom = jest.fn().mockReturnValue({ where: mockCodeWhere });
      mockDb.select.mockReturnValueOnce({ from: mockCodeFrom });

      // Mock transaction
      const mockTx = {
        update: jest.fn().mockReturnValue({
          set: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue(undefined),
          }),
        }),
        delete: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(undefined),
        }),
      };
      mockDb.transaction.mockImplementation(async (callback) => callback(mockTx));

      const result = await service.validateCode(mockEmail, mockCode);

      expect(result).toBe(true);
      expect(mockDb.transaction).toHaveBeenCalled();
    });

    it('should throw USER_NOT_FOUND when user does not exist', async () => {
      // Mock user lookup to return empty array
      const mockUserLimit = jest.fn().mockResolvedValue([]);
      const mockUserWhere = jest.fn().mockReturnValue({ limit: mockUserLimit });
      const mockUserFrom = jest.fn().mockReturnValue({ where: mockUserWhere });
      mockDb.select.mockReturnValueOnce({ from: mockUserFrom });

      await expect(service.validateCode(mockEmail, mockCode))
        .rejects
        .toThrow(new VerificationCodeError('User not found', VerificationError.USER_NOT_FOUND));
    });

    it('should throw ALREADY_VERIFIED when user is already verified', async () => {
      // Mock user lookup to return verified user
      const mockUserLimit = jest.fn().mockResolvedValue([{ ...mockUser, isEmailVerified: true }]);
      const mockUserWhere = jest.fn().mockReturnValue({ limit: mockUserLimit });
      const mockUserFrom = jest.fn().mockReturnValue({ where: mockUserWhere });
      mockDb.select.mockReturnValueOnce({ from: mockUserFrom });

      await expect(service.validateCode(mockEmail, mockCode))
        .rejects
        .toThrow(new VerificationCodeError('Email already verified', VerificationError.ALREADY_VERIFIED));
    });

    it('should throw CODE_INVALID when code does not exist', async () => {
      // Mock user lookup
      const mockUserLimit = jest.fn().mockResolvedValue([mockUser]);
      const mockUserWhere = jest.fn().mockReturnValue({ limit: mockUserLimit });
      const mockUserFrom = jest.fn().mockReturnValue({ where: mockUserWhere });
      mockDb.select.mockReturnValueOnce({ from: mockUserFrom });

      // Mock verification code lookup to return empty array
      const mockCodeLimit = jest.fn().mockResolvedValue([]);
      const mockCodeWhere = jest.fn().mockReturnValue({ limit: mockCodeLimit });
      const mockCodeFrom = jest.fn().mockReturnValue({ where: mockCodeWhere });
      mockDb.select.mockReturnValueOnce({ from: mockCodeFrom });

      await expect(service.validateCode(mockEmail, mockCode))
        .rejects
        .toThrow(new VerificationCodeError('Invalid verification code', VerificationError.CODE_INVALID));
    });

    it('should throw CODE_EXPIRED when code has expired', async () => {
      const expiredCode = {
        ...mockVerificationCode,
        expiresAt: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
      };

      // Mock user lookup
      const mockUserLimit = jest.fn().mockResolvedValue([mockUser]);
      const mockUserWhere = jest.fn().mockReturnValue({ limit: mockUserLimit });
      const mockUserFrom = jest.fn().mockReturnValue({ where: mockUserWhere });
      mockDb.select.mockReturnValueOnce({ from: mockUserFrom });

      // Mock verification code lookup
      const mockCodeLimit = jest.fn().mockResolvedValue([expiredCode]);
      const mockCodeWhere = jest.fn().mockReturnValue({ limit: mockCodeLimit });
      const mockCodeFrom = jest.fn().mockReturnValue({ where: mockCodeWhere });
      mockDb.select.mockReturnValueOnce({ from: mockCodeFrom });

      // Mock delete for expired code cleanup
      const mockDeleteWhere = jest.fn().mockResolvedValue(undefined);
      mockDb.delete.mockReturnValue({ where: mockDeleteWhere });

      await expect(service.validateCode(mockEmail, mockCode))
        .rejects
        .toThrow(new VerificationCodeError('Verification code has expired', VerificationError.CODE_EXPIRED));

      expect(mockDb.delete).toHaveBeenCalled();
    });

    it('should throw TOO_MANY_ATTEMPTS when max attempts exceeded', async () => {
      const maxAttemptsCode = {
        ...mockVerificationCode,
        attemptsUsed: 5, // Max attempts
      };

      // Mock user lookup
      const mockUserLimit = jest.fn().mockResolvedValue([mockUser]);
      const mockUserWhere = jest.fn().mockReturnValue({ limit: mockUserLimit });
      const mockUserFrom = jest.fn().mockReturnValue({ where: mockUserWhere });
      mockDb.select.mockReturnValueOnce({ from: mockUserFrom });

      // Mock verification code lookup
      const mockCodeLimit = jest.fn().mockResolvedValue([maxAttemptsCode]);
      const mockCodeWhere = jest.fn().mockReturnValue({ limit: mockCodeLimit });
      const mockCodeFrom = jest.fn().mockReturnValue({ where: mockCodeWhere });
      mockDb.select.mockReturnValueOnce({ from: mockCodeFrom });

      // Mock delete for code invalidation
      const mockDeleteWhere = jest.fn().mockResolvedValue(undefined);
      mockDb.delete.mockReturnValue({ where: mockDeleteWhere });

      await expect(service.validateCode(mockEmail, mockCode))
        .rejects
        .toThrow(new VerificationCodeError('Too many verification attempts', VerificationError.TOO_MANY_ATTEMPTS));

      expect(mockDb.delete).toHaveBeenCalled();
    });
  });

  describe('incrementAttempts', () => {
    const mockUser = { id: mockUserId };
    const mockVerificationCode = { id: 1, attemptsUsed: 2 };

    it('should increment attempts for valid code', async () => {
      // Mock user lookup
      const mockUserLimit = jest.fn().mockResolvedValue([mockUser]);
      const mockUserWhere = jest.fn().mockReturnValue({ limit: mockUserLimit });
      const mockUserFrom = jest.fn().mockReturnValue({ where: mockUserWhere });
      mockDb.select.mockReturnValueOnce({ from: mockUserFrom });

      // Mock verification code lookup
      const mockCodeLimit = jest.fn().mockResolvedValue([mockVerificationCode]);
      const mockCodeWhere = jest.fn().mockReturnValue({ limit: mockCodeLimit });
      const mockCodeFrom = jest.fn().mockReturnValue({ where: mockCodeWhere });
      mockDb.select.mockReturnValueOnce({ from: mockCodeFrom });

      // Mock update
      const mockUpdateWhere = jest.fn().mockResolvedValue(undefined);
      const mockUpdateSet = jest.fn().mockReturnValue({ where: mockUpdateWhere });
      mockDb.update.mockReturnValue({ set: mockUpdateSet });

      await service.incrementAttempts(mockEmail, mockCode);

      expect(mockDb.update).toHaveBeenCalled();
      expect(mockUpdateSet).toHaveBeenCalledWith({ attemptsUsed: 3 });
    });

    it('should handle user not found gracefully', async () => {
      // Mock user lookup to return empty array
      const mockUserLimit = jest.fn().mockResolvedValue([]);
      const mockUserWhere = jest.fn().mockReturnValue({ limit: mockUserLimit });
      const mockUserFrom = jest.fn().mockReturnValue({ where: mockUserWhere });
      mockDb.select.mockReturnValueOnce({ from: mockUserFrom });

      await expect(service.incrementAttempts(mockEmail, mockCode)).resolves.toBeUndefined();
      expect(mockDb.update).not.toHaveBeenCalled();
    });

    it('should handle code not found gracefully', async () => {
      // Mock user lookup
      const mockUserLimit = jest.fn().mockResolvedValue([mockUser]);
      const mockUserWhere = jest.fn().mockReturnValue({ limit: mockUserLimit });
      const mockUserFrom = jest.fn().mockReturnValue({ where: mockUserWhere });
      mockDb.select.mockReturnValueOnce({ from: mockUserFrom });

      // Mock verification code lookup to return empty array
      const mockCodeLimit = jest.fn().mockResolvedValue([]);
      const mockCodeWhere = jest.fn().mockReturnValue({ limit: mockCodeLimit });
      const mockCodeFrom = jest.fn().mockReturnValue({ where: mockCodeWhere });
      mockDb.select.mockReturnValueOnce({ from: mockCodeFrom });

      await expect(service.incrementAttempts(mockEmail, mockCode)).resolves.toBeUndefined();
      expect(mockDb.update).not.toHaveBeenCalled();
    });
  });

  describe('cleanupExpiredCodes', () => {
    it('should delete expired codes and return count', async () => {
      const mockDeleteResult = { rowCount: 5 };
      const mockDeleteWhere = jest.fn().mockResolvedValue(mockDeleteResult);
      mockDb.delete.mockReturnValue({ where: mockDeleteWhere });

      const result = await service.cleanupExpiredCodes();

      expect(result).toBe(5);
      expect(mockDb.delete).toHaveBeenCalled();
    });

    it('should handle missing rowCount gracefully', async () => {
      const mockDeleteResult = {}; // No rowCount property
      const mockDeleteWhere = jest.fn().mockResolvedValue(mockDeleteResult);
      mockDb.delete.mockReturnValue({ where: mockDeleteWhere });

      const result = await service.cleanupExpiredCodes();

      expect(result).toBe(0);
    });
  });

  describe('deleteUserCodes', () => {
    it('should delete all codes for a user', async () => {
      const mockDeleteWhere = jest.fn().mockResolvedValue(undefined);
      mockDb.delete.mockReturnValue({ where: mockDeleteWhere });

      await service.deleteUserCodes(mockUserId);

      expect(mockDb.delete).toHaveBeenCalled();
    });
  });

  describe('getUserActiveCode', () => {
    it('should return active code for user', async () => {
      const mockActiveCode = {
        id: 1,
        userId: mockUserId,
        code: mockCode,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        createdAt: new Date(),
        attemptsUsed: 0,
      };

      const mockLimit = jest.fn().mockResolvedValue([mockActiveCode]);
      const mockWhere = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockFrom = jest.fn().mockReturnValue({ where: mockWhere });
      mockDb.select.mockReturnValue({ from: mockFrom });

      const result = await service.getUserActiveCode(mockUserId);

      expect(result).toEqual(mockActiveCode);
    });

    it('should return null when no active code exists', async () => {
      const mockLimit = jest.fn().mockResolvedValue([]);
      const mockWhere = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockFrom = jest.fn().mockReturnValue({ where: mockWhere });
      mockDb.select.mockReturnValue({ from: mockFrom });

      const result = await service.getUserActiveCode(mockUserId);

      expect(result).toBeNull();
    });
  });

  describe('hasActiveCode', () => {
    it('should return true when user has active code', async () => {
      jest.spyOn(service, 'getUserActiveCode').mockResolvedValue({
        id: 1,
        userId: mockUserId,
        code: mockCode,
        expiresAt: new Date(),
        createdAt: new Date(),
        attemptsUsed: 0,
      });

      const result = await service.hasActiveCode(mockUserId);

      expect(result).toBe(true);
    });

    it('should return false when user has no active code', async () => {
      jest.spyOn(service, 'getUserActiveCode').mockResolvedValue(null);

      const result = await service.hasActiveCode(mockUserId);

      expect(result).toBe(false);
    });
  });

  describe('getCodeStats', () => {
    it('should return code statistics', async () => {
      // Mock the three select queries for stats
      const mockFrom1 = jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([1, 2, 3]), // 3 active codes
      });
      const mockFrom2 = jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([1, 2]), // 2 expired codes
      });
      const mockFrom3 = jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([1]), // 1 high attempt code
      });

      mockDb.select
        .mockReturnValueOnce({ from: mockFrom1 })
        .mockReturnValueOnce({ from: mockFrom2 })
        .mockReturnValueOnce({ from: mockFrom3 });

      const result = await service.getCodeStats();

      expect(result).toEqual({
        totalActive: 3,
        expiredCount: 2,
        highAttemptCount: 1,
      });
    });
  });

  describe('code generation security', () => {
    it('should generate unique codes', async () => {
      jest.spyOn(service, 'deleteUserCodes').mockResolvedValue();
      const mockValues = jest.fn().mockResolvedValue(undefined);
      mockDb.insert.mockReturnValue({ values: mockValues });
      
      const codes = new Set();
      for (let i = 0; i < 100; i++) {
        const code = await service.generateCode(mockUserId);
        codes.add(code);
      }
      
      // Should have generated 100 unique codes (very high probability)
      expect(codes.size).toBeGreaterThan(95);
    });

    it('should always generate 6-digit codes', async () => {
      jest.spyOn(service, 'deleteUserCodes').mockResolvedValue();
      const mockValues = jest.fn().mockResolvedValue(undefined);
      mockDb.insert.mockReturnValue({ values: mockValues });
      
      for (let i = 0; i < 50; i++) {
        const code = await service.generateCode(mockUserId);
        expect(code).toMatch(/^\d{6}$/);
        expect(code.length).toBe(6);
      }
    });

    it('should pad codes with leading zeros', async () => {
      jest.spyOn(service, 'deleteUserCodes').mockResolvedValue();
      const mockValues = jest.fn().mockResolvedValue(undefined);
      mockDb.insert.mockReturnValue({ values: mockValues });
      
      // Mock crypto.randomBytes to return a small number
      const originalRandomBytes = require('crypto').randomBytes;
      const mockRandomBytes = jest.fn().mockReturnValue(Buffer.from([0, 0, 0, 1])); // Very small number
      require('crypto').randomBytes = mockRandomBytes;
      
      const code = await service.generateCode(mockUserId);
      
      expect(code).toMatch(/^\d{6}$/);
      expect(code.length).toBe(6);
      
      // Restore original function
      require('crypto').randomBytes = originalRandomBytes;
    });
  });
});