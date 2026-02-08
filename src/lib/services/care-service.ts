import { db } from '@/lib/db';
import { plantInstances } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import type { 
  CareFormInput,
  QuickCareLogInput,
  BulkCareInput,
  CareFilterInput 
} from '@/lib/validation/care-schemas';
import type { 
  BulkCareResult,
  EnhancedCareHistory,
  CareDashboardData,
  PlantCareStatistics
} from '@/lib/types/care-types';
import { careHelpers } from '@/lib/types/care-types';
import { CareHistoryQueries } from '@/lib/db/queries/care-history';
import { CareCalculator } from './care-calculator';
import { careValidation } from '@/lib/validation/care-schemas';

/**
 * Service layer for care operations
 */
export class CareService {
  /**
   * Log a new care event
   */
  static async logCareEvent(
    userId: number,
    careData: CareFormInput
  ): Promise<{ success: boolean; careHistory?: EnhancedCareHistory; error?: string }> {
    try {
      // Validate input
      const validation = careValidation.validateCareForm(careData);
      if (!validation.success) {
        return {
          success: false,
          error: validation.error.issues[0]?.message || 'Invalid care data'
        };
      }

      // Create care history entry
      const newCareHistory = await CareHistoryQueries.createCareHistory({
        userId,
        plantInstanceId: careData.plantInstanceId,
        careType: careData.careType,
        careDate: careData.careDate,
        notes: careData.notes,
        fertilizerType: careData.fertilizerType,
        potSize: careData.potSize,
        soilType: careData.soilType,
        images: careData.images || [],
      });

      // Update plant instance if needed
      if (careData.updateSchedule && careData.careType === 'fertilizer') {
        await this.updatePlantFertilizerSchedule(
          careData.plantInstanceId,
          userId,
          careData.careDate
        );
      }

      if (careData.careType === 'repot') {
        await this.updatePlantRepotDate(
          careData.plantInstanceId,
          userId,
          careData.careDate
        );
      }

      if (careData.careType === 'flush') {
        await this.updatePlantFlushDate(
          careData.plantInstanceId,
          userId,
          careData.careDate
        );
      }

      // Get enhanced care history for response
      const careHistoryRecord = await CareHistoryQueries.getCareHistoryById(newCareHistory.id);
      
      if (!careHistoryRecord) {
        return {
          success: false,
          error: 'Failed to retrieve care history after creation'
        };
      }

      // Create enhanced care history record
      const now = new Date();
      const daysSinceCare = Math.floor((now.getTime() - careHistoryRecord.careDate.getTime()) / (1000 * 60 * 60 * 24));
      
      const enhancedCareHistory: EnhancedCareHistory = {
        ...careHistoryRecord,
        daysSinceCare,
        formattedDate: careHelpers.formatCareDate(careHistoryRecord.careDate),
        careTypeDisplay: careHelpers.getCareTypeDisplay(careHistoryRecord.careType),
      };
      
      return {
        success: true,
        careHistory: enhancedCareHistory
      };
    } catch (error) {
      console.error('Error logging care event:', error);
      return {
        success: false,
        error: 'Failed to log care event'
      };
    }
  }

  /**
   * Quick care logging for simple actions
   */
  static async quickCareLog(
    userId: number,
    quickCareData: QuickCareLogInput
  ): Promise<{ success: boolean; careHistory?: EnhancedCareHistory; error?: string }> {
    try {
      // Validate input
      const validation = careValidation.validateQuickCareLog(quickCareData);
      if (!validation.success) {
        return {
          success: false,
          error: validation.error.issues[0]?.message || 'Invalid quick care data'
        };
      }

      // Convert to full care form data
      const careFormData: CareFormInput = {
        plantInstanceId: quickCareData.plantInstanceId,
        careType: quickCareData.careType,
        careDate: quickCareData.careDate,
        notes: quickCareData.notes,
        images: [],
        updateSchedule: quickCareData.careType === 'fertilizer',
      };

      return await this.logCareEvent(userId, careFormData);
    } catch (error) {
      console.error('Error with quick care log:', error);
      return {
        success: false,
        error: 'Failed to log quick care'
      };
    }
  }

  /**
   * Bulk care operation for multiple plants
   */
  static async bulkCareOperation(
    userId: number,
    bulkCareData: BulkCareInput
  ): Promise<BulkCareResult> {
    try {
      // Validate input
      const validation = careValidation.validateBulkCare(bulkCareData);
      if (!validation.success) {
        return {
          success: false,
          successCount: 0,
          failureCount: bulkCareData.plantInstanceIds.length,
          results: bulkCareData.plantInstanceIds.map(id => ({
            plantInstanceId: id,
            success: false,
            error: validation.error.issues[0]?.message || 'Invalid bulk care data'
          }))
        };
      }

      const results = [];
      let successCount = 0;
      let failureCount = 0;

      // Process each plant instance
      for (const plantInstanceId of bulkCareData.plantInstanceIds) {
        try {
          const careFormData: CareFormInput = {
            plantInstanceId,
            careType: bulkCareData.careType,
            careDate: bulkCareData.careDate,
            notes: bulkCareData.notes,
            fertilizerType: bulkCareData.fertilizerType,
            images: [],
            updateSchedule: bulkCareData.careType === 'fertilizer',
          };

          const result = await this.logCareEvent(userId, careFormData);
          
          if (result.success) {
            successCount++;
            results.push({
              plantInstanceId,
              success: true
            });
          } else {
            failureCount++;
            results.push({
              plantInstanceId,
              success: false,
              error: result.error
            });
          }
        } catch (error) {
          failureCount++;
          results.push({
            plantInstanceId,
            success: false,
            error: 'Failed to process care for this plant'
          });
        }
      }

      return {
        success: successCount > 0,
        successCount,
        failureCount,
        results
      };
    } catch (error) {
      console.error('Error with bulk care operation:', error);
      return {
        success: false,
        successCount: 0,
        failureCount: bulkCareData.plantInstanceIds.length,
        results: bulkCareData.plantInstanceIds.map(id => ({
          plantInstanceId: id,
          success: false,
          error: 'Failed to process bulk care operation'
        }))
      };
    }
  }

