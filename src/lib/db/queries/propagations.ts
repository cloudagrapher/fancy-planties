import 'server-only';

import { eq, and, desc, asc, ilike, or, sql } from 'drizzle-orm';
import { db } from '../index';
import { propagations, plants, plantInstances, type Propagation, type NewPropagation } from '../schema';

// Propagation CRUD operations
export class PropagationQueries {
  // Create a new propagation
  static async create(propagationData: NewPropagation): Promise<Propagation> {
    try {
      const [propagation] = await db.insert(propagations).values(propagationData).returning();
      return propagation;
    } catch (error) {
      console.error('Failed to create propagation:', error);
      throw new Error('Failed to create propagation');
    }
  }

  // Get propagation by ID with related data
  static async getById(id: number): Promise<(Propagation & { 
    plant: typeof plants.$inferSelect;
    parentInstance?: typeof plantInstances.$inferSelect;
  }) | null> {
    try {
      const [propagation] = await db
        .select()
        .from(propagations)
        .leftJoin(plants, eq(propagations.plantId, plants.id))
        .leftJoin(plantInstances, eq(propagations.parentInstanceId, plantInstances.id))
        .where(eq(propagations.id, id));
      
      if (!propagation) return null;
      
      return {
        ...propagation.propagations,
        plant: propagation.plants!,
        parentInstance: propagation.plant_instances || undefined
      };
    } catch (error) {
      console.error('Failed to get propagation by ID:', error);
      throw new Error('Failed to get propagation');
    }
  }

  // Get all propagations for a user
  static async getByUserId(userId: number): Promise<(Propagation & { 
    plant: typeof plants.$inferSelect;
    parentInstance?: typeof plantInstances.$inferSelect;
  })[]> {
    try {
      const propagationList = await db
        .select()
        .from(propagations)
        .leftJoin(plants, eq(propagations.plantId, plants.id))
        .leftJoin(plantInstances, eq(propagations.parentInstanceId, plantInstances.id))
        .where(eq(propagations.userId, userId))
        .orderBy(desc(propagations.dateStarted));

      return propagationList.map(prop => ({
        ...prop.propagations,
        plant: prop.plants!,
        parentInstance: prop.plant_instances || undefined
      }));
    } catch (error) {
      console.error('Failed to get propagations by user ID:', error);
      throw new Error('Failed to get propagations');
    }
  }

  // Get propagations by status
  static async getByStatus(userId: number, status: 'started' | 'rooting' | 'planted' | 'established'): Promise<(Propagation & { 
    plant: typeof plants.$inferSelect;
    parentInstance?: typeof plantInstances.$inferSelect;
  })[]> {
    try {
      const propagationList = await db
        .select()
        .from(propagations)
        .leftJoin(plants, eq(propagations.plantId, plants.id))
        .leftJoin(plantInstances, eq(propagations.parentInstanceId, plantInstances.id))
        .where(
          and(
            eq(propagations.userId, userId),
            eq(propagations.status, status)
          )
        )
        .orderBy(desc(propagations.dateStarted));

      return propagationList.map(prop => ({
        ...prop.propagations,
        plant: prop.plants!,
        parentInstance: prop.plant_instances || undefined
      }));
    } catch (error) {
      console.error('Failed to get propagations by status:', error);
      throw new Error('Failed to get propagations by status');
    }
  }

  // Get propagations by source type
  static async getBySourceType(userId: number, sourceType: 'internal' | 'external'): Promise<(Propagation & { 
    plant: typeof plants.$inferSelect;
    parentInstance?: typeof plantInstances.$inferSelect;
  })[]> {
    try {
      const propagationList = await db
        .select()
        .from(propagations)
        .leftJoin(plants, eq(propagations.plantId, plants.id))
        .leftJoin(plantInstances, eq(propagations.parentInstanceId, plantInstances.id))
        .where(
          and(
            eq(propagations.userId, userId),
            eq(propagations.sourceType, sourceType)
          )
        )
        .orderBy(desc(propagations.dateStarted));

      return propagationList.map(prop => ({
        ...prop.propagations,
        plant: prop.plants!,
        parentInstance: prop.plant_instances || undefined
      }));
    } catch (error) {
      console.error('Failed to get propagations by source type:', error);
      throw new Error('Failed to get propagations by source type');
    }
  }

  // Get external propagations by source
  static async getByExternalSource(userId: number, externalSource: 'gift' | 'trade' | 'purchase' | 'other'): Promise<(Propagation & { 
    plant: typeof plants.$inferSelect;
  })[]> {
    try {
      const propagationList = await db
        .select()
        .from(propagations)
        .leftJoin(plants, eq(propagations.plantId, plants.id))
        .where(
          and(
            eq(propagations.userId, userId),
            eq(propagations.sourceType, 'external'),
            eq(propagations.externalSource, externalSource)
          )
        )
        .orderBy(desc(propagations.dateStarted));

      return propagationList.map(prop => ({
        ...prop.propagations,
        plant: prop.plants!
      }));
    } catch (error) {
      console.error('Failed to get propagations by external source:', error);
      throw new Error('Failed to get propagations by external source');
    }
  }

