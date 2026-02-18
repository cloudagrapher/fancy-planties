import type {
  BulkOperationResult,
  CareDashboardData,
  EnhancedPlantInstance,
  PlantInstanceSearchResult,
} from "@/lib/types/plant-instance-types";
import { plantInstanceHelpers } from "@/lib/types/plant-instance-types";
import type {
  BulkPlantInstanceOperation,
  PlantInstanceFilter,
  PlantInstanceSearch,
} from "@/lib/validation/plant-schemas";
import {
  and,
  asc,
  desc,
  eq,
  gte,
  ilike,
  isNotNull,
  lte,
  or,
  sql,
} from "drizzle-orm";
import { db } from "../index";
import {
  plantInstances,
  plants,
  type NewPlantInstance,
  type PlantInstance,
} from "../schema";

// Plant instance CRUD operations
export class PlantInstanceQueries {
  // Create a new plant instance
  static async create(instanceData: NewPlantInstance): Promise<PlantInstance> {
    try {
      const [instance] = await db
        .insert(plantInstances)
        .values(instanceData)
        .returning();
      return instance;
    } catch (error) {
      console.error("Failed to create plant instance:", error);
      throw new Error("Failed to create plant instance");
    }
  }

  // Get plant instance by ID with plant taxonomy data
  static async getById(
    id: number
  ): Promise<(PlantInstance & { plant: typeof plants.$inferSelect }) | null> {
    try {
      const [instance] = await db
        .select()
        .from(plantInstances)
        .leftJoin(plants, eq(plantInstances.plantId, plants.id))
        .where(eq(plantInstances.id, id));

      if (!instance) return null;

      return {
        ...instance.plant_instances,
        plant: instance.plants!,
      };
    } catch (error) {
      console.error("Failed to get plant instance by ID:", error);
      throw new Error("Failed to get plant instance");
    }
  }

