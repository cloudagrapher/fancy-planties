/**
 * Care Data Database Query Tests
 * Tests care record creation, retrieval, care history aggregation, and statistics
 */

import { CareHistoryQueries } from '../../lib/db/queries/care-history';
import { PlantQueries } from '../../lib/db/queries/plants';
import { PlantInstanceQueries } from '../../lib/db/queries/plant-instances';
import { createDatabaseTestManager } from '../../test-utils/setup/database-test-manager';
import { 
  createTestCareRecord,
  createTestFertilizerRecord,
  createTestWateringRecord,
  createTestRepottingRecord,
  createTestCareHistory,
  createRealisticCareSchedule,
  resetCareCounter
} from '../../test-utils/factories/care-factory';
import { createTestUser, resetUserCounter } from '../../test-utils/factories/user-factory';
import { createTestPlant, createTestPlantInstance, resetPlantCounters } from '../../test-utils/factories/plant-factory';

describe('Care Data Database Queries', () => {
  let dbManager;

  beforeEach(() => {
    dbManager = createDatabaseTestManager();
    resetCareCounter();
    resetUserCounter();
    resetPlantCounters();
  });

  afterEach(async () => {
    await dbManager.cleanup();
  });

  describe('Care Record CRUD Operations', () => {
    test('should create a new care record', async () => {
      const testUser = createTestUser();
      const createdUser = await dbManager.createTestUser(testUser);

      const plant = createTestPlant({ createdBy: createdUser.id });
      const createdPlant = await dbManager.createTestPlant(plant);

      const plantInstance = createTestPlantInstance({
        userId: createdUser.id,
        plantId: createdPlant.id,
      });
      const createdInstance = await dbManager.createTestPlantInstance(plantInstance);

      const careData = {
        userId: createdUser.id,
        plantInstanceId: createdInstance.id,
        careType: 'fertilizer',
        careDate: new Date(),
        notes: 'Applied balanced liquid fertilizer',
        fertilizerType: 'Balanced liquid fertilizer (10-10-10)',
        images: [],
      };

      const careRecord = await CareHistoryQueries.createCareHistory(careData);

      expect(careRecord).toBeDefined();
      expect(careRecord.id).toBeDefined();
      expect(careRecord.userId).toBe(createdUser.id);
      expect(careRecord.plantInstanceId).toBe(createdInstance.id);
      expect(careRecord.careType).toBe('fertilizer');
      expect(careRecord.notes).toBe('Applied balanced liquid fertilizer');
      expect(careRecord.fertilizerType).toBe('Balanced liquid fertilizer (10-10-10)');
      expect(careRecord.createdAt).toBeInstanceOf(Date);
      expect(careRecord.updatedAt).toBeInstanceOf(Date);
    });

    test('should retrieve care record by ID', async () => {
      const testUser = createTestUser();
      const createdUser = await dbManager.createTestUser(testUser);

      const plant = createTestPlant({ createdBy: createdUser.id });
      const createdPlant = await dbManager.createTestPlant(plant);

      const plantInstance = createTestPlantInstance({
        userId: createdUser.id,
        plantId: createdPlant.id,
      });
      const createdInstance = await dbManager.createTestPlantInstance(plantInstance);

      const careData = createTestCareRecord({
        userId: createdUser.id,
        plantInstanceId: createdInstance.id,
      });

      const createdCare = await CareHistoryQueries.createCareHistory(careData);
      const foundCare = await CareHistoryQueries.getCareHistoryById(createdCare.id);

      expect(foundCare).toBeDefined();
      expect(foundCare.id).toBe(createdCare.id);
      expect(foundCare.careType).toBe(createdCare.careType);
      expect(foundCare.notes).toBe(createdCare.notes);
    });

    test('should return null for non-existent care record ID', async () => {
      const careRecord = await CareHistoryQueries.getCareHistoryById(99999);
      expect(careRecord).toBeNull();
    });

    test('should update care record', async () => {
      const testUser = createTestUser();
      const createdUser = await dbManager.createTestUser(testUser);

      const plant = createTestPlant({ createdBy: createdUser.id });
      const createdPlant = await dbManager.createTestPlant(plant);

      const plantInstance = createTestPlantInstance({
        userId: createdUser.id,
        plantId: createdPlant.id,
      });
      const createdInstance = await dbManager.createTestPlantInstance(plantInstance);

      const careData = createTestCareRecord({
        userId: createdUser.id,
        plantInstanceId: createdInstance.id,
      });

      const createdCare = await CareHistoryQueries.createCareHistory(careData);

      const updates = {
        notes: 'Updated care notes',
        fertilizerType: 'Updated fertilizer type',
      };

      const updatedCare = await CareHistoryQueries.updateCareHistory(
        createdCare.id,
        createdUser.id,
        updates
      );

      expect(updatedCare).toBeDefined();
      expect(updatedCare.notes).toBe('Updated care notes');
      expect(updatedCare.fertilizerType).toBe('Updated fertilizer type');
      expect(updatedCare.updatedAt.getTime()).toBeGreaterThan(createdCare.updatedAt.getTime());
    });

    test('should delete care record', async () => {
      const testUser = createTestUser();
      const createdUser = await dbManager.createTestUser(testUser);

      const plant = createTestPlant({ createdBy: createdUser.id });
      const createdPlant = await dbManager.createTestPlant(plant);

      const plantInstance = createTestPlantInstance({
        userId: createdUser.id,
        plantId: createdPlant.id,
      });
      const createdInstance = await dbManager.createTestPlantInstance(plantInstance);

      const careData = createTestCareRecord({
        userId: createdUser.id,
        plantInstanceId: createdInstance.id,
      });

      const createdCare = await CareHistoryQueries.createCareHistory(careData);

      const deleted = await CareHistoryQueries.deleteCareHistory(createdCare.id, createdUser.id);
      expect(deleted).toBe(true);

      const foundCare = await CareHistoryQueries.getCareHistoryById(createdCare.id);
      expect(foundCare).toBeNull();
    });
  });

  describe('Care History Retrieval and Filtering', () => {
    test('should get care history for a specific plant instance', async () => {
      const testUser = createTestUser();
      const createdUser = await dbManager.createTestUser(testUser);

      const plant = createTestPlant({ createdBy: createdUser.id });
      const createdPlant = await dbManager.createTestPlant(plant);

      const plantInstance = createTestPlantInstance({
        userId: createdUser.id,
        plantId: createdPlant.id,
      });
      const createdInstance = await dbManager.createTestPlantInstance(plantInstance);

      // Create multiple care records
      const careRecords = [
        createTestCareRecord({
          userId: createdUser.id,
          plantInstanceId: createdInstance.id,
          careType: 'fertilizer',
        }),
        createTestCareRecord({
          userId: createdUser.id,
          plantInstanceId: createdInstance.id,
          careType: 'water',
        }),
        createTestCareRecord({
          userId: createdUser.id,
          plantInstanceId: createdInstance.id,
          careType: 'prune',
        }),
      ];

      for (const care of careRecords) {
        await CareHistoryQueries.createCareHistory(care);
      }

      const history = await CareHistoryQueries.getCareHistoryForPlant(
        createdInstance.id,
        createdUser.id
      );

      expect(history.length).toBe(3);
      expect(history.every(h => h.plantInstanceId === createdInstance.id)).toBe(true);
      expect(history.every(h => h.userId === createdUser.id)).toBe(true);
    });

    test('should filter care history by care type', async () => {
      const testUser = createTestUser();
      const createdUser = await dbManager.createTestUser(testUser);

      const plant = createTestPlant({ createdBy: createdUser.id });
      const createdPlant = await dbManager.createTestPlant(plant);

      const plantInstance = createTestPlantInstance({
        userId: createdUser.id,
        plantId: createdPlant.id,
      });
      const createdInstance = await dbManager.createTestPlantInstance(plantInstance);

      // Create care records of different types
      const fertilizerCare = createTestCareRecord({
        userId: createdUser.id,
        plantInstanceId: createdInstance.id,
        careType: 'fertilizer',
      });

      const waterCare = createTestCareRecord({
        userId: createdUser.id,
        plantInstanceId: createdInstance.id,
        careType: 'water',
      });

      await CareHistoryQueries.createCareHistory(fertilizerCare);
      await CareHistoryQueries.createCareHistory(waterCare);

      // Filter by fertilizer type
      const fertilizerHistory = await CareHistoryQueries.getCareHistoryForPlant(
        createdInstance.id,
        createdUser.id,
        { careType: 'fertilizer' }
      );

      expect(fertilizerHistory.length).toBe(1);
      expect(fertilizerHistory[0].careType).toBe('fertilizer');
    });

    test('should filter care history by date range', async () => {
      const testUser = createTestUser();
      const createdUser = await dbManager.createTestUser(testUser);

      const plant = createTestPlant({ createdBy: createdUser.id });
      const createdPlant = await dbManager.createTestPlant(plant);

      const plantInstance = createTestPlantInstance({
        userId: createdUser.id,
        plantId: createdPlant.id,
      });
      const createdInstance = await dbManager.createTestPlantInstance(plantInstance);

      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

      // Create care records with different dates
      const recentCare = createTestCareRecord({
        userId: createdUser.id,
        plantInstanceId: createdInstance.id,
        careDate: now,
      });

      const oldCare = createTestCareRecord({
        userId: createdUser.id,
        plantInstanceId: createdInstance.id,
        careDate: twoWeeksAgo,
      });

      await CareHistoryQueries.createCareHistory(recentCare);
      await CareHistoryQueries.createCareHistory(oldCare);

      // Filter by date range (last week)
      const recentHistory = await CareHistoryQueries.getCareHistoryForPlant(
        createdInstance.id,
        createdUser.id,
        { 
          startDate: oneWeekAgo,
          endDate: now 
        }
      );

      expect(recentHistory.length).toBe(1);
      expect(recentHistory[0].careDate.getTime()).toBeGreaterThanOrEqual(oneWeekAgo.getTime());
    });

    test('should get recent care history for user', async () => {
      const testUser = createTestUser();
      const createdUser = await dbManager.createTestUser(testUser);

      const plant = createTestPlant({ createdBy: createdUser.id });
      const createdPlant = await dbManager.createTestPlant(plant);

      // Create multiple plant instances
      const instance1 = createTestPlantInstance({
        userId: createdUser.id,
        plantId: createdPlant.id,
      });
      const instance2 = createTestPlantInstance({
        userId: createdUser.id,
        plantId: createdPlant.id,
      });

      const createdInstance1 = await dbManager.createTestPlantInstance(instance1);
      const createdInstance2 = await dbManager.createTestPlantInstance(instance2);

      // Create care records for both instances
      const care1 = createTestCareRecord({
        userId: createdUser.id,
        plantInstanceId: createdInstance1.id,
      });

      const care2 = createTestCareRecord({
        userId: createdUser.id,
        plantInstanceId: createdInstance2.id,
      });

      await CareHistoryQueries.createCareHistory(care1);
      await CareHistoryQueries.createCareHistory(care2);

      const recentHistory = await CareHistoryQueries.getRecentCareHistory(createdUser.id, 10);

      expect(recentHistory.length).toBe(2);
      expect(recentHistory.every(h => h.userId === createdUser.id)).toBe(true);
      // Should be sorted by date (most recent first)
      expect(recentHistory[0].careDate.getTime()).toBeGreaterThanOrEqual(recentHistory[1].careDate.getTime());
    });
  });

  describe('Care Statistics and Aggregation', () => {
    test('should get care history count for plant instance', async () => {
      const testUser = createTestUser();
      const createdUser = await dbManager.createTestUser(testUser);

      const plant = createTestPlant({ createdBy: createdUser.id });
      const createdPlant = await dbManager.createTestPlant(plant);

      const plantInstance = createTestPlantInstance({
        userId: createdUser.id,
        plantId: createdPlant.id,
      });
      const createdInstance = await dbManager.createTestPlantInstance(plantInstance);

      // Create multiple care records
      const careRecords = [
        createTestCareRecord({
          userId: createdUser.id,
          plantInstanceId: createdInstance.id,
          careType: 'fertilizer',
        }),
        createTestCareRecord({
          userId: createdUser.id,
          plantInstanceId: createdInstance.id,
          careType: 'fertilizer',
        }),
        createTestCareRecord({
          userId: createdUser.id,
          plantInstanceId: createdInstance.id,
          careType: 'water',
        }),
      ];

      for (const care of careRecords) {
        await CareHistoryQueries.createCareHistory(care);
      }

      // Get total count
      const totalCount = await CareHistoryQueries.getCareHistoryCount(
        createdInstance.id,
        createdUser.id
      );
      expect(totalCount).toBe(3);

      // Get count by care type
      const fertilizerCount = await CareHistoryQueries.getCareHistoryCount(
        createdInstance.id,
        createdUser.id,
        'fertilizer'
      );
      expect(fertilizerCount).toBe(2);

      const waterCount = await CareHistoryQueries.getCareHistoryCount(
        createdInstance.id,
        createdUser.id,
        'water'
      );
      expect(waterCount).toBe(1);
    });

    test('should get last care date for specific care type', async () => {
      const testUser = createTestUser();
      const createdUser = await dbManager.createTestUser(testUser);

      const plant = createTestPlant({ createdBy: createdUser.id });
      const createdPlant = await dbManager.createTestPlant(plant);

      const plantInstance = createTestPlantInstance({
        userId: createdUser.id,
        plantId: createdPlant.id,
      });
      const createdInstance = await dbManager.createTestPlantInstance(plantInstance);

      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Create care records with different dates
      const oldFertilizer = createTestCareRecord({
        userId: createdUser.id,
        plantInstanceId: createdInstance.id,
        careType: 'fertilizer',
        careDate: yesterday,
      });

      const recentFertilizer = createTestCareRecord({
        userId: createdUser.id,
        plantInstanceId: createdInstance.id,
        careType: 'fertilizer',
        careDate: now,
      });

      await CareHistoryQueries.createCareHistory(oldFertilizer);
      await CareHistoryQueries.createCareHistory(recentFertilizer);

      const lastFertilizerDate = await CareHistoryQueries.getLastCareDate(
        createdInstance.id,
        createdUser.id,
        'fertilizer'
      );

      expect(lastFertilizerDate).toBeDefined();
      expect(lastFertilizerDate.getTime()).toBe(now.getTime());
    });

    test('should return null for care type with no history', async () => {
      const testUser = createTestUser();
      const createdUser = await dbManager.createTestUser(testUser);

      const plant = createTestPlant({ createdBy: createdUser.id });
      const createdPlant = await dbManager.createTestPlant(plant);

      const plantInstance = createTestPlantInstance({
        userId: createdUser.id,
        plantId: createdPlant.id,
      });
      const createdInstance = await dbManager.createTestPlantInstance(plantInstance);

      const lastRepotDate = await CareHistoryQueries.getLastCareDate(
        createdInstance.id,
        createdUser.id,
        'repot'
      );

      expect(lastRepotDate).toBeNull();
    });

    test('should get care dashboard data for user', async () => {
      const testUser = createTestUser();
      const createdUser = await dbManager.createTestUser(testUser);

      const plant = createTestPlant({ createdBy: createdUser.id });
      const createdPlant = await dbManager.createTestPlant(plant);

      // Create plant instances with different care statuses
      const overdueInstance = createTestPlantInstance({
        userId: createdUser.id,
        plantId: createdPlant.id,
        fertilizerDue: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day overdue
        isActive: true,
      });

      const dueTodayInstance = createTestPlantInstance({
        userId: createdUser.id,
        plantId: createdPlant.id,
        fertilizerDue: new Date(), // Due today
        isActive: true,
      });

      const dueSoonInstance = createTestPlantInstance({
        userId: createdUser.id,
        plantId: createdPlant.id,
        fertilizerDue: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // Due in 3 days
        isActive: true,
      });

      await dbManager.createTestPlantInstance(overdueInstance);
      await dbManager.createTestPlantInstance(dueTodayInstance);
      await dbManager.createTestPlantInstance(dueSoonInstance);

      const dashboardData = await CareHistoryQueries.getCareDashboardData(createdUser.id);

      expect(dashboardData).toBeDefined();
      expect(dashboardData.statistics).toBeDefined();
      expect(dashboardData.statistics.totalActivePlants).toBe(3);
      expect(dashboardData.overdue.length).toBeGreaterThanOrEqual(1);
      expect(dashboardData.dueToday.length).toBeGreaterThanOrEqual(1);
      expect(dashboardData.dueSoon.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Bulk Operations', () => {
    test('should bulk create care history entries', async () => {
      const testUser = createTestUser();
      const createdUser = await dbManager.createTestUser(testUser);

      const plant = createTestPlant({ createdBy: createdUser.id });
      const createdPlant = await dbManager.createTestPlant(plant);

      const plantInstance = createTestPlantInstance({
        userId: createdUser.id,
        plantId: createdPlant.id,
      });
      const createdInstance = await dbManager.createTestPlantInstance(plantInstance);

      const careEntries = [
        {
          userId: createdUser.id,
          plantInstanceId: createdInstance.id,
          careType: 'fertilizer',
          careDate: new Date(),
          notes: 'Bulk fertilizer 1',
        },
        {
          userId: createdUser.id,
          plantInstanceId: createdInstance.id,
          careType: 'water',
          careDate: new Date(),
          notes: 'Bulk water 1',
        },
        {
          userId: createdUser.id,
          plantInstanceId: createdInstance.id,
          careType: 'prune',
          careDate: new Date(),
          notes: 'Bulk prune 1',
        },
      ];

      const createdEntries = await CareHistoryQueries.bulkCreateCareHistory(careEntries);

      expect(createdEntries.length).toBe(3);
      expect(createdEntries.every(entry => entry.id)).toBe(true);
      expect(createdEntries.every(entry => entry.userId === createdUser.id)).toBe(true);
    });

    test('should handle empty bulk create gracefully', async () => {
      const result = await CareHistoryQueries.bulkCreateCareHistory([]);
      expect(result).toEqual([]);
    });

    test('should get care history for multiple plant instances', async () => {
      const testUser = createTestUser();
      const createdUser = await dbManager.createTestUser(testUser);

      const plant = createTestPlant({ createdBy: createdUser.id });
      const createdPlant = await dbManager.createTestPlant(plant);

      // Create multiple plant instances
      const instance1 = createTestPlantInstance({
        userId: createdUser.id,
        plantId: createdPlant.id,
      });
      const instance2 = createTestPlantInstance({
        userId: createdUser.id,
        plantId: createdPlant.id,
      });

      const createdInstance1 = await dbManager.createTestPlantInstance(instance1);
      const createdInstance2 = await dbManager.createTestPlantInstance(instance2);

      // Create care records for both instances
      const care1 = createTestCareRecord({
        userId: createdUser.id,
        plantInstanceId: createdInstance1.id,
      });

      const care2 = createTestCareRecord({
        userId: createdUser.id,
        plantInstanceId: createdInstance2.id,
      });

      await CareHistoryQueries.createCareHistory(care1);
      await CareHistoryQueries.createCareHistory(care2);

      const plantInstanceIds = [createdInstance1.id, createdInstance2.id];
      const history = await CareHistoryQueries.getCareHistoryForPlants(
        plantInstanceIds,
        createdUser.id
      );

      expect(history.length).toBe(2);
      expect(history.every(h => plantInstanceIds.includes(h.plantInstanceId))).toBe(true);
    });
  });

  describe('Care Type Specific Operations', () => {
    test('should create fertilizer care record with specific data', async () => {
      const testUser = createTestUser();
      const createdUser = await dbManager.createTestUser(testUser);

      const plant = createTestPlant({ createdBy: createdUser.id });
      const createdPlant = await dbManager.createTestPlant(plant);

      const plantInstance = createTestPlantInstance({
        userId: createdUser.id,
        plantId: createdPlant.id,
      });
      const createdInstance = await dbManager.createTestPlantInstance(plantInstance);

      const fertilizerCare = {
        userId: createdUser.id,
        plantInstanceId: createdInstance.id,
        careType: 'fertilizer',
        careDate: new Date(),
        notes: 'Applied balanced liquid fertilizer at half strength',
        fertilizerType: 'Balanced liquid fertilizer (10-10-10)',
        images: [],
      };

      const createdCare = await CareHistoryQueries.createCareHistory(fertilizerCare);

      expect(createdCare.careType).toBe('fertilizer');
      expect(createdCare.fertilizerType).toBe('Balanced liquid fertilizer (10-10-10)');
      expect(createdCare.potSize).toBeNull();
      expect(createdCare.soilType).toBeNull();
    });

    test('should create repotting care record with specific data', async () => {
      const testUser = createTestUser();
      const createdUser = await dbManager.createTestUser(testUser);

      const plant = createTestPlant({ createdBy: createdUser.id });
      const createdPlant = await dbManager.createTestPlant(plant);

      const plantInstance = createTestPlantInstance({
        userId: createdUser.id,
        plantId: createdPlant.id,
      });
      const createdInstance = await dbManager.createTestPlantInstance(plantInstance);

      const repotCare = {
        userId: createdUser.id,
        plantInstanceId: createdInstance.id,
        careType: 'repot',
        careDate: new Date(),
        notes: 'Repotted into larger container with fresh soil',
        potSize: '8 inch',
        soilType: 'Standard potting mix',
        images: [],
      };

      const createdCare = await CareHistoryQueries.createCareHistory(repotCare);

      expect(createdCare.careType).toBe('repot');
      expect(createdCare.potSize).toBe('8 inch');
      expect(createdCare.soilType).toBe('Standard potting mix');
      expect(createdCare.fertilizerType).toBeNull();
    });

    test('should create water care record', async () => {
      const testUser = createTestUser();
      const createdUser = await dbManager.createTestUser(testUser);

      const plant = createTestPlant({ createdBy: createdUser.id });
      const createdPlant = await dbManager.createTestPlant(plant);

      const plantInstance = createTestPlantInstance({
        userId: createdUser.id,
        plantId: createdPlant.id,
      });
      const createdInstance = await dbManager.createTestPlantInstance(plantInstance);

      const waterCare = {
        userId: createdUser.id,
        plantInstanceId: createdInstance.id,
        careType: 'water',
        careDate: new Date(),
        notes: 'Watered thoroughly until water drained from bottom',
        images: [],
      };

      const createdCare = await CareHistoryQueries.createCareHistory(waterCare);

      expect(createdCare.careType).toBe('water');
      expect(createdCare.notes).toBe('Watered thoroughly until water drained from bottom');
      expect(createdCare.fertilizerType).toBeNull();
      expect(createdCare.potSize).toBeNull();
      expect(createdCare.soilType).toBeNull();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle non-existent plant instance in care operations', async () => {
      const testUser = createTestUser();
      const createdUser = await dbManager.createTestUser(testUser);

      const careData = createTestCareRecord({
        userId: createdUser.id,
        plantInstanceId: 99999, // Non-existent
      });

      // Should not crash, but may fail due to foreign key constraint
      await expect(CareHistoryQueries.createCareHistory(careData))
        .rejects.toThrow();
    });

    test('should handle unauthorized care record access', async () => {
      const testUser1 = createTestUser();
      const testUser2 = createTestUser();
      const createdUser1 = await dbManager.createTestUser(testUser1);
      const createdUser2 = await dbManager.createTestUser(testUser2);

      const plant = createTestPlant({ createdBy: createdUser1.id });
      const createdPlant = await dbManager.createTestPlant(plant);

      const plantInstance = createTestPlantInstance({
        userId: createdUser1.id,
        plantId: createdPlant.id,
      });
      const createdInstance = await dbManager.createTestPlantInstance(plantInstance);

      const careData = createTestCareRecord({
        userId: createdUser1.id,
        plantInstanceId: createdInstance.id,
      });

      const createdCare = await CareHistoryQueries.createCareHistory(careData);

      // User 2 should not be able to update User 1's care record
      const updatedCare = await CareHistoryQueries.updateCareHistory(
        createdCare.id,
        createdUser2.id, // Different user
        { notes: 'Unauthorized update' }
      );

      expect(updatedCare).toBeNull();
    });

    test('should handle invalid care type gracefully', async () => {
      const testUser = createTestUser();
      const createdUser = await dbManager.createTestUser(testUser);

      const plant = createTestPlant({ createdBy: createdUser.id });
      const createdPlant = await dbManager.createTestPlant(plant);

      const plantInstance = createTestPlantInstance({
        userId: createdUser.id,
        plantId: createdPlant.id,
      });
      const createdInstance = await dbManager.createTestPlantInstance(plantInstance);

      const careData = {
        userId: createdUser.id,
        plantInstanceId: createdInstance.id,
        careType: 'invalid_care_type', // Invalid
        careDate: new Date(),
        notes: 'Test notes',
      };

      // Should fail due to enum constraint
      await expect(CareHistoryQueries.createCareHistory(careData))
        .rejects.toThrow();
    });

    test('should handle empty care history queries', async () => {
      const testUser = createTestUser();
      const createdUser = await dbManager.createTestUser(testUser);

      const plant = createTestPlant({ createdBy: createdUser.id });
      const createdPlant = await dbManager.createTestPlant(plant);

      const plantInstance = createTestPlantInstance({
        userId: createdUser.id,
        plantId: createdPlant.id,
      });
      const createdInstance = await dbManager.createTestPlantInstance(plantInstance);

      // No care records created
      const history = await CareHistoryQueries.getCareHistoryForPlant(
        createdInstance.id,
        createdUser.id
      );

      expect(history).toEqual([]);

      const count = await CareHistoryQueries.getCareHistoryCount(
        createdInstance.id,
        createdUser.id
      );

      expect(count).toBe(0);
    });
  });

  describe('Performance and Concurrency', () => {
    test('should handle concurrent care record creation', async () => {
      const testUser = createTestUser();
      const createdUser = await dbManager.createTestUser(testUser);

      const plant = createTestPlant({ createdBy: createdUser.id });
      const createdPlant = await dbManager.createTestPlant(plant);

      const plantInstance = createTestPlantInstance({
        userId: createdUser.id,
        plantId: createdPlant.id,
      });
      const createdInstance = await dbManager.createTestPlantInstance(plantInstance);

      // Create multiple care records concurrently
      const carePromises = Array.from({ length: 5 }, (_, index) => {
        const careData = createTestCareRecord({
          userId: createdUser.id,
          plantInstanceId: createdInstance.id,
          notes: `Concurrent care ${index}`,
        });
        return CareHistoryQueries.createCareHistory(careData);
      });

      const careRecords = await Promise.all(carePromises);
      expect(careRecords.length).toBe(5);
      expect(careRecords.every(c => c.id)).toBe(true);
    });

    test('should handle large care history efficiently', async () => {
      const testUser = createTestUser();
      const createdUser = await dbManager.createTestUser(testUser);

      const plant = createTestPlant({ createdBy: createdUser.id });
      const createdPlant = await dbManager.createTestPlant(plant);

      const plantInstance = createTestPlantInstance({
        userId: createdUser.id,
        plantId: createdPlant.id,
      });
      const createdInstance = await dbManager.createTestPlantInstance(plantInstance);

      // Create many care records
      const careEntries = Array.from({ length: 50 }, (_, index) => ({
        userId: createdUser.id,
        plantInstanceId: createdInstance.id,
        careType: 'water',
        careDate: new Date(Date.now() - index * 24 * 60 * 60 * 1000), // One per day
        notes: `Daily water ${index}`,
      }));

      await CareHistoryQueries.bulkCreateCareHistory(careEntries);

      const startTime = Date.now();
      const history = await CareHistoryQueries.getCareHistoryForPlant(
        createdInstance.id,
        createdUser.id,
        { limit: 20 }
      );
      const queryTime = Date.now() - startTime;

      expect(history.length).toBe(20);
      expect(queryTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});