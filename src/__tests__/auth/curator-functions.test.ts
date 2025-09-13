import { describe, it, expect } from '@jest/globals';
import { isUserCurator } from '@/lib/auth/client';

describe('Curator Client Functions', () => {
  describe('isUserCurator', () => {
    it('should return true for curator users', () => {
      const curatorUser = {
        id: 1,
        email: 'curator@example.com',
        name: 'Curator User',
        isCurator: true,
        isEmailVerified: true,
      };

      expect(isUserCurator(curatorUser)).toBe(true);
    });

    it('should return false for non-curator users', () => {
      const regularUser = {
        id: 2,
        email: 'user@example.com',
        name: 'Regular User',
        isCurator: false,
        isEmailVerified: true,
      };

      expect(isUserCurator(regularUser)).toBe(false);
    });

    it('should return false for null user', () => {
      expect(isUserCurator(null)).toBe(false);
    });

    it('should return false for undefined user', () => {
      expect(isUserCurator(undefined as any)).toBe(false);
    });
  });
});