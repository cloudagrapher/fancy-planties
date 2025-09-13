import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock the server-only module
jest.mock('server-only', () => ({}));

// Mock next/navigation
const mockRedirect = jest.fn();
jest.mock('next/navigation', () => ({
  redirect: mockRedirect,
}));

// Mock the database
const mockDb = {
  select: jest.fn(),
  from: jest.fn(),
  where: jest.fn(),
  update: jest.fn(),
  set: jest.fn(),
  returning: jest.fn(),
};

jest.mock('@/lib/db', () => ({
  db: mockDb,
}));

// Mock the schema
jest.mock('@/lib/db/schema', () => ({
  users: {
    id: 'id',
    isCurator: 'isCurator',
    updatedAt: 'updatedAt',
  },
}));

// Mock validateRequest
const mockValidateRequest = jest.fn();
jest.mock('@/lib/auth/server', () => ({
  validateRequest: mockValidateRequest,
  requireVerifiedSession: jest.fn(),
}));

describe('Curator Authentication', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRedirect.mockClear();
  });

  describe('isCurator', () => {
    it('should return true for curator users', async () => {
      mockValidateRequest.mockResolvedValue({
        user: { id: 1, isCurator: true },
        session: { id: 'session1' },
      });

      const { isCurator } = await import('@/lib/auth/server');
      const result = await isCurator();

      expect(result).toBe(true);
    });

    it('should return false for non-curator users', async () => {
      mockValidateRequest.mockResolvedValue({
        user: { id: 1, isCurator: false },
        session: { id: 'session1' },
      });

      const { isCurator } = await import('@/lib/auth/server');
      const result = await isCurator();

      expect(result).toBe(false);
    });

    it('should return false for unauthenticated users', async () => {
      mockValidateRequest.mockResolvedValue({
        user: null,
        session: null,
      });

      const { isCurator } = await import('@/lib/auth/server');
      const result = await isCurator();

      expect(result).toBe(false);
    });
  });

  describe('getCuratorStatus', () => {
    it('should return correct status for curator', async () => {
      mockValidateRequest.mockResolvedValue({
        user: { id: 1, isCurator: true, isEmailVerified: true },
        session: { id: 'session1' },
      });

      const { getCuratorStatus } = await import('@/lib/auth/server');
      const result = await getCuratorStatus();

      expect(result).toEqual({
        isCurator: true,
        isAuthenticated: true,
        isVerified: true,
      });
    });

    it('should return correct status for non-curator', async () => {
      mockValidateRequest.mockResolvedValue({
        user: { id: 1, isCurator: false, isEmailVerified: true },
        session: { id: 'session1' },
      });

      const { getCuratorStatus } = await import('@/lib/auth/server');
      const result = await getCuratorStatus();

      expect(result).toEqual({
        isCurator: false,
        isAuthenticated: true,
        isVerified: true,
      });
    });

    it('should return correct status for unauthenticated user', async () => {
      mockValidateRequest.mockResolvedValue({
        user: null,
        session: null,
      });

      const { getCuratorStatus } = await import('@/lib/auth/server');
      const result = await getCuratorStatus();

      expect(result).toEqual({
        isCurator: false,
        isAuthenticated: false,
        isVerified: false,
      });
    });
  });
});

describe('User Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset the mock chain
    mockDb.select.mockReturnValue(mockDb);
    mockDb.from.mockReturnValue(mockDb);
    mockDb.where.mockReturnValue(mockDb);
    mockDb.update.mockReturnValue(mockDb);
    mockDb.set.mockReturnValue(mockDb);
    mockDb.returning.mockReturnValue(mockDb);
  });

  describe('promoteUserToCurator', () => {
    it('should promote user when curator performs action', async () => {
      // Mock curator verification
      mockDb.select.mockResolvedValueOnce([{ id: 2, isCurator: true }]);
      // Mock user promotion
      mockDb.returning.mockResolvedValueOnce([{ id: 1, isCurator: true }]);

      const { promoteUserToCurator } = await import('@/lib/auth/user-management');
      const result = await promoteUserToCurator(1, 2);

      expect(result).toBe(true);
    });

    it('should fail when non-curator tries to promote', async () => {
      // Mock non-curator verification
      mockDb.select.mockResolvedValueOnce([]);

      const { promoteUserToCurator } = await import('@/lib/auth/user-management');
      const result = await promoteUserToCurator(1, 2);

      expect(result).toBe(false);
    });
  });

  describe('demoteUserFromCurator', () => {
    it('should prevent self-demotion', async () => {
      const { demoteUserFromCurator } = await import('@/lib/auth/user-management');
      const result = await demoteUserFromCurator(1, 1);

      expect(result).toBe(false);
    });

    it('should demote user when different curator performs action', async () => {
      // Mock curator verification
      mockDb.select.mockResolvedValueOnce([{ id: 2, isCurator: true }]);
      // Mock user demotion
      mockDb.returning.mockResolvedValueOnce([{ id: 1, isCurator: false }]);

      const { demoteUserFromCurator } = await import('@/lib/auth/user-management');
      const result = await demoteUserFromCurator(1, 2);

      expect(result).toBe(true);
    });
  });
});