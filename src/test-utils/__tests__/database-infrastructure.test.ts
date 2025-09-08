/**
 * Database Infrastructure Test - Simple test to verify database mocking works
 */

import { 
  DatabaseTestManager,
  getDatabaseTestManager,
} from '../database-test-manager';
import {
  TestDatasetFactory,
  TestUserFactory,
  TestPlantFactory,
  TestPlantInstanceFactory,
} from '../realistic-test-data';

describe('Database Test Infrastructure', () => {
  let dbManager: DatabaseTestManager;

  beforeEach(async () => {
    dbManager = getDatabaseTestManager();
    await dbManager.setup({
      useInMemory: true,
      mockQueries: true,
      seedData: TestDatasetFactory.createMinimalDataset(),
    });
  });

  afterEach(async () => {
    await dbManager.teardown();
  });

  describe('In-Memory Database', () => {
    it('should provide working database operations', async () => {
      const db = dbManager.getMockDb();
      
      // Test insert
      const insertResult = await db.insert('users').values({
        email: 'test@example.com',
        hashedPassword: 'hashed',
        name: 'Test User',
      }).returning();

      expect(insertResult).toHaveLength(1);
      expect(insertResult[0].email).toBe('test@example.com');
      expect(insertResult[0].id).toBeDefined();

      // Test select
      const selectResult = await db.select().from('users').execute();
      expect(selectResult.length).toBeGreaterThan(0);
      
      // Find our inserted user
      const insertedUser = selectResult.find(u => u.email === 'test@example.com');
      expect(insertedUser).toBeDefined();

      // Test update
      const updateResult = await db.update('users')
        .set({ name: 'Updated User' })
        .where((user: any) => user.id === insertResult[0].id)
        .returning();

      expect(updateResult).toHaveLength(1);
      expect(updateResult[0].name).toBe('Updated User');
    });

    it('should handle complex queries with joins', async () => {
      const db = dbManager.getMockDb();
      
      // Test a query that would normally involve joins
      const result = await db.select()
        .from('plantInstances')
        .leftJoin('plants', () => true) // Simplified join condition
        .where((pi: any) => pi.userId === 1)
        .orderBy('createdAt', 'desc')
        .limit(10)
        .execute();

      expect(Array.isArray(result)).toBe(true);
    });

    it('should provide transaction support', async () => {
      const db = dbManager.getMockDb();
      
      const result = await db.transaction(async (tx: any) => {
        const user = await tx.insert('users').values({
          email: 'transaction@example.com',
          hashedPassword: 'hashed',
          name: 'Transaction User',
        }).returning();

        return user[0];
      });

      expect(result.email).toBe('transaction@example.com');
    });
  });

  describe('Test Data Factories', () => {
    it('should create realistic users', () => {
      const user = TestUserFactory.create();
      
      expect(user.email).toMatch(/testuser\d+@example\.com/);
      expect(user.hashedPassword).toMatch(/\$2b\$10\$hashedpassword\d+/);
      expect(user.name).toMatch(/Test User \d+/);
      expect(user.isCurator).toBe(false);
      expect(user.createdAt).toBeInstanceOf(Date);
    });

    it('should create realistic plants', () => {
      const plant = TestPlantFactory.create();
      
      expect(plant.family).toBeDefined();
      expect(plant.genus).toBeDefined();
      expect(plant.species).toBeDefined();
      expect(plant.commonName).toBeDefined();
      expect(typeof plant.isVerified).toBe('boolean');
    });

    it('should create specific plant types', () => {
      const monstera = TestPlantFactory.createMonstera();
      expect(monstera.genus).toBe('Monstera');
      expect(monstera.species).toBe('deliciosa');
      expect(monstera.family).toBe('Araceae');

      const philodendron = TestPlantFactory.createPhilodendron();
      expect(philodendron.genus).toBe('Philodendron');
      expect(philodendron.species).toBe('hederaceum');

      const snakePlant = TestPlantFactory.createSnakePlant();
      expect(snakePlant.genus).toBe('Sansevieria');
      expect(snakePlant.species).toBe('trifasciata');
    });

    it('should create realistic plant instances', () => {
      const instance = TestPlantInstanceFactory.create();
      
      expect(instance.nickname).toBeDefined();
      expect(instance.location).toBeDefined();
      expect(instance.fertilizerSchedule).toBeDefined();
      expect(typeof instance.isActive).toBe('boolean');
      expect(instance.createdAt).toBeInstanceOf(Date);
    });

    it('should create plant instances with specific care needs', () => {
      const needsCare = TestPlantInstanceFactory.createWithCareNeeded();
      expect(needsCare.fertilizerDue).toBeDefined();
      expect(needsCare.fertilizerDue!.getTime()).toBeLessThan(Date.now());

      const recentlyFertilized = TestPlantInstanceFactory.createRecentlyFertilized();
      expect(recentlyFertilized.fertilizerDue).toBeDefined();
      expect(recentlyFertilized.fertilizerDue!.getTime()).toBeGreaterThan(Date.now());
    });

    it('should create multiple items with unique IDs', () => {
      const users = TestUserFactory.createMany(3);
      expect(users).toHaveLength(3);
      
      const userIds = users.map(u => u.id);
      const uniqueIds = new Set(userIds);
      expect(uniqueIds.size).toBe(3); // All IDs should be unique
    });

    it('should reset counters properly', () => {
      TestUserFactory.reset();
      const user1 = TestUserFactory.create();
      expect(user1.id).toBe(1);
      
      const user2 = TestUserFactory.create();
      expect(user2.id).toBe(2);
    });
  });

  describe('Complete Dataset Factory', () => {
    it('should create a complete dataset with relationships', () => {
      const dataset = TestDatasetFactory.createCompleteDataset({
        userCount: 2,
        plantCount: 5,
        instanceCount: 8,
        propagationCount: 3,
        careHistoryCount: 10,
      });

      expect(dataset.users).toHaveLength(2);
      expect(dataset.plants).toHaveLength(5);
      expect(dataset.plantInstances).toHaveLength(8);
      expect(dataset.propagations).toHaveLength(3);
      expect(dataset.careHistory).toHaveLength(10);

      // Check relationships
      dataset.plantInstances.forEach(instance => {
        expect(dataset.users.some(u => u.id === instance.userId)).toBe(true);
        expect(dataset.plants.some(p => p.id === instance.plantId)).toBe(true);
      });

      dataset.propagations.forEach(propagation => {
        expect(dataset.users.some(u => u.id === propagation.userId)).toBe(true);
        expect(dataset.plants.some(p => p.id === propagation.plantId)).toBe(true);
      });
    });

    it('should create a minimal dataset', () => {
      const dataset = TestDatasetFactory.createMinimalDataset();
      
      expect(dataset.users).toHaveLength(1);
      expect(dataset.plants).toHaveLength(3);
      expect(dataset.plantInstances).toHaveLength(5);
      expect(dataset.propagations).toHaveLength(2);
      expect(dataset.careHistory).toHaveLength(8);
    });
  });

  describe('Database Manager Helper Methods', () => {
    it('should provide table data access', () => {
      const users = dbManager.getTableData('users');
      expect(Array.isArray(users)).toBe(true);
      expect(users.length).toBeGreaterThan(0);
    });

    it('should provide record counting', () => {
      const userCount = dbManager.countRecords('users');
      expect(typeof userCount).toBe('number');
      expect(userCount).toBeGreaterThan(0);

      const activeUserCount = dbManager.countRecords('users', (user: any) => user.isActive !== false);
      expect(activeUserCount).toBeGreaterThanOrEqual(0);
    });

    it('should provide record lookup by ID', () => {
      const users = dbManager.getTableData('users');
      if (users.length > 0) {
        const firstUser = users[0];
        const foundUser = dbManager.getRecordById('users', firstUser.id);
        expect(foundUser).toEqual(firstUser);
      }
    });

    it('should handle data clearing and seeding', async () => {
      // Clear all data
      await dbManager.clearTestData();
      
      const emptyUsers = dbManager.getTableData('users');
      expect(emptyUsers).toHaveLength(0);

      // Seed new data
      const newDataset = TestDatasetFactory.createMinimalDataset();
      await dbManager.seedTestData(newDataset);

      const seededUsers = dbManager.getTableData('users');
      expect(seededUsers.length).toBe(newDataset.users.length);
    });
  });

  describe('Mock Drizzle ORM Compatibility', () => {
    it('should work with Drizzle-style queries', async () => {
      const db = dbManager.getMockDb();
      
      // Test chained query builder pattern
      const query = db.select()
        .from('plantInstances')
        .where((pi: any) => pi.isActive === true)
        .orderBy('createdAt', 'desc')
        .limit(5);

      const result = await query.execute();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should support insert with returning', async () => {
      const db = dbManager.getMockDb();
      
      const result = await db.insert('plants')
        .values({
          family: 'Araceae',
          genus: 'Monstera',
          species: 'deliciosa',
          commonName: 'Swiss Cheese Plant',
          isVerified: true,
        })
        .returning();

      expect(result).toHaveLength(1);
      expect(result[0].genus).toBe('Monstera');
      expect(result[0].id).toBeDefined();
    });

    it('should support update with where clause', async () => {
      const db = dbManager.getMockDb();
      
      // First insert a record
      const inserted = await db.insert('plants')
        .values({
          family: 'Araceae',
          genus: 'Philodendron',
          species: 'hederaceum',
          commonName: 'Heart Leaf Philodendron',
          isVerified: false,
        })
        .returning();

      // Then update it
      const updated = await db.update('plants')
        .set({ isVerified: true })
        .where((plant: any) => plant.id === inserted[0].id)
        .returning();

      expect(updated).toHaveLength(1);
      expect(updated[0].isVerified).toBe(true);
    });
  });
});