import { eq, and, desc, asc, isNull, isNotNull, lte, gte, ilike, or, sql } from 'drizzle-orm';
import { db } from '../index';
import { plantInstances, plants, type PlantInstance, type NewPlantInstance } from '../schema';

// Plant instance CRUD operations
export class PlantInstanceQueries {
  // Create a new plant instance
  static async create(instanceData: NewPlantInstance): Promise<PlantInstance> {
    try {
      const [instance] = await db.insert(plantInstances).values(instanceData).returning();
      return instance;
    } catch (error) {
      console.error('Failed to create plant instance:', error);
      throw new Error('Failed to create plant instance');
    }
  }

  // Get plant instance by ID with plant taxonomy data
  static async getById(id: number): Promise<(PlantInstance & { plant: typeof plants.$inferSelect }) | null> {
    try {
      const [instance] = await db
        .select()
        .from(plantInstances)
        .leftJoin(plants, eq(plantInstances.plantId, plants.id))
        .where(eq(plantInstances.id, id));
      
      if (!instance) return null;
      
      return {
        ...instance.plant_instances,
        plant: instance.plants!
      };
    } catch (error) {
      console.error('Failed to get plant instance by ID:', error);
      throw new Error('Failed to get plant instance');
    }
  }

  // Get all plant instances for a user
  static async getByUserId(userId: number, activeOnly: boolean = true): Promise<(PlantInstance & { plant: typeof plants.$inferSelect })[]> {
    try {
      const conditions = [eq(plantInstances.userId, userId)];
      if (activeOnly) {
        conditions.push(eq(plantInstances.isActive, true));
      }

      const instances = await db
        .select()
        .from(plantInstances)
        .leftJoin(plants, eq(plantInstances.plantId, plants.id))
        .where(and(...conditions))
        .orderBy(desc(plantInstances.createdAt));

      return instances.map(instance => ({
        ...instance.plant_instances,
        plant: instance.plants!
      }));
    } catch (error) {
      console.error('Failed to get plant instances by user ID:', error);
      throw new Error('Failed to get plant instances');
    }
  }

  // Get plant instances with overdue fertilizer
  static async getOverdueFertilizer(userId: number): Promise<(PlantInstance & { plant: typeof plants.$inferSelect })[]> {
    try {
      const now = new Date();
      const instances = await db
        .select()
        .from(plantInstances)
        .leftJoin(plants, eq(plantInstances.plantId, plants.id))
        .where(
          and(
            eq(plantInstances.userId, userId),
            eq(plantInstances.isActive, true),
            isNotNull(plantInstances.fertilizerDue),
            lte(plantInstances.fertilizerDue, now)
          )
        )
        .orderBy(asc(plantInstances.fertilizerDue));

      return instances.map(instance => ({
        ...instance.plant_instances,
        plant: instance.plants!
      }));
    } catch (error) {
      console.error('Failed to get overdue fertilizer instances:', error);
      throw new Error('Failed to get overdue fertilizer instances');
    }
  }

  // Get plant instances with fertilizer due soon
  static async getFertilizerDueSoon(userId: number, daysAhead: number = 7): Promise<(PlantInstance & { plant: typeof plants.$inferSelect })[]> {
    try {
      const now = new Date();
      const futureDate = new Date();
      futureDate.setDate(now.getDate() + daysAhead);

      const instances = await db
        .select()
        .from(plantInstances)
        .leftJoin(plants, eq(plantInstances.plantId, plants.id))
        .where(
          and(
            eq(plantInstances.userId, userId),
            eq(plantInstances.isActive, true),
            isNotNull(plantInstances.fertilizerDue),
            gte(plantInstances.fertilizerDue, now),
            lte(plantInstances.fertilizerDue, futureDate)
          )
        )
        .orderBy(asc(plantInstances.fertilizerDue));

      return instances.map(instance => ({
        ...instance.plant_instances,
        plant: instance.plants!
      }));
    } catch (error) {
      console.error('Failed to get fertilizer due soon instances:', error);
      throw new Error('Failed to get fertilizer due soon instances');
    }
  }

  // Search plant instances by nickname, location, or notes
  static async search(userId: number, query: string): Promise<(PlantInstance & { plant: typeof plants.$inferSelect })[]> {
    try {
      const searchTerm = `%${query.toLowerCase()}%`;
      
      const instances = await db
        .select()
        .from(plantInstances)
        .leftJoin(plants, eq(plantInstances.plantId, plants.id))
        .where(
          and(
            eq(plantInstances.userId, userId),
            eq(plantInstances.isActive, true),
            or(
              ilike(plantInstances.nickname, searchTerm),
              ilike(plantInstances.location, searchTerm),
              ilike(plantInstances.notes, searchTerm),
              ilike(plants.commonName, searchTerm),
              ilike(plants.genus, searchTerm),
              ilike(plants.species, searchTerm)
            )
          )
        )
        .orderBy(desc(plantInstances.createdAt));

      return instances.map(instance => ({
        ...instance.plant_instances,
        plant: instance.plants!
      }));
    } catch (error) {
      console.error('Failed to search plant instances:', error);
      throw new Error('Failed to search plant instances');
    }
  }