  // Get propagations from a specific parent plant instance
  static async getByParentInstance(parentInstanceId: number): Promise<(Propagation & { 
    plant: typeof plants.$inferSelect;
  })[]> {
    try {
      const propagationList = await db
        .select()
        .from(propagations)
        .leftJoin(plants, eq(propagations.plantId, plants.id))
        .where(eq(propagations.parentInstanceId, parentInstanceId))
        .orderBy(desc(propagations.dateStarted));

      return propagationList.map(prop => ({
        ...prop.propagations,
        plant: prop.plants!
      }));
    } catch (error) {
      console.error('Failed to get propagations by parent instance:', error);
      throw new Error('Failed to get propagations by parent instance');
    }
  }

  // Search propagations by nickname, location, or notes
  static async search(userId: number, query: string): Promise<(Propagation & { 
    plant: typeof plants.$inferSelect;
    parentInstance?: typeof plantInstances.$inferSelect;
  })[]> {
    try {
      const searchTerm = `%${query.toLowerCase()}%`;
      
      const propagationList = await db
        .select()
        .from(propagations)
        .leftJoin(plants, eq(propagations.plantId, plants.id))
        .leftJoin(plantInstances, eq(propagations.parentInstanceId, plantInstances.id))
        .where(
          and(
            eq(propagations.userId, userId),
            or(
              ilike(propagations.nickname, searchTerm),
              ilike(propagations.location, searchTerm),
              ilike(propagations.notes, searchTerm),
              ilike(plants.commonName, searchTerm),
              ilike(plants.genus, searchTerm),
              ilike(plants.species, searchTerm)
            )
          )
        )
        .orderBy(desc(propagations.dateStarted));

      return propagationList.map(prop => ({
        ...prop.propagations,
        plant: prop.plants!,
        parentInstance: prop.plant_instances || undefined
      }));
    } catch (error) {
      console.error('Failed to search propagations:', error);
      throw new Error('Failed to search propagations');
    }
  }

  // Update propagation
  static async update(id: number, propagationData: Partial<NewPropagation>): Promise<Propagation> {
    try {
      const [propagation] = await db
        .update(propagations)
        .set({ ...propagationData, updatedAt: new Date() })
        .where(eq(propagations.id, id))
        .returning();
      
      if (!propagation) {
        throw new Error('Propagation not found');
      }
      
      return propagation;
    } catch (error) {
      console.error('Failed to update propagation:', error);
      throw new Error('Failed to update propagation');
    }
  }

  // Update propagation status
  static async updateStatus(id: number, status: 'started' | 'rooting' | 'planted' | 'established', notes?: string): Promise<Propagation> {
    try {
      const updateData: Partial<NewPropagation> = {
        status,
        updatedAt: new Date()
      };

      if (notes) {
        // Get current propagation to append notes
        const [currentProp] = await db
          .select()
          .from(propagations)
          .where(eq(propagations.id, id));
        
        if (currentProp) {
          const existingNotes = currentProp.notes || '';
          const statusNote = `Status changed to ${status} on ${new Date().toDateString()}: ${notes}`;
          updateData.notes = existingNotes ? `${existingNotes}\n${statusNote}` : statusNote;
        }
      }

      const [propagation] = await db
        .update(propagations)
        .set(updateData)
        .where(eq(propagations.id, id))
        .returning();
      
      if (!propagation) {
        throw new Error('Propagation not found');
      }
      
      return propagation;
    } catch (error) {
      console.error('Failed to update propagation status:', error);
      throw new Error('Failed to update propagation status');
    }
  }

  // Convert propagation to plant instance
  static async convertToPlantInstance(
    propagationId: number, 
    instanceData: Omit<NewPropagation, 'userId' | 'plantId'>
  ): Promise<{ propagation: Propagation; plantInstanceId: number }> {
    try {
      return await db.transaction(async (tx) => {
        // Get the propagation
        const [propagation] = await tx
          .select()
          .from(propagations)
          .where(eq(propagations.id, propagationId));
        
        if (!propagation) {
          throw new Error('Propagation not found');
        }

        // Create new plant instance
        const [newInstance] = await tx
          .insert(plantInstances)
          .values({
            userId: propagation.userId,
            plantId: propagation.plantId,
            nickname: instanceData.nickname || propagation.nickname,
            location: instanceData.location || propagation.location,
            fertilizerSchedule: '2 weeks', // Default schedule
            notes: `Converted from propagation on ${new Date().toDateString()}. Original propagation notes: ${propagation.notes || 'None'}`,
            images: propagation.images,
            isActive: true
          })
          .returning();

        // Update propagation status to established
        const [updatedPropagation] = await tx
          .update(propagations)
          .set({
            status: 'established',
            notes: `${propagation.notes || ''}\nConverted to plant instance #${newInstance.id} on ${new Date().toDateString()}`,
            updatedAt: new Date()
          })
          .where(eq(propagations.id, propagationId))
          .returning();

        return {
          propagation: updatedPropagation,
          plantInstanceId: newInstance.id
        };
      });
    } catch (error) {
      console.error('Failed to convert propagation to plant instance:', error);
      throw new Error('Failed to convert propagation');
    }
  }

