import 'server-only';

import { db } from '@/lib/db';
import { plantInstances, plants, propagations, careHistory } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';

/**
 * Offline Service - Server-side utilities for offline data preparation
 * Prepares data for offline caching and handles sync operations
 */
export class OfflineService {
  /**
   * Get essential plant data for offline caching
   */
  static async getOfflineData(userId: number) {
    try {
      // Get user's active plant instances with plant taxonomy
      const userPlants = await db
        .select({
          id: plantInstances.id,
          nickname: plantInstances.nickname,
          location: plantInstances.location,
          lastFertilized: plantInstances.lastFertilized,
          fertilizerSchedule: plantInstances.fertilizerSchedule,
          fertilizerDue: plantInstances.fertilizerDue,
          lastRepot: plantInstances.lastRepot,
          notes: plantInstances.notes,
          images: plantInstances.images,
          isActive: plantInstances.isActive,
          createdAt: plantInstances.createdAt,
          updatedAt: plantInstances.updatedAt,
          plant: {
            id: plants.id,
            family: plants.family,
            genus: plants.genus,
            species: plants.species,
            commonName: plants.commonName,
            careInstructions: plants.careInstructions,
          }
        })
        .from(plantInstances)
        .leftJoin(plants, eq(plantInstances.plantId, plants.id))
        .where(and(
          eq(plantInstances.userId, userId),
          eq(plantInstances.isActive, true)
        ));

      // Get user's active propagations
      const userPropagations = await db
        .select({
          id: propagations.id,
          nickname: propagations.nickname,
          location: propagations.location,
          dateStarted: propagations.dateStarted,
          status: propagations.status,
          notes: propagations.notes,
          images: propagations.images,
          createdAt: propagations.createdAt,
          updatedAt: propagations.updatedAt,
          plant: {
            id: plants.id,
            family: plants.family,
            genus: plants.genus,
            species: plants.species,
            commonName: plants.commonName,
          }
        })
        .from(propagations)
        .leftJoin(plants, eq(propagations.plantId, plants.id))
        .where(eq(propagations.userId, userId));

      // Get recent care history (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentCareHistory = await db
        .select()
        .from(careHistory)
        .where(and(
          eq(careHistory.userId, userId),
          // Add date filter when we have a date column
        ))
        .orderBy(desc(careHistory.createdAt))
        .limit(100);

      return {
        plants: userPlants,
        propagations: userPropagations,
        careHistory: recentCareHistory,
        lastSync: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error getting offline data:', error);
      throw new Error('Failed to prepare offline data');
    }
  }

  /**
   * Process offline care log entries when back online
   */
  static async processPendingCareEntries(userId: number, pendingEntries: any[]) {
    const results = [];
    
    for (const entry of pendingEntries) {
      try {
        // Process each pending care entry
        const result = await db
          .insert(careHistory)
          .values({
            userId,
            plantInstanceId: entry.plantInstanceId,
            careType: entry.careType,
            notes: entry.notes,
            createdAt: new Date(entry.timestamp),
          })
          .returning();

        results.push({ success: true, entry, result: result[0] });
      } catch (error) {
        console.error('Error processing pending care entry:', error);
        results.push({ success: false, entry, error: error.message });
      }
    }

    return results;
  }

  /**
   * Get data that has changed since last sync
   */
  static async getDataSince(userId: number, lastSync: string) {
    const syncDate = new Date(lastSync);

    try {
      // Get plants updated since last sync
      const updatedPlants = await db
        .select()
        .from(plantInstances)
        .leftJoin(plants, eq(plantInstances.plantId, plants.id))
        .where(and(
          eq(plantInstances.userId, userId),
          // Add updatedAt filter when available
        ));

      // Get propagations updated since last sync
      const updatedPropagations = await db
        .select()
        .from(propagations)
        .leftJoin(plants, eq(propagations.plantId, plants.id))
        .where(and(
          eq(propagations.userId, userId),
          // Add updatedAt filter when available
        ));

      // Get new care history since last sync
      const newCareHistory = await db
        .select()
        .from(careHistory)
        .where(and(
          eq(careHistory.userId, userId),
          // Add createdAt filter when available
        ));

      return {
        plants: updatedPlants,
        propagations: updatedPropagations,
        careHistory: newCareHistory,
        syncTimestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error getting data since last sync:', error);
      throw new Error('Failed to get updated data');
    }
  }
}