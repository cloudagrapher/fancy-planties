import { db } from '@/lib/db';
import { careHistory, plantInstances, plants } from '@/lib/db/schema';
import { eq, and, desc, asc, gte, lte, inArray, sql, count } from 'drizzle-orm';
import type { 
  CareHistory, 
  NewCareHistory, 
  PlantInstance,
  Plant 
} from '@/lib/db/schema';
import type { EnhancedPlantInstance } from '@/lib/types/plant-instance-types';
import type { 
  CareFilterInput,
  CareStatsQueryInput,
  CareDashboardQueryInput 
} from '@/lib/validation/care-schemas';
import type { 
  EnhancedCareHistory,
  PlantCareStatistics,
  CareDashboardData,
  CareType
} from '@/lib/types/care-types';
import { CareCalculator } from '@/lib/services/care-calculator';
import { careHelpers } from '@/lib/types/care-types';

/**
 * Database queries for care history management
 */
export class CareHistoryQueries {
  /**
   * Create a new care history entry
   */
  static async createCareHistory(data: NewCareHistory): Promise<CareHistory> {
    // Validate care type enum constraint
    const validCareTypes = ['fertilizer', 'water', 'repot', 'prune', 'inspect', 'other'];
    if (!validCareTypes.includes(data.careType)) {
      throw new Error(`Invalid care type: ${data.careType}. Must be one of: ${validCareTypes.join(', ')}`);
    }

    const [careEntry] = await db
      .insert(careHistory)
      .values({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return careEntry;
  }

  /**
   * Get care history by ID
   */
  static async getCareHistoryById(id: number): Promise<CareHistory | null> {
    const [careEntry] = await db
      .select()
      .from(careHistory)
      .where(eq(careHistory.id, id))
      .limit(1);

    return careEntry || null;
  }

  /**
   * Get care history for a specific plant instance
   */
  static async getCareHistoryForPlant(
    plantInstanceId: number,
    userId: number,
    filters?: Partial<CareFilterInput>
  ): Promise<EnhancedCareHistory[]> {
    // Build where conditions
    const conditions = [
      eq(careHistory.plantInstanceId, plantInstanceId),
      eq(careHistory.userId, userId)
    ];

    if (filters?.careType) {
      conditions.push(eq(careHistory.careType, filters.careType));
    }

    if (filters?.startDate) {
      conditions.push(gte(careHistory.careDate, filters.startDate));
    }

    if (filters?.endDate) {
      conditions.push(lte(careHistory.careDate, filters.endDate));
    }

    // Apply sorting
    const sortField = filters?.sortBy === 'care_type' ? careHistory.careType :
                     filters?.sortBy === 'created_at' ? careHistory.createdAt :
                     careHistory.careDate;
    
    const sortOrder = filters?.sortOrder === 'asc' ? asc(sortField) : desc(sortField);

    // Build the query
    let query = db
      .select({
        careHistory: careHistory,
        plantInstance: plantInstances,
        plant: plants,
      })
      .from(careHistory)
      .leftJoin(plantInstances, eq(careHistory.plantInstanceId, plantInstances.id))
      .leftJoin(plants, eq(plantInstances.plantId, plants.id))
      .where(and(...conditions))
      .orderBy(sortOrder);

    // Apply pagination
    if (filters?.limit) {
      query = query.limit(filters.limit) as any;
    }
    if (filters?.offset) {
      query = query.offset(filters.offset) as any;
    }

    const results = await query;

    return results.map(result => this.enhanceCareHistory(result.careHistory, result.plantInstance, result.plant));
  }

  /**
   * Get care history for multiple plant instances (for dashboard)
   */
  static async getCareHistoryForPlants(
    plantInstanceIds: number[],
    userId: number,
    filters?: Partial<CareFilterInput>
  ): Promise<EnhancedCareHistory[]> {
    if (plantInstanceIds.length === 0) return [];

    // Build where conditions
    const conditions = [
      inArray(careHistory.plantInstanceId, plantInstanceIds),
      eq(careHistory.userId, userId)
    ];

    if (filters?.careType) {
      conditions.push(eq(careHistory.careType, filters.careType));
    }

    if (filters?.startDate) {
      conditions.push(gte(careHistory.careDate, filters.startDate));
    }

    if (filters?.endDate) {
      conditions.push(lte(careHistory.careDate, filters.endDate));
    }

    // Apply sorting
    const sortField = filters?.sortBy === 'care_type' ? careHistory.careType :
                     filters?.sortBy === 'created_at' ? careHistory.createdAt :
                     careHistory.careDate;
    
    const sortOrder = filters?.sortOrder === 'asc' ? asc(sortField) : desc(sortField);

    // Build the query
    let query = db
      .select({
        careHistory: careHistory,
        plantInstance: plantInstances,
        plant: plants,
      })
      .from(careHistory)
      .leftJoin(plantInstances, eq(careHistory.plantInstanceId, plantInstances.id))
      .leftJoin(plants, eq(plantInstances.plantId, plants.id))
      .where(and(...conditions))
      .orderBy(sortOrder);

    // Apply pagination
    if (filters?.limit) {
      query = query.limit(filters.limit) as any;
    }
    if (filters?.offset) {
      query = query.offset(filters.offset) as any;
    }

    const results = await query;

    return results.map(result => this.enhanceCareHistory(result.careHistory, result.plantInstance, result.plant));
  }

  /**
   * Get recent care history for a user
   */
  static async getRecentCareHistory(
    userId: number,
    limit: number = 20
  ): Promise<EnhancedCareHistory[]> {
    const results = await db
      .select({
        careHistory: careHistory,
        plantInstance: plantInstances,
        plant: plants,
      })
      .from(careHistory)
      .leftJoin(plantInstances, eq(careHistory.plantInstanceId, plantInstances.id))
      .leftJoin(plants, eq(plantInstances.plantId, plants.id))
      .where(eq(careHistory.userId, userId))
      .orderBy(desc(careHistory.careDate))
      .limit(limit);

    return results.map(result => this.enhanceCareHistory(result.careHistory, result.plantInstance, result.plant));
  }

  /**
   * Update care history entry
   */
  static async updateCareHistory(
    id: number,
    userId: number,
    updates: Partial<NewCareHistory>
  ): Promise<CareHistory | null> {
    const [updated] = await db
      .update(careHistory)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(careHistory.id, id),
          eq(careHistory.userId, userId)
        )
      )
      .returning();

    return updated || null;
  }

