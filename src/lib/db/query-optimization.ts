import 'server-only';

import { db } from '@/lib/db';
import { 
  plantInstances, 
  plants, 
  propagations, 
  careHistory,
  careGuides,
  users 
} from '@/lib/db/schema';
import { eq, and, or, desc, asc, sql, inArray, isNull, isNotNull, gte, lte, like, ilike } from 'drizzle-orm';
import { queryOptimization } from '@/lib/utils/performance';

// Create query cache instance
const queryCache = queryOptimization.createQueryCache<any>(5 * 60 * 1000); // 5 minutes TTL

/**
 * Optimized plant instance queries with proper indexing
 */
export const optimizedPlantQueries = {
  // Get user's active plants with plant taxonomy (uses user_active_idx)
  getUserActivePlants: async (userId: number, limit: number = 50, offset: number = 0) => {
    const cacheKey = `user_active_plants_${userId}_${limit}_${offset}`;
    const cached = queryCache.get(cacheKey);
    if (cached) return cached;

    const result = await db
      .select({
        id: plantInstances.id,
        nickname: plantInstances.nickname,
        location: plantInstances.location,
        lastFertilized: plantInstances.lastFertilized,
        fertilizerDue: plantInstances.fertilizerDue,
        lastRepot: plantInstances.lastRepot,
        images: plantInstances.images,
        createdAt: plantInstances.createdAt,
        plant: {
          id: plants.id,
          family: plants.family,
          genus: plants.genus,
          species: plants.species,
          cultivar: plants.cultivar,
          commonName: plants.commonName,
        }
      })
      .from(plantInstances)
      .leftJoin(plants, eq(plantInstances.plantId, plants.id))
      .where(and(
        eq(plantInstances.userId, userId),
        eq(plantInstances.isActive, true)
      ))
      .orderBy(desc(plantInstances.createdAt))
      .limit(limit)
      .offset(offset);

    queryCache.set(cacheKey, result);
    return result;
  },

  // Get plants needing care (uses fertilizer_due_idx)
  getPlantsNeedingCare: async (userId: number) => {
    const cacheKey = `plants_needing_care_${userId}`;
    const cached = queryCache.get(cacheKey);
    if (cached) return cached;

    const now = new Date();
    const result = await db
      .select({
        id: plantInstances.id,
        nickname: plantInstances.nickname,
        location: plantInstances.location,
        fertilizerDue: plantInstances.fertilizerDue,
        lastFertilized: plantInstances.lastFertilized,
        plant: {
          commonName: plants.commonName,
          genus: plants.genus,
          species: plants.species,
        }
      })
      .from(plantInstances)
      .leftJoin(plants, eq(plantInstances.plantId, plants.id))
      .where(and(
        eq(plantInstances.userId, userId),
        eq(plantInstances.isActive, true),
        or(
          lte(plantInstances.fertilizerDue, now),
          isNull(plantInstances.fertilizerDue)
        )
      ))
      .orderBy(asc(plantInstances.fertilizerDue));

    queryCache.set(cacheKey, result);
    return result;
  },

  // Search plants with fuzzy matching (uses taxonomy indexes)
  searchPlants: async (userId: number, searchTerm: string, limit: number = 20) => {
    const cacheKey = `search_plants_${userId}_${searchTerm}_${limit}`;
    const cached = queryCache.get(cacheKey);
    if (cached) return cached;

    const searchPattern = `%${searchTerm.toLowerCase()}%`;
    
    const result = await db
      .select({
        id: plantInstances.id,
        nickname: plantInstances.nickname,
        location: plantInstances.location,
        images: plantInstances.images,
        plant: {
          id: plants.id,
          family: plants.family,
          genus: plants.genus,
          species: plants.species,
          cultivar: plants.cultivar,
          commonName: plants.commonName,
        }
      })
      .from(plantInstances)
      .leftJoin(plants, eq(plantInstances.plantId, plants.id))
      .where(and(
        eq(plantInstances.userId, userId),
        eq(plantInstances.isActive, true),
        or(
          ilike(plantInstances.nickname, searchPattern),
          ilike(plantInstances.location, searchPattern),
          ilike(plants.commonName, searchPattern),
          ilike(plants.genus, searchPattern),
          ilike(plants.species, searchPattern),
          ilike(plants.cultivar, searchPattern),
          ilike(plants.family, searchPattern)
        )
      ))
      .limit(limit);

    queryCache.set(cacheKey, result);
    return result;
  },

  // Get plant statistics for dashboard
  getPlantStatistics: async (userId: number) => {
    const cacheKey = `plant_statistics_${userId}`;
    const cached = queryCache.get(cacheKey);
    if (cached) return cached;

    const [totalPlants, activePlants, plantsNeedingCare] = await Promise.all([
      // Total plants count
      db
        .select({ count: sql<number>`count(*)` })
        .from(plantInstances)
        .where(eq(plantInstances.userId, userId)),
      
      // Active plants count
      db
        .select({ count: sql<number>`count(*)` })
        .from(plantInstances)
        .where(and(
          eq(plantInstances.userId, userId),
          eq(plantInstances.isActive, true)
        )),
      
      // Plants needing care count
      db
        .select({ count: sql<number>`count(*)` })
        .from(plantInstances)
        .where(and(
          eq(plantInstances.userId, userId),
          eq(plantInstances.isActive, true),
          lte(plantInstances.fertilizerDue, new Date())
        ))
    ]);

    const result = {
      total: totalPlants[0]?.count || 0,
      active: activePlants[0]?.count || 0,
      needingCare: plantsNeedingCare[0]?.count || 0,
    };

    queryCache.set(cacheKey, result);
    return result;
  },
};

