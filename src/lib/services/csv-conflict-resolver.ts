import { db } from '@/lib/db';
import { plants, plantInstances, propagations } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import type { ImportConflict, ImportSummary } from '@/lib/validation/csv-schemas';

export interface ConflictResolution {
  conflictId: string;
  action: 'skip' | 'merge' | 'create_new' | 'manual_review';
  data?: any;
}

export class CSVConflictResolver {
  private userId: number;

  constructor(userId: number) {
    this.userId = userId;
  }

  /**
   * Resolve conflicts based on user decisions
   */
  async resolveConflicts(
    conflicts: ImportConflict[],
    resolutions: ConflictResolution[]
  ): Promise<ImportSummary> {
    const startTime = new Date();
    let successfulResolutions = 0;
    const errors: any[] = [];

    for (const resolution of resolutions) {
      const conflict = conflicts.find(c => 
        this.generateConflictId(c) === resolution.conflictId
      );

      if (!conflict) {
        errors.push({
          rowIndex: -1,
          message: `Conflict not found: ${resolution.conflictId}`,
          severity: 'error',
        });
        continue;
      }

      try {
        await this.resolveConflict(conflict, resolution);
        successfulResolutions++;
      } catch (error) {
        errors.push({
          rowIndex: conflict.rowIndex,
          message: error instanceof Error ? error.message : 'Resolution failed',
          severity: 'error',
        });
      }
    }

    return {
      totalRows: conflicts.length,
      processedRows: resolutions.length,
      successfulImports: successfulResolutions,
      errors,
      conflicts: [],
      warnings: [],
      skippedRows: conflicts.length - resolutions.length,
      importType: 'plant_taxonomy', // Will be overridden based on context
      startTime,
      endTime: new Date(),
      userId: this.userId,
    };
  }

  /**
   * Resolve a single conflict based on the resolution action
   */
  private async resolveConflict(
    conflict: ImportConflict,
    resolution: ConflictResolution
  ): Promise<void> {
    switch (conflict.type) {
      case 'duplicate_plant':
        await this.resolveDuplicatePlant(conflict, resolution);
        break;
      case 'missing_parent':
        await this.resolveMissingParent(conflict, resolution);
        break;
      case 'invalid_taxonomy':
        await this.resolveInvalidTaxonomy(conflict, resolution);
        break;
      default:
        throw new Error(`Unknown conflict type: ${conflict.type}`);
    }
  }

  /**
   * Resolve duplicate plant conflicts
   */
  private async resolveDuplicatePlant(
    conflict: ImportConflict,
    resolution: ConflictResolution
  ): Promise<void> {
    switch (resolution.action) {
      case 'skip':
        // Do nothing - skip the duplicate
        break;

      case 'merge':
        // Update existing plant with new information if provided
        if (resolution.data && conflict.existingRecord) {
          await db
            .update(plants)
            .set({
              commonName: resolution.data.commonName || conflict.existingRecord.commonName,
              careInstructions: resolution.data.careInstructions || conflict.existingRecord.careInstructions,
              updatedAt: new Date(),
            })
            .where(eq(plants.id, conflict.existingRecord.id));
        }
        break;

      case 'create_new':
        // Create a new plant with modified data to avoid duplicate
        if (resolution.data) {
          await db.insert(plants).values({
            family: resolution.data.family,
            genus: resolution.data.genus,
            species: resolution.data.species,
            commonName: resolution.data.commonName,
            careInstructions: resolution.data.careInstructions,
            createdBy: this.userId,
            isVerified: false,
          });
        }
        break;

      case 'manual_review':
        // Mark for manual review - no automatic action
        throw new Error('Manual review required - no automatic resolution available');

      default:
        throw new Error(`Invalid resolution action: ${resolution.action}`);
    }
  }