  /**
   * Delete care history entry
   */
  static async deleteCareHistory(id: number, userId: number): Promise<boolean> {
    // First check if record exists and belongs to user
    const existing = await db
      .select()
      .from(careHistory)
      .where(
        and(
          eq(careHistory.id, id),
          eq(careHistory.userId, userId)
        )
      )
      .limit(1);
    
    if (existing.length === 0) {
      return false; // Record doesn't exist or doesn't belong to user
    }
    
    // Perform the delete
    await db
      .delete(careHistory)
      .where(
        and(
          eq(careHistory.id, id),
          eq(careHistory.userId, userId)
        )
      );
    
    // Verify deletion by checking if record still exists
    const stillExists = await db
      .select()
      .from(careHistory)
      .where(eq(careHistory.id, id))
      .limit(1);
        
    return stillExists.length === 0;
  }

  /**
   * Get care statistics for a plant instance
   */
  static async getPlantCareStatistics(
    plantInstanceId: number,
    userId: number
  ): Promise<PlantCareStatistics | null> {
    // Get plant instance
    const [plantInstance] = await db
      .select()
      .from(plantInstances)
      .where(
        and(
          eq(plantInstances.id, plantInstanceId),
          eq(plantInstances.userId, userId)
        )
      )
      .limit(1);

    if (!plantInstance) return null;

    // Get care history
    const careHistoryData = await db
      .select()
      .from(careHistory)
      .where(
        and(
          eq(careHistory.plantInstanceId, plantInstanceId),
          eq(careHistory.userId, userId)
        )
      )
      .orderBy(asc(careHistory.careDate));

    return CareCalculator.calculatePlantCareStatistics(plantInstance, careHistoryData);
  }