/**
 * Optimized propagation queries
 */
export const optimizedPropagationQueries = {
  // Get user propagations by status (uses user_status_idx)
  getUserPropagationsByStatus: async (userId: number, status?: 'started' | 'rooting' | 'ready' | 'planted') => {
    const cacheKey = `user_propagations_${userId}_${status || 'all'}`;
    const cached = queryCache.get(cacheKey);
    if (cached) return cached;

    const whereConditions = [eq(propagations.userId, userId)];
    if (status) {
      whereConditions.push(eq(propagations.status, status));
    }

    const result = await db
      .select({
        id: propagations.id,
        nickname: propagations.nickname,
        location: propagations.location,
        dateStarted: propagations.dateStarted,
        status: propagations.status,
        sourceType: propagations.sourceType,
        externalSource: propagations.externalSource,
        externalSourceDetails: propagations.externalSourceDetails,
        images: propagations.images,
        plant: {
          commonName: plants.commonName,
          genus: plants.genus,
          species: plants.species,
          cultivar: plants.cultivar,
        },
        parentInstance: {
          id: plantInstances.id,
          nickname: plantInstances.nickname,
        }
      })
      .from(propagations)
      .leftJoin(plants, eq(propagations.plantId, plants.id))
      .leftJoin(plantInstances, eq(propagations.parentInstanceId, plantInstances.id))
      .where(and(...whereConditions))
      .orderBy(desc(propagations.dateStarted));

    queryCache.set(cacheKey, result);
    return result;
  },

  // Get propagation statistics by source type
  getPropagationStatistics: async (userId: number) => {
    const cacheKey = `propagation_statistics_${userId}`;
    const cached = queryCache.get(cacheKey);
    if (cached) return cached;

    const result = await db
      .select({
        sourceType: propagations.sourceType,
        status: propagations.status,
        count: sql<number>`count(*)`
      })
      .from(propagations)
      .where(eq(propagations.userId, userId))
      .groupBy(propagations.sourceType, propagations.status);

    queryCache.set(cacheKey, result);
    return result;
  },
};

/**
 * Optimized care history queries
 */
export const optimizedCareQueries = {
  // Get care history for plant (uses plant_care_date_idx)
  getPlantCareHistory: async (plantInstanceId: number, limit: number = 50) => {
    const cacheKey = `plant_care_history_${plantInstanceId}_${limit}`;
    const cached = queryCache.get(cacheKey);
    if (cached) return cached;

    const result = await db
      .select()
      .from(careHistory)
      .where(eq(careHistory.plantInstanceId, plantInstanceId))
      .orderBy(desc(careHistory.careDate))
      .limit(limit);

    queryCache.set(cacheKey, result);
    return result;
  },

  // Get recent care activities for user (uses user_care_type_idx)
  getRecentCareActivities: async (userId: number, limit: number = 20) => {
    const cacheKey = `recent_care_activities_${userId}_${limit}`;
    const cached = queryCache.get(cacheKey);
    if (cached) return cached;

    const result = await db
      .select({
        id: careHistory.id,
        careType: careHistory.careType,
        careDate: careHistory.careDate,
        notes: careHistory.notes,
        plantInstance: {
          id: plantInstances.id,
          nickname: plantInstances.nickname,
        },
        plant: {
          commonName: plants.commonName,
          genus: plants.genus,
          species: plants.species,
        }
      })
      .from(careHistory)
      .leftJoin(plantInstances, eq(careHistory.plantInstanceId, plantInstances.id))
      .leftJoin(plants, eq(plantInstances.plantId, plants.id))
      .where(eq(careHistory.userId, userId))
      .orderBy(desc(careHistory.careDate))
      .limit(limit);

    queryCache.set(cacheKey, result);
    return result;
  },
};

/**
 * Optimized taxonomy queries
 */