  /**
   * Resolve missing parent conflicts for propagations
   */
  private async resolveMissingParent(
    conflict: ImportConflict,
    resolution: ConflictResolution
  ): Promise<void> {
    switch (resolution.action) {
      case 'skip':
        // Skip creating the propagation
        break;

      case 'create_new':
        // Create propagation without parent link
        if (resolution.data) {
          await db.insert(propagations).values({
            userId: this.userId,
            plantId: resolution.data.plantId,
            parentInstanceId: null, // No parent
            nickname: resolution.data.nickname,
            location: resolution.data.location,
            dateStarted: new Date(resolution.data.dateStarted),
            status: 'started',
          });
        }
        break;

      case 'merge':
        // Link to existing parent instance if specified
        if (resolution.data && resolution.data.parentInstanceId) {
          await db.insert(propagations).values({
            userId: this.userId,
            plantId: resolution.data.plantId,
            parentInstanceId: resolution.data.parentInstanceId,
            nickname: resolution.data.nickname,
            location: resolution.data.location,
            dateStarted: new Date(resolution.data.dateStarted),
            status: 'started',
          });
        }
        break;

      case 'manual_review':
        throw new Error('Manual review required - no automatic resolution available');

      default:
        throw new Error(`Invalid resolution action: ${resolution.action}`);
    }
  }

  /**
   * Resolve invalid taxonomy conflicts
   */
  private async resolveInvalidTaxonomy(
    conflict: ImportConflict,
    resolution: ConflictResolution
  ): Promise<void> {
    switch (resolution.action) {
      case 'skip':
        // Skip the invalid entry
        break;

      case 'create_new':
        // Create with corrected taxonomy data
        if (resolution.data) {
          await db.insert(plants).values({
            family: resolution.data.family,
            genus: resolution.data.genus,
            species: resolution.data.species,
            commonName: resolution.data.commonName,
            careInstructions: resolution.data.careInstructions,
            createdBy: this.userId,
            isVerified: false,
          });
        }
        break;

      case 'merge':
        // Link to existing plant with similar taxonomy
        if (resolution.data && resolution.data.existingPlantId) {
          // The conflict resolution would involve using the existing plant
          // instead of creating a new one - this is handled at the import level
        }
        break;

      case 'manual_review':
        throw new Error('Manual review required - no automatic resolution available');

      default:
        throw new Error(`Invalid resolution action: ${resolution.action}`);
    }
  }

  /**
   * Generate a unique ID for a conflict for tracking resolutions
   */
  private generateConflictId(conflict: ImportConflict): string {
    return `${conflict.type}_${conflict.rowIndex}_${Date.now()}`;
  }

  /**
   * Get suggested resolutions for a conflict
   */
  getSuggestedResolutions(conflict: ImportConflict): ConflictResolution[] {
    const suggestions: ConflictResolution[] = [];
    const conflictId = this.generateConflictId(conflict);

    switch (conflict.type) {
      case 'duplicate_plant':
        suggestions.push(
          { conflictId, action: 'skip' },
          { conflictId, action: 'merge' },
          { conflictId, action: 'create_new' }
        );
        break;

      case 'missing_parent':
        suggestions.push(
          { conflictId, action: 'skip' },
          { conflictId, action: 'create_new' }
        );
        break;

      case 'invalid_taxonomy':
        suggestions.push(
          { conflictId, action: 'skip' },
          { conflictId, action: 'create_new' },
          { conflictId, action: 'manual_review' }
        );
        break;
    }

    return suggestions;
  }

  /**
   * Validate conflict resolution data
   */
  validateResolution(conflict: ImportConflict, resolution: ConflictResolution): boolean {
    switch (conflict.type) {
      case 'duplicate_plant':
        if (resolution.action === 'create_new' || resolution.action === 'merge') {
          return resolution.data && 
                 resolution.data.family && 
                 resolution.data.genus && 
                 resolution.data.species && 
                 resolution.data.commonName;
        }
        return true;

      case 'missing_parent':
        if (resolution.action === 'create_new' || resolution.action === 'merge') {
          return resolution.data && 
                 resolution.data.plantId && 
                 resolution.data.nickname && 
                 resolution.data.location && 
                 resolution.data.dateStarted;
        }
        return true;

      case 'invalid_taxonomy':
        if (resolution.action === 'create_new') {
          return resolution.data && 
                 resolution.data.family && 
                 resolution.data.genus && 
                 resolution.data.species && 
                 resolution.data.commonName;
        }
        return true;

      default:
        return false;
    }
  }

  /**
   * Get available parent instances for propagation conflicts
   */
  async getAvailableParentInstances(plantId: number) {
    return await db
      .select({
        id: plantInstances.id,
        nickname: plantInstances.nickname,
        location: plantInstances.location,
      })
      .from(plantInstances)
      .where(
        and(
          eq(plantInstances.userId, this.userId),
          eq(plantInstances.plantId, plantId),
          eq(plantInstances.isActive, true)
        )
      );
  }
}