  // Update plant instance
  static async update(id: number, instanceData: Partial<NewPlantInstance>): Promise<PlantInstance> {
    try {
      const [instance] = await db
        .update(plantInstances)
        .set({ ...instanceData, updatedAt: new Date() })
        .where(eq(plantInstances.id, id))
        .returning();
      
      if (!instance) {
        throw new Error('Plant instance not found');
      }
      
      return instance;
    } catch (error) {
      console.error('Failed to update plant instance:', error);
      throw new Error('Failed to update plant instance');
    }
  }

  // Log fertilizer application and calculate next due date
  static async logFertilizer(id: number, fertilizerDate?: Date): Promise<PlantInstance> {
    try {
      const now = fertilizerDate || new Date();
      
      // Get current instance to calculate next due date
      const [currentInstance] = await db
        .select()
        .from(plantInstances)
        .where(eq(plantInstances.id, id));
      
      if (!currentInstance) {
        throw new Error('Plant instance not found');
      }

      // Calculate next fertilizer due date based on schedule
      let nextDue: Date | null = null;
      if (currentInstance.fertilizerSchedule) {
        const scheduleMatch = currentInstance.fertilizerSchedule.match(/(\d+)\s*(day|week|month)s?/i);
        if (scheduleMatch) {
          const [, amount, unit] = scheduleMatch;
          nextDue = new Date(now);
          
          switch (unit.toLowerCase()) {
            case 'day':
              nextDue.setDate(nextDue.getDate() + parseInt(amount));
              break;
            case 'week':
              nextDue.setDate(nextDue.getDate() + (parseInt(amount) * 7));
              break;
            case 'month':
              nextDue.setMonth(nextDue.getMonth() + parseInt(amount));
              break;
          }
        }
      }

      const [instance] = await db
        .update(plantInstances)
        .set({
          lastFertilized: now,
          fertilizerDue: nextDue,
          updatedAt: new Date()
        })
        .where(eq(plantInstances.id, id))
        .returning();
      
      return instance;
    } catch (error) {
      console.error('Failed to log fertilizer:', error);
      throw new Error('Failed to log fertilizer');
    }
  }

  // Log repotting
  static async logRepot(id: number, repotDate?: Date, notes?: string): Promise<PlantInstance> {
    try {
      const now = repotDate || new Date();
      
      const updateData: Partial<NewPlantInstance> = {
        lastRepot: now,
        updatedAt: new Date()
      };

      if (notes) {
        // Get current instance to append notes
        const [currentInstance] = await db
          .select()
          .from(plantInstances)
          .where(eq(plantInstances.id, id));
        
        if (currentInstance) {
          const existingNotes = currentInstance.notes || '';
          const repotNote = `Repotted on ${now.toDateString()}: ${notes}`;
          updateData.notes = existingNotes ? `${existingNotes}\n${repotNote}` : repotNote;
        }
      }

      const [instance] = await db
        .update(plantInstances)
        .set(updateData)
        .where(eq(plantInstances.id, id))
        .returning();
      
      if (!instance) {
        throw new Error('Plant instance not found');
      }
      
      return instance;
    } catch (error) {
      console.error('Failed to log repot:', error);
      throw new Error('Failed to log repot');
    }
  }

  // Deactivate plant instance (soft delete)
  static async deactivate(id: number): Promise<PlantInstance> {
    try {
      const [instance] = await db
        .update(plantInstances)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(plantInstances.id, id))
        .returning();
      
      if (!instance) {
        throw new Error('Plant instance not found');
      }
      
      return instance;
    } catch (error) {
      console.error('Failed to deactivate plant instance:', error);
      throw new Error('Failed to deactivate plant instance');
    }
  }

  // Reactivate plant instance
  static async reactivate(id: number): Promise<PlantInstance> {
    try {
      const [instance] = await db
        .update(plantInstances)
        .set({ isActive: true, updatedAt: new Date() })
        .where(eq(plantInstances.id, id))
        .returning();
      
      if (!instance) {
        throw new Error('Plant instance not found');
      }
      
      return instance;
    } catch (error) {
      console.error('Failed to reactivate plant instance:', error);
      throw new Error('Failed to reactivate plant instance');
    }
  }

  // Delete plant instance permanently
  static async delete(id: number): Promise<boolean> {
    try {
      const result = await db.delete(plantInstances).where(eq(plantInstances.id, id));
      return result.rowCount > 0;
    } catch (error) {
      console.error('Failed to delete plant instance:', error);
      throw new Error('Failed to delete plant instance');
    }
  }

  // Get care statistics for a user
  static async getCareStats(userId: number): Promise<{
    totalPlants: number;
    activePlants: number;
    overdueFertilizer: number;
    dueSoon: number;
  }> {
    try {
      const now = new Date();
      const weekFromNow = new Date();
      weekFromNow.setDate(now.getDate() + 7);

      const [stats] = await db
        .select({
          totalPlants: sql<number>`count(*)`,
          activePlants: sql<number>`count(*) filter (where ${plantInstances.isActive} = true)`,
          overdueFertilizer: sql<number>`count(*) filter (where ${plantInstances.isActive} = true and ${plantInstances.fertilizerDue} <= ${now})`,
          dueSoon: sql<number>`count(*) filter (where ${plantInstances.isActive} = true and ${plantInstances.fertilizerDue} > ${now} and ${plantInstances.fertilizerDue} <= ${weekFromNow})`
        })
        .from(plantInstances)
        .where(eq(plantInstances.userId, userId));

      return stats;
    } catch (error) {
      console.error('Failed to get care stats:', error);
      throw new Error('Failed to get care stats');
    }
  }
}