  // Delete propagation
  static async delete(id: number): Promise<boolean> {
    try {
      const result = await db.delete(propagations).where(eq(propagations.id, id)).returning();
      return result.length > 0;
    } catch (error) {
      console.error('Failed to delete propagation:', error);
      throw new Error('Failed to delete propagation');
    }
  }

  // Get propagation statistics for a user
  static async getStats(userId: number): Promise<{
    totalPropagations: number;
    byStatus: Record<string, number>;
    bySourceType: Record<string, number>;
    byExternalSource: Record<string, number>;
    successRate: number;
    successRateBySource: Record<string, number>;
    averageDaysToEstablished: number;
  }> {
    try {
      const [stats] = await db
        .select({
          totalPropagations: sql<number>`count(*)`,
          started: sql<number>`count(*) filter (where status = 'started')`,
          rooting: sql<number>`count(*) filter (where status = 'rooting')`,
          planted: sql<number>`count(*) filter (where status = 'planted')`,
          established: sql<number>`count(*) filter (where status = 'established')`,
          internal: sql<number>`count(*) filter (where source_type = 'internal')`,
          external: sql<number>`count(*) filter (where source_type = 'external')`,
          gift: sql<number>`count(*) filter (where external_source = 'gift')`,
          trade: sql<number>`count(*) filter (where external_source = 'trade')`,
          purchase: sql<number>`count(*) filter (where external_source = 'purchase')`,
          other: sql<number>`count(*) filter (where external_source = 'other')`,
          internalEstablished: sql<number>`count(*) filter (where source_type = 'internal' and status = 'established')`,
          externalEstablished: sql<number>`count(*) filter (where source_type = 'external' and status = 'established')`,
          avgDays: sql<number>`avg(extract(day from (updated_at - date_started))) filter (where status = 'established')`
        })
        .from(propagations)
        .where(eq(propagations.userId, userId));

      const total = Number(stats.totalPropagations);
      const established = Number(stats.established);
      const internal = Number(stats.internal);
      const external = Number(stats.external);
      const internalEstablished = Number(stats.internalEstablished);
      const externalEstablished = Number(stats.externalEstablished);
      
      const successRate = total > 0 ? (established / total) * 100 : 0;
      const internalSuccessRate = internal > 0 ? (internalEstablished / internal) * 100 : 0;
      const externalSuccessRate = external > 0 ? (externalEstablished / external) * 100 : 0;

      return {
        totalPropagations: total,
        byStatus: {
          started: Number(stats.started),
          rooting: Number(stats.rooting),
          planted: Number(stats.planted),
          established: established
        },
        bySourceType: {
          internal: internal,
          external: external
        },
        byExternalSource: {
          gift: Number(stats.gift),
          trade: Number(stats.trade),
          purchase: Number(stats.purchase),
          other: Number(stats.other)
        },
        successRate: Math.round(successRate * 100) / 100,
        successRateBySource: {
          internal: Math.round(internalSuccessRate * 100) / 100,
          external: Math.round(externalSuccessRate * 100) / 100
        },
        averageDaysToEstablished: Math.round((Number(stats.avgDays) || 0) * 100) / 100
      };
    } catch (error) {
      console.error('Failed to get propagation stats:', error);
      throw new Error('Failed to get propagation stats');
    }
  }

  // Get active propagations (not established)
  static async getActive(userId: number): Promise<(Propagation & { 
    plant: typeof plants.$inferSelect;
    parentInstance?: typeof plantInstances.$inferSelect;
  })[]> {
    try {
      const propagationList = await db
        .select()
        .from(propagations)
        .leftJoin(plants, eq(propagations.plantId, plants.id))
        .leftJoin(plantInstances, eq(propagations.parentInstanceId, plantInstances.id))
        .where(
          and(
            eq(propagations.userId, userId),
            sql`${propagations.status} != 'established'`
          )
        )
        .orderBy(asc(propagations.dateStarted));

      return propagationList.map(prop => ({
        ...prop.propagations,
        plant: prop.plants!,
        parentInstance: prop.plant_instances || undefined
      }));
    } catch (error) {
      console.error('Failed to get active propagations:', error);
      throw new Error('Failed to get active propagations');
    }
  }
}