export const optimizedTaxonomyQueries = {
  // Search plant taxonomy with autocomplete (uses taxonomy indexes)
  searchPlantTaxonomy: async (searchTerm: string, limit: number = 10) => {
    const cacheKey = `search_taxonomy_${searchTerm}_${limit}`;
    const cached = queryCache.get(cacheKey);
    if (cached) return cached;

    const searchPattern = `%${searchTerm.toLowerCase()}%`;
    
    const result = await db
      .select({
        id: plants.id,
        family: plants.family,
        genus: plants.genus,
        species: plants.species,
        cultivar: plants.cultivar,
        commonName: plants.commonName,
        isVerified: plants.isVerified,
      })
      .from(plants)
      .where(or(
        ilike(plants.commonName, searchPattern),
        ilike(plants.genus, searchPattern),
        ilike(plants.species, searchPattern),
        ilike(plants.cultivar, searchPattern),
        ilike(plants.family, searchPattern)
      ))
      .orderBy(
        desc(plants.isVerified), // Verified plants first
        asc(plants.commonName)
      )
      .limit(limit);

    queryCache.set(cacheKey, result);
    return result;
  },

  // Get popular plants (most used in plant instances)
  getPopularPlants: async (limit: number = 10) => {
    const cacheKey = `popular_plants_${limit}`;
    const cached = queryCache.get(cacheKey);
    if (cached) return cached;

    const result = await db
      .select({
        id: plants.id,
        family: plants.family,
        genus: plants.genus,
        species: plants.species,
        cultivar: plants.cultivar,
        commonName: plants.commonName,
        usageCount: sql<number>`count(${plantInstances.id})`
      })
      .from(plants)
      .leftJoin(plantInstances, eq(plants.id, plantInstances.plantId))
      .groupBy(plants.id)
      .orderBy(desc(sql`count(${plantInstances.id})`))
      .limit(limit);

    queryCache.set(cacheKey, result);
    return result;
  },
};

/**
 * Batch query utilities for performance
 */
export const batchQueries = {
  // Get dashboard data in a single batch
  getDashboardData: async (userId: number) => {
    const cacheKey = `dashboard_data_${userId}`;
    const cached = queryCache.get(cacheKey);
    if (cached) return cached;

    const [
      plantStats,
      plantsNeedingCare,
      recentCareActivities,
      activePropagations,
      propagationStats
    ] = await queryOptimization.batchQueries([
      () => optimizedPlantQueries.getPlantStatistics(userId),
      () => optimizedPlantQueries.getPlantsNeedingCare(userId),
      () => optimizedCareQueries.getRecentCareActivities(userId, 10),
      () => optimizedPropagationQueries.getUserPropagationsByStatus(userId),
      () => optimizedPropagationQueries.getPropagationStatistics(userId),
    ]);

    const result = {
      plantStats,
      plantsNeedingCare,
      recentCareActivities,
      activePropagations,
      propagationStats,
    };

    queryCache.set(cacheKey, result);
    return result;
  },

  // Get plant detail data in a single batch
  getPlantDetailData: async (plantInstanceId: number, userId: number) => {
    const cacheKey = `plant_detail_data_${plantInstanceId}_${userId}`;
    const cached = queryCache.get(cacheKey);
    if (cached) return cached;

    const [plantInstance, careHistory, relatedPropagations] = await queryOptimization.batchQueries([
      () => db
        .select()
        .from(plantInstances)
        .leftJoin(plants, eq(plantInstances.plantId, plants.id))
        .where(and(
          eq(plantInstances.id, plantInstanceId),
          eq(plantInstances.userId, userId)
        ))
        .limit(1),
      
      () => optimizedCareQueries.getPlantCareHistory(plantInstanceId),
      
      () => db
        .select()
        .from(propagations)
        .where(eq(propagations.parentInstanceId, plantInstanceId))
        .orderBy(desc(propagations.dateStarted))
    ]);

    const result = {
      plantInstance: plantInstance[0] || null,
      careHistory,
      relatedPropagations,
    };

    queryCache.set(cacheKey, result);
    return result;
  },
};

/**
 * Query performance monitoring
 */
export const queryPerformance = {
  // Monitor slow queries
  monitorQuery: async <T>(
    queryName: string,
    queryFn: () => Promise<T>,
    slowThreshold: number = 1000
  ): Promise<T> => {
    const start = performance.now();
    const result = await queryFn();
    const duration = performance.now() - start;

    if (duration > slowThreshold) {
      console.warn(`Slow query detected: ${queryName} took ${duration.toFixed(2)}ms`);
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`Query ${queryName}: ${duration.toFixed(2)}ms`);
    }

    return result;
  },

  // Clear query cache
  clearCache: () => {
    queryCache.clear();
  },
};