  /**
   * Get care history for a plant
   */
  static async getPlantCareHistory(
    plantInstanceId: number,
    userId: number,
    filters?: Partial<CareFilterInput>
  ): Promise<EnhancedCareHistory[]> {
    return await CareHistoryQueries.getCareHistoryForPlant(plantInstanceId, userId, filters);
  }

  /**
   * Get care statistics for a plant
   */
  static async getPlantCareStatistics(
    plantInstanceId: number,
    userId: number
  ): Promise<PlantCareStatistics | null> {
    return await CareHistoryQueries.getPlantCareStatistics(plantInstanceId, userId);
  }

  /**
   * Get care dashboard data
   */
  static async getCareDashboard(userId: number): Promise<CareDashboardData> {
    return await CareHistoryQueries.getCareDashboardData(userId);
  }

  /**
   * Update care history entry
   */
  static async updateCareHistory(
    careHistoryId: number,
    userId: number,
    updates: Partial<CareFormInput>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const updated = await CareHistoryQueries.updateCareHistory(careHistoryId, userId, {
        careType: updates.careType,
        careDate: updates.careDate,
        notes: updates.notes,
        fertilizerType: updates.fertilizerType,
        potSize: updates.potSize,
        soilType: updates.soilType,
        images: updates.images,
      });

      if (!updated) {
        return {
          success: false,
          error: 'Care history entry not found or access denied'
        };
      }

      return { success: true };
    } catch (error) {
      console.error('Error updating care history:', error);
      return {
        success: false,
        error: 'Failed to update care history'
      };
    }
  }

  /**
   * Delete care history entry
   */
  static async deleteCareHistory(
    careHistoryId: number,
    userId: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const deleted = await CareHistoryQueries.deleteCareHistory(careHistoryId, userId);

      if (!deleted) {
        return {
          success: false,
          error: 'Care history entry not found or access denied'
        };
      }

      return { success: true };
    } catch (error) {
      console.error('Error deleting care history:', error);
      return {
        success: false,
        error: 'Failed to delete care history'
      };
    }
  }

  /**
   * Get recommended care actions for a plant
   */
  static async getRecommendedCareActions(
    plantInstanceId: number,
    userId: number
  ): Promise<string[]> {
    try {
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

      if (!plantInstance) return [];

      // Get care history
      const careHistoryData = await CareHistoryQueries.getCareHistoryForPlant(
        plantInstanceId,
        userId
      );

      return CareCalculator.getRecommendedCareActions(
        plantInstance,
        careHistoryData,
        new Date()
      );
    } catch {
      console.error('Error getting recommended care actions');
      return [];
    }
  }

  /**
   * Calculate next fertilizer due date for a plant
   */
  static async calculateNextFertilizerDue(
    plantInstanceId: number,
    userId: number,
    lastFertilizedDate: Date
  ): Promise<Date | null> {
    try {
      // Get plant instance to get schedule
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

      return CareCalculator.calculateNextFertilizerDue(
        lastFertilizedDate,
        plantInstance.fertilizerSchedule
      );
    } catch (error) {
      console.error('Error calculating next fertilizer due:', error);
      return null;
    }
  }

  /**
   * Private helper to update plant fertilizer schedule
   */
  private static async updatePlantFertilizerSchedule(
    plantInstanceId: number,
    userId: number,
    lastFertilizedDate: Date
  ): Promise<void> {
    // Get current plant instance
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

    if (!plantInstance) return;

    // Calculate next due date
    const nextDueDate = CareCalculator.calculateNextFertilizerDue(
      lastFertilizedDate,
      plantInstance.fertilizerSchedule
    );

    // Update plant instance
    await db
      .update(plantInstances)
      .set({
        lastFertilized: lastFertilizedDate,
        fertilizerDue: nextDueDate,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(plantInstances.id, plantInstanceId),
          eq(plantInstances.userId, userId)
        )
      );
  }

  /**
   * Private helper to update plant repot date
   */
  private static async updatePlantRepotDate(
    plantInstanceId: number,
    userId: number,
    repotDate: Date
  ): Promise<void> {
    await db
      .update(plantInstances)
      .set({
        lastRepot: repotDate,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(plantInstances.id, plantInstanceId),
          eq(plantInstances.userId, userId)
        )
      );
  }

  /**
   * Private helper to update plant flush date
   */
  private static async updatePlantFlushDate(
    plantInstanceId: number,
    userId: number,
    flushDate: Date
  ): Promise<void> {
    await db
      .update(plantInstances)
      .set({
        lastFlush: flushDate,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(plantInstances.id, plantInstanceId),
          eq(plantInstances.userId, userId)
        )
      );
  }
}