  /**
   * Get care statistics for multiple plants
   */
  static async getBulkCareStatistics(
    plantInstanceIds: number[],
    userId: number
  ): Promise<PlantCareStatistics[]> {
    if (plantInstanceIds.length === 0) return [];

    // Get plant instances
    const plantInstancesData = await db
      .select()
      .from(plantInstances)
      .where(
        and(
          inArray(plantInstances.id, plantInstanceIds),
          eq(plantInstances.userId, userId)
        )
      );

    // Get care history for all plants
    const careHistoryData = await db
      .select()
      .from(careHistory)
      .where(
        and(
          inArray(careHistory.plantInstanceId, plantInstanceIds),
          eq(careHistory.userId, userId)
        )
      )
      .orderBy(asc(careHistory.careDate));

    // Group care history by plant instance
    const careHistoryByPlant = careHistoryData.reduce((acc, care) => {
      if (!acc[care.plantInstanceId]) {
        acc[care.plantInstanceId] = [];
      }
      acc[care.plantInstanceId].push(care);
      return acc;
    }, {} as Record<number, CareHistory[]>);

    // Calculate statistics for each plant
    return plantInstancesData.map(plantInstance => 
      CareCalculator.calculatePlantCareStatistics(
        plantInstance, 
        careHistoryByPlant[plantInstance.id] || []
      )
    );
  }

  /**
   * Get care dashboard data
   */
  static async getCareDashboardData(
    userId: number,
    options: Partial<CareDashboardQueryInput> = {}
  ): Promise<CareDashboardData> {
    const { includeInactive = false, daysAhead = 7 } = options;

    // Get all plant instances for the user
    const plantInstancesData = await db
      .select({
        plantInstance: plantInstances,
        plant: plants,
      })
      .from(plantInstances)
      .leftJoin(plants, eq(plantInstances.plantId, plants.id))
      .where(
        includeInactive 
          ? eq(plantInstances.userId, userId)
          : and(
              eq(plantInstances.userId, userId),
              eq(plantInstances.isActive, true)
            )
      );

    // Get recent care history for statistics
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const recentCareHistory = await db
      .select()
      .from(careHistory)
      .where(
        and(
          eq(careHistory.userId, userId),
          gte(careHistory.careDate, oneWeekAgo)
        )
      );

    // Enhance plant instances with care calculations
    const enhancedPlants = plantInstancesData.map(({ plantInstance, plant }) => {
      if (!plant) return null;
      
      const careStatus = CareCalculator.calculateCareStatus(plantInstance.fertilizerDue);
      const careUrgency = CareCalculator.calculateCareUrgency(plantInstance.fertilizerDue);
      const daysUntilFertilizerDue = CareCalculator.calculateDaysUntilFertilizerDue(plantInstance.fertilizerDue);
      const daysSinceLastFertilized = CareCalculator.calculateDaysSinceLastFertilized(plantInstance.lastFertilized);
      const daysSinceLastRepot = CareCalculator.calculateDaysSinceLastRepot(plantInstance.lastRepot);
      const displayName = plantInstance.nickname || plant.commonName;
      const primaryImage = plantInstance.images?.[0] || plant.defaultImage || null;

      return {
        ...plantInstance,
        plant,
        careStatus,
        careUrgency,
        daysUntilFertilizerDue,
        daysSinceLastFertilized,
        daysSinceLastRepot,
        displayName,
        primaryImage,
      };
    }).filter((plant): plant is EnhancedPlantInstance => plant !== null);

    // Categorize plants by care status
    const overdue = enhancedPlants.filter(p => p.careStatus === 'overdue');
    const dueToday = enhancedPlants.filter(p => p.careStatus === 'due_today');
    const dueSoon = enhancedPlants.filter(p => p.careStatus === 'due_soon');
    
    // Get recently cared plants (fertilized in last 3 days)
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const recentlyCared = enhancedPlants.filter(p => 
      p.lastFertilized && p.lastFertilized >= threeDaysAgo
    );

    // Calculate care streak (consecutive days with proper care)
    const careStreakDays = this.calculateUserCareStreak(userId, recentCareHistory);

    // Calculate average care consistency across all plants
    const averageCareConsistency = enhancedPlants.length > 0
      ? enhancedPlants.reduce((sum, plant) => {
          // Simplified consistency calculation for dashboard
          const daysSince = plant.daysSinceLastFertilized || 0;
          const scheduleDays = careHelpers.parseFertilizerSchedule(plant.fertilizerSchedule);
          const consistency = Math.max(0, 100 - (daysSince / scheduleDays) * 50);
          return sum + consistency;
        }, 0) / enhancedPlants.length
      : 0;

    return {
      overdue,
      dueToday,
      dueSoon,
      recentlyCared,
      statistics: {
        totalActivePlants: enhancedPlants.length,
        overdueCount: overdue.length,
        dueTodayCount: dueToday.length,
        dueSoonCount: dueSoon.length,
        careStreakDays,
        totalCareEventsThisWeek: recentCareHistory.length,
        averageCareConsistency: Math.round(averageCareConsistency),
      },
      quickActions: careHelpers.getDefaultQuickCareActions(),
    };
  }