  // Get all plant instances for a user
  static async getByUserId(
    userId: number,
    activeOnly: boolean = true
  ): Promise<(PlantInstance & { plant: typeof plants.$inferSelect })[]> {
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

      return instances.map((instance) => ({
        ...instance.plant_instances,
        plant: instance.plants!,
      }));
    } catch (error) {
      console.error("Failed to get plant instances by user ID:", error);
      throw new Error("Failed to get plant instances");
    }
  }

  // Get plant instances with overdue fertilizer
  static async getOverdueFertilizer(
    userId: number
  ): Promise<(PlantInstance & { plant: typeof plants.$inferSelect })[]> {
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

      return instances.map((instance) => ({
        ...instance.plant_instances,
        plant: instance.plants!,
      }));
    } catch (error) {
      console.error("Failed to get overdue fertilizer instances:", error);
      throw new Error("Failed to get overdue fertilizer instances");
    }
  }

  // Get plant instances with fertilizer due soon
  static async getFertilizerDueSoon(
    userId: number,
    daysAhead: number = 7
  ): Promise<(PlantInstance & { plant: typeof plants.$inferSelect })[]> {
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

      return instances.map((instance) => ({
        ...instance.plant_instances,
        plant: instance.plants!,
      }));
    } catch (error) {
      console.error("Failed to get fertilizer due soon instances:", error);
      throw new Error("Failed to get fertilizer due soon instances");
    }
  }

  // Search plant instances by nickname, location, or notes
  static async search(
    userId: number,
    query: string
  ): Promise<(PlantInstance & { plant: typeof plants.$inferSelect })[]> {
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

      return instances.map((instance) => ({
        ...instance.plant_instances,
        plant: instance.plants!,
      }));
    } catch (error) {
      console.error("Failed to search plant instances:", error);
      throw new Error("Failed to search plant instances");
    }
  }

  // Update plant instance
  static async update(
    id: number,
    instanceData: Partial<NewPlantInstance>
  ): Promise<PlantInstance> {
    try {
      const [instance] = await db
        .update(plantInstances)
        .set({ ...instanceData, updatedAt: new Date() })
        .where(eq(plantInstances.id, id))
        .returning();

      if (!instance) {
        throw new Error("Plant instance not found");
      }

      return instance;
    } catch (error) {
      console.error("Failed to update plant instance:", error);
      if (
        error instanceof Error &&
        error.message === "Plant instance not found"
      ) {
        throw error;
      }
      throw new Error("Failed to update plant instance");
    }
  }

  // Log fertilizer application and calculate next due date
  static async logFertilizer(
    id: number,
    fertilizerDate?: Date
  ): Promise<PlantInstance> {
    try {
      const now = fertilizerDate || new Date();

      // Get current instance to calculate next due date
      const [currentInstance] = await db
        .select()
        .from(plantInstances)
        .where(eq(plantInstances.id, id));

      if (!currentInstance) {
        throw new Error("Plant instance not found");
      }

      // Calculate next fertilizer due date based on schedule
      let nextDue: Date | null = null;
      if (currentInstance.fertilizerSchedule) {
        const scheduleMatch = currentInstance.fertilizerSchedule.match(
          /(\d+)\s*(day|week|month)s?/i
        );
        if (scheduleMatch) {
          const [, amount, unit] = scheduleMatch;
          nextDue = new Date(now);

          switch (unit.toLowerCase()) {
            case "day":
              nextDue.setDate(nextDue.getDate() + parseInt(amount, 10));
              break;
            case "week":
              nextDue.setDate(nextDue.getDate() + parseInt(amount, 10) * 7);
              break;
            case "month":
              nextDue.setMonth(nextDue.getMonth() + parseInt(amount, 10));
              break;
          }
        }
      }

      const [instance] = await db
        .update(plantInstances)
        .set({
          lastFertilized: now,
          fertilizerDue: nextDue,
          updatedAt: new Date(),
        })
        .where(eq(plantInstances.id, id))
        .returning();

      return instance;
    } catch (error) {
      console.error("Failed to log fertilizer:", error);
      if (
        error instanceof Error &&
        error.message === "Plant instance not found"
      ) {
        throw error;
      }
      throw new Error("Failed to log fertilizer");
    }
  }

  // Log repotting
  static async logRepot(
    id: number,
    repotDate?: Date,
    notes?: string
  ): Promise<PlantInstance> {
    try {
      const now = repotDate || new Date();

      const updateData: Partial<NewPlantInstance> = {
        lastRepot: now,
        updatedAt: new Date(),
      };

      if (notes) {
        // Get current instance to append notes
        const [currentInstance] = await db
          .select()
          .from(plantInstances)
          .where(eq(plantInstances.id, id));

        if (currentInstance) {
          const existingNotes = currentInstance.notes || "";
          const repotNote = `Repotted on ${now.toDateString()}: ${notes}`;
          updateData.notes = existingNotes
            ? `${existingNotes}\n${repotNote}`
            : repotNote;
        }
      }

      const [instance] = await db
        .update(plantInstances)
        .set(updateData)
        .where(eq(plantInstances.id, id))
        .returning();

      if (!instance) {
        throw new Error("Plant instance not found");
      }

      return instance;
    } catch (error) {
      console.error("Failed to log repot:", error);
      throw new Error("Failed to log repot");
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
        throw new Error("Plant instance not found");
      }

      return instance;
    } catch (error) {
      console.error("Failed to deactivate plant instance:", error);
      if (
        error instanceof Error &&
        error.message === "Plant instance not found"
      ) {
        throw error;
      }
      throw new Error("Failed to deactivate plant instance");
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
        throw new Error("Plant instance not found");
      }

      return instance;
    } catch (error) {
      console.error("Failed to reactivate plant instance:", error);
      throw new Error("Failed to reactivate plant instance");
    }
  }

  // Delete plant instance permanently
  static async delete(id: number): Promise<boolean> {
    try {
      const result = await db
        .delete(plantInstances)
        .where(eq(plantInstances.id, id))
        .returning({ id: plantInstances.id });
      return result.length > 0;
    } catch (error) {
      console.error("Failed to delete plant instance:", error);
      throw new Error("Failed to delete plant instance");
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

      // Get total and active plants
      const [totalStats] = await db
        .select({
          totalPlants: sql<number>`count(*)`,
          activePlants: sql<number>`count(*) filter (where ${plantInstances.isActive} = true)`,
        })
        .from(plantInstances)
        .where(eq(plantInstances.userId, userId));

      // Get overdue fertilizer count
      const [overdueStats] = await db
        .select({
          overdueFertilizer: sql<number>`count(*)`,
        })
        .from(plantInstances)
        .where(
          and(
            eq(plantInstances.userId, userId),
            eq(plantInstances.isActive, true),
            isNotNull(plantInstances.fertilizerDue),
            lte(plantInstances.fertilizerDue, now)
          )
        );

      // Get due soon count
      const [dueSoonStats] = await db
        .select({
          dueSoon: sql<number>`count(*)`,
        })
        .from(plantInstances)
        .where(
          and(
            eq(plantInstances.userId, userId),
            eq(plantInstances.isActive, true),
            isNotNull(plantInstances.fertilizerDue),
            gte(plantInstances.fertilizerDue, now),
            lte(plantInstances.fertilizerDue, weekFromNow)
          )
        );

      return {
        totalPlants: Number(totalStats.totalPlants),
        activePlants: Number(totalStats.activePlants),
        overdueFertilizer: Number(overdueStats.overdueFertilizer),
        dueSoon: Number(dueSoonStats.dueSoon),
      };
    } catch (error) {
      console.error("Failed to get care stats:", error);
      throw new Error("Failed to get care stats");
    }
  }

  // Enhanced search with filters
  static async searchWithFilters(
    searchParams: PlantInstanceSearch
  ): Promise<PlantInstanceSearchResult> {
    try {
      const startTime = Date.now();
      const { query, userId, activeOnly, limit, offset } = searchParams;
      const searchTerm = `%${query.toLowerCase()}%`;

      const conditions = [eq(plantInstances.userId, userId)];

      if (activeOnly) {
        conditions.push(eq(plantInstances.isActive, true));
      }

      // Add search conditions
      conditions.push(
        or(
          ilike(plantInstances.nickname, searchTerm),
          ilike(plantInstances.location, searchTerm),
          ilike(plantInstances.notes, searchTerm),
          ilike(plants.commonName, searchTerm),
          ilike(plants.genus, searchTerm),
          ilike(plants.species, searchTerm),
          ilike(plants.family, searchTerm)
        )!
      );

      // Get total count
      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(plantInstances)
        .leftJoin(plants, eq(plantInstances.plantId, plants.id))
        .where(and(...conditions));

      const totalCount = countResult.count;

      // Get instances with plant data
      const instances = await db
        .select()
        .from(plantInstances)
        .leftJoin(plants, eq(plantInstances.plantId, plants.id))
        .where(and(...conditions))
        .orderBy(desc(plantInstances.createdAt))
        .limit(limit)
        .offset(offset);

      const enhancedInstances = instances.map((instance) =>
        plantInstanceHelpers.enhancePlantInstance(
          instance.plant_instances,
          instance.plants!
        )
      );

      const searchTime = Date.now() - startTime;

      return {
        instances: enhancedInstances,
        totalCount,
        hasMore: offset + limit < totalCount,
        searchTime,
        filters: {
          ...searchParams,
          overdueOnly: false, // Add missing field
        },
      };
    } catch (error) {
      console.error("Failed to search plant instances with filters:", error);
      throw new Error("Failed to search plant instances");
    }
  }

  // Advanced filtering
  static async getWithFilters(
    filterParams: PlantInstanceFilter
  ): Promise<PlantInstanceSearchResult> {
    try {
      const startTime = Date.now();
      const {
        userId,
        location,
        plantId,
        isActive,
        overdueOnly,
        dueSoonDays,
        createdAfter,
        createdBefore,
        lastFertilizedAfter,
        lastFertilizedBefore,
        limit,
        offset,
      } = filterParams;

      const conditions = [eq(plantInstances.userId, userId)];

      // Apply filters
      if (location) {
        conditions.push(ilike(plantInstances.location, `%${location}%`));
      }

      if (plantId) {
        conditions.push(eq(plantInstances.plantId, plantId));
      }

      if (isActive !== undefined) {
        conditions.push(eq(plantInstances.isActive, isActive));
      }

      if (overdueOnly) {
        const now = new Date();
        conditions.push(
          and(
            isNotNull(plantInstances.fertilizerDue),
            lte(plantInstances.fertilizerDue, now)
          )!
        );
      }

      if (dueSoonDays) {
        const now = new Date();
        const futureDate = new Date();
        futureDate.setDate(now.getDate() + dueSoonDays);
        conditions.push(
          and(
            isNotNull(plantInstances.fertilizerDue),
            gte(plantInstances.fertilizerDue, now),
            lte(plantInstances.fertilizerDue, futureDate)
          )!
        );
      }

      if (createdAfter) {
        conditions.push(gte(plantInstances.createdAt, createdAfter));
      }

      if (createdBefore) {
        conditions.push(lte(plantInstances.createdAt, createdBefore));
      }

      if (lastFertilizedAfter) {
        conditions.push(
          and(
            isNotNull(plantInstances.lastFertilized),
            gte(plantInstances.lastFertilized, lastFertilizedAfter)
          )!
        );
      }

      if (lastFertilizedBefore) {
        conditions.push(
          and(
            isNotNull(plantInstances.lastFertilized),
            lte(plantInstances.lastFertilized, lastFertilizedBefore)
          )!
        );
      }

      // Get total count
      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(plantInstances)
        .leftJoin(plants, eq(plantInstances.plantId, plants.id))
        .where(and(...conditions));

      const totalCount = countResult.count;

      // Get instances with plant data
      const instances = await db
        .select()
        .from(plantInstances)
        .leftJoin(plants, eq(plantInstances.plantId, plants.id))
        .where(and(...conditions))
        .orderBy(
          overdueOnly || dueSoonDays
            ? asc(plantInstances.fertilizerDue)
            : desc(plantInstances.createdAt)
        )
        .limit(limit)
        .offset(offset);

      const enhancedInstances = instances.map((instance) =>
        plantInstanceHelpers.enhancePlantInstance(
          instance.plant_instances,
          instance.plants!
        )
      );

      const searchTime = Date.now() - startTime;

      return {
        instances: enhancedInstances,
        totalCount,
        hasMore: offset + limit < totalCount,
        searchTime,
        filters: filterParams,
      };
    } catch (error) {
      console.error("Failed to get plant instances with filters:", error);
      throw new Error("Failed to get plant instances with filters");
    }
  }

  // Get enhanced plant instances for a user
  static async getEnhancedByUserId(
    userId: number,
    activeOnly: boolean = true
  ): Promise<EnhancedPlantInstance[]> {
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

      return instances.map((instance) =>
        plantInstanceHelpers.enhancePlantInstance(
          instance.plant_instances,
          instance.plants!
        )
      );
    } catch (error) {
      console.error("Failed to get enhanced plant instances:", error);
      throw new Error("Failed to get enhanced plant instances");
    }
  }

  // Get care dashboard data
  static async getCareDashboardData(
    userId: number
  ): Promise<CareDashboardData> {
    try {
      const now = new Date();
      const tomorrow = new Date();
      tomorrow.setDate(now.getDate() + 1);
      const weekFromNow = new Date();
      weekFromNow.setDate(now.getDate() + 7);

      // Get all active instances with plant data
      const instances = await this.getEnhancedByUserId(userId, true);

      // Categorize by care status
      const overdue = instances.filter(
        (instance) => instance.careStatus === "overdue"
      );
      const dueToday = instances.filter(
        (instance) => instance.careStatus === "due_today"
      );
      const dueSoon = instances.filter(
        (instance) => instance.careStatus === "due_soon"
      );

      // Get recently cared for plants (fertilized in last 7 days)
      const recentlyCared = instances.filter((instance) => {
        if (!instance.lastFertilized) return false;
        const daysSince = plantInstanceHelpers.calculateDaysSinceLastFertilized(
          instance.lastFertilized
        );
        return daysSince !== null && daysSince <= 7;
      });

      // Calculate care streak (consecutive days with care activity)
      const careStreakDays = await this.calculateCareStreak(userId);

      return {
        overdue: plantInstanceHelpers.sortByCareUrgency(overdue),
        dueToday: plantInstanceHelpers.sortByCareUrgency(dueToday),
        dueSoon: plantInstanceHelpers.sortByCareUrgency(dueSoon),
        recentlyCared,
        statistics: {
          totalActivePlants: instances.length,
          overdueCount: overdue.length,
          dueTodayCount: dueToday.length,
          dueSoonCount: dueSoon.length,
          careStreakDays,
        },
      };
    } catch (error) {
      console.error("Failed to get care dashboard data:", error);
      throw new Error("Failed to get care dashboard data");
    }
  }

  // Calculate care streak
  static async calculateCareStreak(userId: number): Promise<number> {
    try {
      // This is a simplified implementation
      // In a real app, you might want to track care events in a separate table
      const instances = await db
        .select({
          lastFertilized: plantInstances.lastFertilized,
        })
        .from(plantInstances)
        .where(
          and(
            eq(plantInstances.userId, userId),
            eq(plantInstances.isActive, true),
            isNotNull(plantInstances.lastFertilized)
          )
        )
        .orderBy(desc(plantInstances.lastFertilized));

      if (instances.length === 0) return 0;

      // Simple streak calculation based on recent fertilizer applications
      let streak = 0;
      const now = new Date();

      for (const instance of instances) {
        if (!instance.lastFertilized) break;

        const daysSince = Math.floor(
          (now.getTime() - instance.lastFertilized.getTime()) /
            (1000 * 60 * 60 * 24)
        );

        if (daysSince <= 1) {
          streak = Math.max(streak, 1);
        }
      }

      return streak;
    } catch (error) {
      console.error("Failed to calculate care streak:", error);
      return 0;
    }
  }

  // Bulk operations
  static async bulkOperation(
    operation: BulkPlantInstanceOperation
  ): Promise<BulkOperationResult> {
    try {
      const {
        plantInstanceIds,
        operation: op,
        fertilizerDate,
        notes,
      } = operation;
      const results: BulkOperationResult["results"] = [];
      let successCount = 0;
      let failureCount = 0;

      for (const id of plantInstanceIds) {
        try {
          let result: PlantInstance;

          switch (op) {
            case "activate":
              result = await this.reactivate(id);
              break;
            case "deactivate":
              result = await this.deactivate(id);
              break;
            case "delete":
              await this.delete(id);
              result = { id } as PlantInstance; // Placeholder for deleted item
              break;
            case "fertilize":
              result = await this.logFertilizer(id, fertilizerDate);
              break;
            default:
              throw new Error(`Unknown operation: ${op}`);
          }

          results.push({ plantInstanceId: id, success: true });
          successCount++;
        } catch (error) {
          results.push({
            plantInstanceId: id,
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          });
          failureCount++;
        }
      }

      return {
        success: successCount > 0,
        successCount,
        failureCount,
        results,
      };
    } catch (error) {
      console.error("Failed to perform bulk operation:", error);
      throw new Error("Failed to perform bulk operation");
    }
  }

  // Get plant instances by location
  static async getByLocation(
    userId: number,
    location: string
  ): Promise<EnhancedPlantInstance[]> {
    try {
      const instances = await db
        .select()
        .from(plantInstances)
        .leftJoin(plants, eq(plantInstances.plantId, plants.id))
        .where(
          and(
            eq(plantInstances.userId, userId),
            eq(plantInstances.isActive, true),
            ilike(plantInstances.location, `%${location}%`)
          )
        )
        .orderBy(plantInstances.nickname);

      return instances.map((instance) =>
        plantInstanceHelpers.enhancePlantInstance(
          instance.plant_instances,
          instance.plants!
        )
      );
    } catch (error) {
      console.error("Failed to get plant instances by location:", error);
      throw new Error("Failed to get plant instances by location");
    }
  }

  // Get unique locations for a user
  static async getUserLocations(userId: number): Promise<string[]> {
    try {
      const locations = await db
        .selectDistinct({ location: plantInstances.location })
        .from(plantInstances)
        .where(
          and(
            eq(plantInstances.userId, userId),
            eq(plantInstances.isActive, true)
          )
        )
        .orderBy(plantInstances.location);

      return locations.map((l) => l.location).filter(Boolean);
    } catch (error) {
      console.error("Failed to get user locations:", error);
      throw new Error("Failed to get user locations");
    }
  }

  // Get enhanced plant instance by ID
  static async getEnhancedById(
    id: number
  ): Promise<EnhancedPlantInstance | null> {
    try {
      const [instance] = await db
        .select()
        .from(plantInstances)
        .leftJoin(plants, eq(plantInstances.plantId, plants.id))
        .where(eq(plantInstances.id, id));

      if (!instance || !instance.plants) return null;

      return plantInstanceHelpers.enhancePlantInstance(
        instance.plant_instances,
        instance.plants
      );
    } catch (error) {
      console.error("Failed to get enhanced plant instance by ID:", error);
      throw new Error("Failed to get enhanced plant instance");
    }
  }

  // Enhanced search with advanced filtering capabilities
  static async enhancedSearch(
    filterParams: import("@/lib/validation/plant-schemas").EnhancedPlantInstanceFilter
  ): Promise<PlantInstanceSearchResult> {
    try {
      const startTime = Date.now();
      const {
        userId,
        searchQuery,
        searchFields,
        location,
        plantId,
        isActive,
        overdueOnly,
        dueSoonDays,
        hasImages,
        imageCount,
        fertilizerFrequency,
        createdAfter,
        createdBefore,
        lastFertilizedAfter,
        lastFertilizedBefore,
        sortBy,
        sortOrder,
        limit,
        offset,
        includeStats,
        includeFacets,
      } = filterParams;

      const conditions = [eq(plantInstances.userId, userId)];

      // Basic filters
      if (location) {
        conditions.push(ilike(plantInstances.location, `%${location}%`));
      }

      if (plantId) {
        conditions.push(eq(plantInstances.plantId, plantId));
      }

      if (isActive !== undefined) {
        conditions.push(eq(plantInstances.isActive, isActive));
      }

      if (overdueOnly) {
        const now = new Date();
        conditions.push(
          and(
            isNotNull(plantInstances.fertilizerDue),
            lte(plantInstances.fertilizerDue, now)
          )!
        );
      }

      if (dueSoonDays) {
        const now = new Date();
        const futureDate = new Date();
        futureDate.setDate(now.getDate() + dueSoonDays);
        conditions.push(
          and(
            isNotNull(plantInstances.fertilizerDue),
            gte(plantInstances.fertilizerDue, now),
            lte(plantInstances.fertilizerDue, futureDate)
          )!
        );
      }

      // Enhanced search query
      if (searchQuery) {
        const searchTerm = `%${searchQuery.toLowerCase()}%`;
        const searchConditions = [];

        if (!searchFields || searchFields.includes("nickname")) {
          searchConditions.push(ilike(plantInstances.nickname, searchTerm));
        }
        if (!searchFields || searchFields.includes("location")) {
          searchConditions.push(ilike(plantInstances.location, searchTerm));
        }
        if (!searchFields || searchFields.includes("notes")) {
          searchConditions.push(ilike(plantInstances.notes, searchTerm));
        }
        if (!searchFields || searchFields.includes("plant_name")) {
          searchConditions.push(ilike(plants.commonName, searchTerm));
          searchConditions.push(ilike(plants.genus, searchTerm));
          searchConditions.push(ilike(plants.species, searchTerm));
          searchConditions.push(ilike(plants.family, searchTerm));
        }

        if (searchConditions.length > 0) {
          conditions.push(or(...searchConditions)!);
        }
      }

      // Image filters
      if (hasImages !== undefined) {
        if (hasImages) {
          conditions.push(sql`json_array_length(${plantInstances.images}) > 0`);
        } else {
          conditions.push(sql`json_array_length(${plantInstances.images}) = 0`);
        }
      }

      if (imageCount) {
        if (imageCount.min !== undefined) {
          conditions.push(
            sql`json_array_length(${plantInstances.images}) >= ${imageCount.min}`
          );
        }
        if (imageCount.max !== undefined) {
          conditions.push(
            sql`json_array_length(${plantInstances.images}) <= ${imageCount.max}`
          );
        }
      }

      // Fertilizer frequency filters
      if (fertilizerFrequency) {
        const { unit, min, max } = fertilizerFrequency;

        // This is a simplified implementation - in a real app you might want to parse the schedule more robustly
        if (min !== undefined || max !== undefined) {
          const scheduleConditions = [];

          if (min !== undefined) {
            scheduleConditions.push(
              ilike(plantInstances.fertilizerSchedule, `%${min}%${unit}%`)
            );
          }

          if (max !== undefined) {
            // This is a basic implementation - you might want more sophisticated schedule parsing
            scheduleConditions.push(
              ilike(plantInstances.fertilizerSchedule, `%${max}%${unit}%`)
            );
          }

          if (scheduleConditions.length > 0) {
            conditions.push(or(...scheduleConditions)!);
          }
        }
      }

      // Date range filters
      if (createdAfter) {
        conditions.push(gte(plantInstances.createdAt, createdAfter));
      }

      if (createdBefore) {
        conditions.push(lte(plantInstances.createdAt, createdBefore));
      }

      if (lastFertilizedAfter) {
        conditions.push(
          and(
            isNotNull(plantInstances.lastFertilized),
            gte(plantInstances.lastFertilized, lastFertilizedAfter)
          )!
        );
      }

      if (lastFertilizedBefore) {
        conditions.push(
          and(
            isNotNull(plantInstances.lastFertilized),
            lte(plantInstances.lastFertilized, lastFertilizedBefore)
          )!
        );
      }

      // Get total count
      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(plantInstances)
        .leftJoin(plants, eq(plantInstances.plantId, plants.id))
        .where(and(...conditions));

      const totalCount = countResult.count;

      // Determine sort order based on sortBy field
      let orderByClause;
      switch (sortBy) {
        case "nickname":
          orderByClause =
            sortOrder === "asc"
              ? [asc(plantInstances.nickname)]
              : [desc(plantInstances.nickname)];
          break;
        case "location":
          orderByClause =
            sortOrder === "asc"
              ? [asc(plantInstances.location)]
              : [desc(plantInstances.location)];
          break;
        case "last_fertilized":
          orderByClause =
            sortOrder === "asc"
              ? [asc(plantInstances.lastFertilized)]
              : [desc(plantInstances.lastFertilized)];
          break;
        case "fertilizer_due":
          orderByClause =
            sortOrder === "asc"
              ? [asc(plantInstances.fertilizerDue)]
              : [desc(plantInstances.fertilizerDue)];
          break;
        case "plant_name":
          // Sort by taxonomy: family → genus → species → cultivar (nulls last for cultivar)
          orderByClause =
            sortOrder === "asc"
              ? [asc(plants.family), asc(plants.genus), asc(plants.species), asc(plants.cultivar)]
              : [desc(plants.family), desc(plants.genus), desc(plants.species), desc(plants.cultivar)];
          break;
        case "care_urgency":
          // Sort by care urgency (overdue first, then due soon, then by due date)
          orderByClause = [asc(plantInstances.fertilizerDue)];
          break;
        case "created_at":
        default:
          orderByClause =
            sortOrder === "asc"
              ? [asc(plantInstances.createdAt)]
              : [desc(plantInstances.createdAt)];
          break;
      }

      // Get instances with plant data
      const instances = await db
        .select()
        .from(plantInstances)
        .leftJoin(plants, eq(plantInstances.plantId, plants.id))
        .where(and(...conditions))
        .orderBy(...orderByClause)
        .limit(limit)
        .offset(offset);

      const enhancedInstances = instances.map((instance) =>
        plantInstanceHelpers.enhancePlantInstance(
          instance.plant_instances,
          instance.plants!
        )
      );

      const searchTime = Date.now() - startTime;

      // Build result with optional stats and facets
      const result: PlantInstanceSearchResult = {
        instances: enhancedInstances,
        totalCount,
        hasMore: offset + limit < totalCount,
        searchTime,
        filters: filterParams,
      };

      // Add stats if requested
      if (includeStats) {
        result.stats = await this.getCareStats(userId);
      }

      // Add facets if requested (simplified implementation)
      if (includeFacets) {
        const locations = await this.getUserLocations(userId);
        result.facets = { locations };
      }

      return result;
    } catch (error) {
      console.error("Failed to perform enhanced search:", error);
      throw new Error("Failed to perform enhanced search");
    }
  }
}
