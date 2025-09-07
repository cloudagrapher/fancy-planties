import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { PropagationQueries } from '../propagations';
import { db } from '../../index';
import { users, plants, plantInstances, propagations, sessions } from '../../schema';
import type { NewUser, NewPlant, NewPlantInstance, NewPropagation } from '../../schema';

describe('PropagationQueries', () => {
  let testUser: { id: number };
  let testPlant: { id: number };
  let testPlantInstance: { id: number };

  beforeEach(async () => {
    // Clean up any existing test data
    await db.delete(propagations);
    await db.delete(plantInstances);
    await db.delete(plants);
    await db.delete(sessions);
    await db.delete(users);

    // Create test user
    const userData: NewUser = {
      email: 'test@example.com',
      hashedPassword: 'hashedpassword',
      name: 'Test User',
    };
    const [user] = await db.insert(users).values(userData).returning();
    testUser = user;

    // Create test plant
    const plantData: NewPlant = {
      family: 'Araceae',
      genus: 'Monstera',
      species: 'deliciosa',
      commonName: 'Swiss Cheese Plant',
      isVerified: true,
    };
    const [plant] = await db.insert(plants).values(plantData).returning();
    testPlant = plant;

    // Create test plant instance
    const instanceData: NewPlantInstance = {
      userId: testUser.id,
      plantId: testPlant.id,
      nickname: 'My Monstera',
      location: 'Living Room',
      fertilizerSchedule: '2 weeks',
      isActive: true,
    };
    const [instance] = await db.insert(plantInstances).values(instanceData).returning();
    testPlantInstance = instance;
  });

  afterEach(async () => {
    // Clean up test data
    await db.delete(propagations);
    await db.delete(plantInstances);
    await db.delete(plants);
    await db.delete(sessions);
    await db.delete(users);
  });

  describe('create', () => {
    it('should create a new propagation', async () => {
      const propagationData: NewPropagation = {
        userId: testUser.id,
        plantId: testPlant.id,
        parentInstanceId: testPlantInstance.id,
        nickname: 'Monstera Cutting #1',
        location: 'Propagation Station',
        dateStarted: new Date(),
        status: 'started',
        notes: 'First cutting attempt',
        images: [],
      };

      const result = await PropagationQueries.create(propagationData);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.nickname).toBe('Monstera Cutting #1');
      expect(result.status).toBe('started');
      expect(result.userId).toBe(testUser.id);
      expect(result.plantId).toBe(testPlant.id);
      expect(result.parentInstanceId).toBe(testPlantInstance.id);
    });

    it('should create a propagation without parent instance', async () => {
      const propagationData: NewPropagation = {
        userId: testUser.id,
        plantId: testPlant.id,
        parentInstanceId: null,
        nickname: 'Store-bought Cutting',
        location: 'Kitchen Window',
        dateStarted: new Date(),
        status: 'started',
        notes: 'Purchased from nursery',
        images: [],
      };

      const result = await PropagationQueries.create(propagationData);

      expect(result).toBeDefined();
      expect(result.parentInstanceId).toBeNull();
      expect(result.nickname).toBe('Store-bought Cutting');
    });
  });

  describe('getById', () => {
    it('should get propagation by ID with related data', async () => {
      // Create a propagation first
      const propagationData: NewPropagation = {
        userId: testUser.id,
        plantId: testPlant.id,
        parentInstanceId: testPlantInstance.id,
        nickname: 'Test Propagation',
        location: 'Test Location',
        dateStarted: new Date(),
        status: 'rooting',
        notes: 'Test notes',
        images: ['test-image.jpg'],
      };

      const created = await PropagationQueries.create(propagationData);
      const result = await PropagationQueries.getById(created.id);

      expect(result).toBeDefined();
      expect(result!.id).toBe(created.id);
      expect(result!.plant).toBeDefined();
      expect(result!.plant.genus).toBe('Monstera');
      expect(result!.parentInstance).toBeDefined();
      expect(result!.parentInstance!.nickname).toBe('My Monstera');
    });

    it('should return null for non-existent propagation', async () => {
      const result = await PropagationQueries.getById(99999);
      expect(result).toBeNull();
    });
  });

  describe('getByUserId', () => {
    it('should get all propagations for a user', async () => {
      // Create multiple propagations
      const propagation1: NewPropagation = {
        userId: testUser.id,
        plantId: testPlant.id,
        parentInstanceId: testPlantInstance.id,
        nickname: 'Propagation 1',
        location: 'Location 1',
        dateStarted: new Date('2024-01-01'),
        status: 'started',
        notes: 'First propagation',
        images: [],
      };

      const propagation2: NewPropagation = {
        userId: testUser.id,
        plantId: testPlant.id,
        parentInstanceId: null,
        nickname: 'Propagation 2',
        location: 'Location 2',
        dateStarted: new Date('2024-01-02'),
        status: 'rooting',
        notes: 'Second propagation',
        images: [],
      };

      await PropagationQueries.create(propagation1);
      await PropagationQueries.create(propagation2);

      const results = await PropagationQueries.getByUserId(testUser.id);

      expect(results).toHaveLength(2);
      expect(results[0].nickname).toBe('Propagation 2'); // Should be ordered by dateStarted desc
      expect(results[1].nickname).toBe('Propagation 1');
      expect(results.every(p => p.plant)).toBe(true); // All should have plant data
    });

    it('should return empty array for user with no propagations', async () => {
      const results = await PropagationQueries.getByUserId(testUser.id);
      expect(results).toHaveLength(0);
    });
  });

  describe('getByStatus', () => {
    it('should get propagations by status', async () => {
      // Create propagations with different statuses
      const startedProp: NewPropagation = {
        userId: testUser.id,
        plantId: testPlant.id,
        parentInstanceId: null,
        nickname: 'Started Prop',
        location: 'Location 1',
        dateStarted: new Date(),
        status: 'started',
        notes: 'Started propagation',
        images: [],
      };

      const rootingProp: NewPropagation = {
        userId: testUser.id,
        plantId: testPlant.id,
        parentInstanceId: null,
        nickname: 'Rooting Prop',
        location: 'Location 2',
        dateStarted: new Date(),
        status: 'rooting',
        notes: 'Rooting propagation',
        images: [],
      };

      await PropagationQueries.create(startedProp);
      await PropagationQueries.create(rootingProp);

      const startedResults = await PropagationQueries.getByStatus(testUser.id, 'started');
      const rootingResults = await PropagationQueries.getByStatus(testUser.id, 'rooting');

      expect(startedResults).toHaveLength(1);
      expect(startedResults[0].nickname).toBe('Started Prop');
      expect(rootingResults).toHaveLength(1);
      expect(rootingResults[0].nickname).toBe('Rooting Prop');
    });
  });

  describe('updateStatus', () => {
    it('should update propagation status with notes', async () => {
      const propagationData: NewPropagation = {
        userId: testUser.id,
        plantId: testPlant.id,
        parentInstanceId: null,
        nickname: 'Test Propagation',
        location: 'Test Location',
        dateStarted: new Date(),
        status: 'started',
        notes: 'Initial notes',
        images: [],
      };

      const created = await PropagationQueries.create(propagationData);
      const updated = await PropagationQueries.updateStatus(
        created.id,
        'rooting',
        'Roots are showing!'
      );

      expect(updated.status).toBe('rooting');
      expect(updated.notes).toContain('Roots are showing!');
      expect(updated.notes).toContain('Status changed to rooting');
    });

    it('should update status without additional notes', async () => {
      const propagationData: NewPropagation = {
        userId: testUser.id,
        plantId: testPlant.id,
        parentInstanceId: null,
        nickname: 'Test Propagation',
        location: 'Test Location',
        dateStarted: new Date(),
        status: 'started',
        notes: null,
        images: [],
      };

      const created = await PropagationQueries.create(propagationData);
      const updated = await PropagationQueries.updateStatus(created.id, 'rooting');

      expect(updated.status).toBe('rooting');
    });
  });

  describe('getStats', () => {
    it('should calculate propagation statistics', async () => {
      // Create propagations with different statuses
      const propagations = [
        {
          userId: testUser.id,
          plantId: testPlant.id,
          parentInstanceId: null,
          nickname: 'Prop 1',
          location: 'Location 1',
          dateStarted: new Date('2024-01-01'),
          status: 'started' as const,
          notes: null,
          images: [],
        },
        {
          userId: testUser.id,
          plantId: testPlant.id,
          parentInstanceId: null,
          nickname: 'Prop 2',
          location: 'Location 2',
          dateStarted: new Date('2024-01-02'),
          status: 'rooting' as const,
          notes: null,
          images: [],
        },
        {
          userId: testUser.id,
          plantId: testPlant.id,
          parentInstanceId: null,
          nickname: 'Prop 3',
          location: 'Location 3',
          dateStarted: new Date('2024-01-03'),
          status: 'established' as const,
          notes: null,
          images: [],
        },
      ];

      for (const prop of propagations) {
        await PropagationQueries.create(prop);
      }

      const stats = await PropagationQueries.getStats(testUser.id);

      expect(stats.totalPropagations).toBe(3);
      expect(stats.byStatus.started).toBe(1);
      expect(stats.byStatus.rooting).toBe(1);
      expect(stats.byStatus.established).toBe(1);
      expect(stats.successRate).toBeCloseTo(33.33, 1); // 1 established out of 3 total
    });

    it('should return zero stats for user with no propagations', async () => {
      const stats = await PropagationQueries.getStats(testUser.id);

      expect(stats.totalPropagations).toBe(0);
      expect(stats.byStatus.started).toBe(0);
      expect(stats.successRate).toBe(0);
      expect(stats.averageDaysToEstablished).toBe(0);
    });
  });

  describe('delete', () => {
    it('should delete a propagation', async () => {
      const propagationData: NewPropagation = {
        userId: testUser.id,
        plantId: testPlant.id,
        parentInstanceId: null,
        nickname: 'To Delete',
        location: 'Test Location',
        dateStarted: new Date(),
        status: 'started',
        notes: null,
        images: [],
      };

      const created = await PropagationQueries.create(propagationData);
      const deleteResult = await PropagationQueries.delete(created.id);

      expect(deleteResult).toBe(true);

      // Verify it's actually deleted
      const retrieved = await PropagationQueries.getById(created.id);
      expect(retrieved).toBeNull();
    });

    it('should return false for non-existent propagation', async () => {
      const result = await PropagationQueries.delete(99999);
      expect(result).toBe(false);
    });
  });
});