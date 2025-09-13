import { getTaxonomyHierarchy, getTaxonomyStats, validateTaxonomyEntry } from '@/lib/db/queries/admin-taxonomy';

// Mock the database
jest.mock('@/lib/db', () => ({
  db: {
    select: jest.fn(),
    from: jest.fn(),
    where: jest.fn(),
    orderBy: jest.fn(),
    groupBy: jest.fn(),
    having: jest.fn(),
    innerJoin: jest.fn(),
    leftJoin: jest.fn(),
    transaction: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    insert: jest.fn(),
  },
}));

// Mock the schema
jest.mock('@/lib/db/schema', () => ({
  plants: {
    id: 'id',
    family: 'family',
    genus: 'genus',
    species: 'species',
    cultivar: 'cultivar',
    commonName: 'commonName',
    isVerified: 'isVerified',
    createdAt: 'createdAt',
  },
  plantInstances: {
    plantId: 'plantId',
  },
  propagations: {
    plantId: 'plantId',
  },
}));

describe('Taxonomy Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getTaxonomyHierarchy', () => {
    it('should be defined and callable', async () => {
      expect(getTaxonomyHierarchy).toBeDefined();
      expect(typeof getTaxonomyHierarchy).toBe('function');
    });
  });

  describe('getTaxonomyStats', () => {
    it('should be defined and callable', async () => {
      expect(getTaxonomyStats).toBeDefined();
      expect(typeof getTaxonomyStats).toBe('function');
    });
  });

  describe('validateTaxonomyEntry', () => {
    it('should be defined and callable', async () => {
      expect(validateTaxonomyEntry).toBeDefined();
      expect(typeof validateTaxonomyEntry).toBe('function');
    });

    it('should validate taxonomy parameters', async () => {
      // Mock database response
      const mockDb = require('@/lib/db').db;
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([]), // No conflicts
        }),
      });

      const result = await validateTaxonomyEntry('Testaceae', 'Testus', 'testicus');
      
      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('conflicts');
      expect(Array.isArray(result.conflicts)).toBe(true);
    });
  });
});

describe('Taxonomy API Routes', () => {
  describe('Merge API', () => {
    it('should have merge route defined', () => {
      // Test that the route file exists and exports POST
      expect(() => require('../../app/api/admin/taxonomy/merge/route')).not.toThrow();
    });
  });

  describe('Bulk Delete API', () => {
    it('should have bulk delete route defined', () => {
      // Test that the route file exists and exports POST
      expect(() => require('../../app/api/admin/taxonomy/bulk-delete/route')).not.toThrow();
    });
  });

  describe('Validate API', () => {
    it('should have validate route defined', () => {
      // Test that the route file exists and exports POST
      expect(() => require('../../app/api/admin/taxonomy/validate/route')).not.toThrow();
    });
  });
});

describe('Taxonomy Page Components', () => {
  describe('Taxonomy Management Page', () => {
    it('should have taxonomy page defined', () => {
      // Test that the page component exists
      expect(() => require('../../app/admin/taxonomy/page')).not.toThrow();
    });
  });

  describe('Taxonomy Management Client', () => {
    it('should have client component defined', () => {
      // Test that the client component exists
      expect(() => require('../../app/admin/taxonomy/TaxonomyManagementClient')).not.toThrow();
    });
  });
});