  /**
   * Get care history count for a plant instance
   */
  static async getCareHistoryCount(
    plantInstanceId: number,
    userId: number,
    careType?: CareType
  ): Promise<number> {
    const conditions = [
      eq(careHistory.plantInstanceId, plantInstanceId),
      eq(careHistory.userId, userId)
    ];

    if (careType) {
      conditions.push(eq(careHistory.careType, careType));
    }

    const [result] = await db
      .select({ count: count() })
      .from(careHistory)
      .where(and(...conditions));

    return result.count;
  }

  /**
   * Get last care date for a specific care type
   */
  static async getLastCareDate(
    plantInstanceId: number,
    userId: number,
    careType: CareType
  ): Promise<Date | null> {
    const [result] = await db
      .select({ careDate: careHistory.careDate })
      .from(careHistory)
      .where(
        and(
          eq(careHistory.plantInstanceId, plantInstanceId),
          eq(careHistory.userId, userId),
          eq(careHistory.careType, careType)
        )
      )
      .orderBy(desc(careHistory.careDate))
      .limit(1);

    return result?.careDate || null;
  }

  /**
   * Bulk create care history entries
   */
  static async bulkCreateCareHistory(entries: NewCareHistory[]): Promise<CareHistory[]> {
    if (entries.length === 0) return [];

    const entriesWithTimestamps = entries.map(entry => ({
      ...entry,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    return await db
      .insert(careHistory)
      .values(entriesWithTimestamps)
      .returning();
  }

  /**
   * Private helper to enhance care history with computed properties
   */
  private static enhanceCareHistory(
    care: CareHistory,
    plantInstance?: PlantInstance | null,
    plant?: Plant | null
  ): EnhancedCareHistory {
    const now = new Date();
    const daysSinceCare = Math.floor((now.getTime() - care.careDate.getTime()) / (1000 * 60 * 60 * 24));
    const formattedDate = careHelpers.formatCareDate(care.careDate);
    const careTypeDisplay = careHelpers.getCareTypeDisplay(care.careType as CareType);

    return {
      ...care,
      plantInstance: plantInstance && plant ? { ...plantInstance, plant } : undefined,
      daysSinceCare,
      formattedDate,
      careTypeDisplay,
    };
  }

  /**
   * Private helper to calculate user care streak
   */
  private static calculateUserCareStreak(
    userId: number,
    recentCareHistory: CareHistory[]
  ): number {
    // Simplified care streak calculation
    // Count consecutive days with at least one care event
    const careByDate = recentCareHistory.reduce((acc, care) => {
      const dateKey = care.careDate.toISOString().split('T')[0];
      acc[dateKey] = true;
      return acc;
    }, {} as Record<string, boolean>);

    let streak = 0;
    const today = new Date();
    
    for (let i = 0; i < 30; i++) { // Check last 30 days
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      const dateKey = checkDate.toISOString().split('T')[0];
      
      if (careByDate[dateKey]) {
        streak++;
      } else if (i > 0) { // Don't break on first day (today) if no care
        break;
      }
    }

    return streak;
  }
}