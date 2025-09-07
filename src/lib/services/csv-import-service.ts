import { CSVImportProcessor } from './csv-import-processor';
import { CSVConflictResolver, type ConflictResolution } from './csv-conflict-resolver';
import {
  csvImportConfigSchema,
  csvFileSchema,
  type CSVImportConfig,
  type CSVFile,
  type ImportSummary,
  type ImportProgress,
  type ImportConflict,
} from '@/lib/validation/csv-schemas';
import { importProgressStore } from '@/lib/db/import-progress';
import { v4 as uuidv4 } from 'uuid';

export type ImportType = 'plant_taxonomy' | 'plant_instances' | 'propagations';

export class CSVImportService {
  /**
   * Start a CSV import process
   */
  async startImport(
    file: CSVFile,
    importType: ImportType,
    config: Partial<CSVImportConfig>
  ): Promise<{ importId: string; progress: ImportProgress }> {
    // Validate file
    const validatedFile = csvFileSchema.parse(file);
    
    // Create full config with defaults
    const fullConfig = csvImportConfigSchema.parse({
      ...config,
      userId: config.userId, // Required field
    });

    // Create import progress tracking
    const importId = uuidv4();
    const progress: ImportProgress = {
      id: importId,
      userId: fullConfig.userId,
      fileName: validatedFile.name,
      importType,
      status: 'pending',
      progress: 0,
      totalRows: 0,
      processedRows: 0,
      errors: [],
      conflicts: [],
      startTime: new Date(),
    };

    importProgressStore.set(importId, progress);

    // Start processing asynchronously
    this.processImportAsync(importId, validatedFile.content, importType, fullConfig);

    return { importId, progress };
  }

  /**
   * Get import progress
   */
  getImportProgress(importId: string): ImportProgress | null {
    return importProgressStore.get(importId);
  }

  /**
   * Get all active imports for a user
   */
  getUserImports(userId: number): ImportProgress[] {
    return importProgressStore.getAllForUser(userId);
  }

  /**
   * Cancel an import
   */
  cancelImport(importId: string): boolean {
    const progress = importProgressStore.get(importId);
    if (progress && progress.status === 'processing') {
      progress.status = 'failed';
      progress.endTime = new Date();
      importProgressStore.set(importId, progress);
      return true;
    }
    return false;
  }

  /**
   * Resolve conflicts from an import
   */
  async resolveConflicts(
    importId: string,
    resolutions: ConflictResolution[]
  ): Promise<ImportSummary> {
    const progress = importProgressStore.get(importId);
    if (!progress) {
      throw new Error('Import not found');
    }

    if (progress.status !== 'completed' || progress.conflicts.length === 0) {
      throw new Error('No conflicts to resolve');
    }

    const resolver = new CSVConflictResolver(progress.userId);
    const summary = await resolver.resolveConflicts(progress.conflicts, resolutions);

    // Update progress
    progress.conflicts = progress.conflicts.filter(conflict => 
      !resolutions.some(res => res.conflictId === this.generateConflictId(conflict))
    );
    importProgressStore.set(importId, progress);

    return summary;
  }

  /**
   * Get suggested resolutions for conflicts
   */
  getSuggestedResolutions(importId: string): ConflictResolution[] {
    const progress = importProgressStore.get(importId);
    if (!progress || progress.conflicts.length === 0) {
      return [];
    }

    const resolver = new CSVConflictResolver(progress.userId);
    const suggestions: ConflictResolution[] = [];

    for (const conflict of progress.conflicts) {
      suggestions.push(...resolver.getSuggestedResolutions(conflict));
    }

    return suggestions;
  }

  /**
   * Clean up completed imports
   */
  cleanupCompletedImports(olderThanHours: number = 24): void {
    importProgressStore.cleanup(olderThanHours * 60 * 60 * 1000);
  }

  /**
   * Keep completed imports available for at least 1 hour
   */
  private scheduleCleanup(importId: string): void {
    setTimeout(() => {
      const progress = importProgressStore.get(importId);
      if (progress && progress.endTime && progress.status !== 'processing') {
        // Keep for at least 1 hour after completion
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        if (progress.endTime < oneHourAgo) {
          importProgressStore.delete(importId);
        }
      }
    }, 60 * 60 * 1000); // 1 hour
  }

  /**
   * Validate CSV content before import
   */
  async validateCSVContent(
    content: string,
    importType: ImportType
  ): Promise<{ isValid: boolean; errors: string[]; preview: any[] }> {
    const errors: string[] = [];
    let preview: any[] = [];

    try {
      // Basic CSV parsing validation
      const lines = content.trim().split('\n');
      if (lines.length < 2) {
        errors.push('CSV must have at least a header row and one data row');
        return { isValid: false, errors, preview };
      }

      // Parse first few rows for preview
      const previewLines = lines.slice(0, Math.min(6, lines.length)); // Header + 5 data rows
      const rows = previewLines.map(line => this.parseCSVLine(line));
      
      if (rows.length > 0) {
        const headers = rows[0];
        preview = rows.slice(1).map(row => {
          const obj: any = {};
          headers.forEach((header, index) => {
            obj[header] = row[index] || '';
          });
          return obj;
        });
      }

      // Validate required columns based on import type
      const requiredColumns = this.getRequiredColumns(importType);
      const actualColumns = rows[0] || [];
      
      for (const required of requiredColumns) {
        if (!actualColumns.includes(required)) {
          errors.push(`Missing required column: ${required}`);
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        preview,
      };

    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Invalid CSV format');
      return { isValid: false, errors, preview };
    }
  }

  // Private methods

  private async processImportAsync(
    importId: string,
    content: string,
    importType: ImportType,
    config: CSVImportConfig
  ): Promise<void> {
    const progress = importProgressStore.get(importId);
    if (!progress) return;

    try {
      progress.status = 'processing';
      progress.progress = 10;
      importProgressStore.set(importId, progress);

      const processor = new CSVImportProcessor(config);
      let summary: ImportSummary;

      switch (importType) {
        case 'plant_taxonomy':
          summary = await processor.processPlantTaxonomyImport(content);
          break;
        case 'plant_instances':
          summary = await processor.processPlantInstancesImport(content);
          break;
        case 'propagations':
          summary = await processor.processPropagationsImport(content);
          break;
        default:
          throw new Error(`Unknown import type: ${importType}`);
      }

      // Update progress with results
      progress.status = 'completed';
      progress.progress = 100;
      progress.totalRows = summary.totalRows;
      progress.processedRows = summary.processedRows;
      progress.errors = summary.errors;
      progress.conflicts = summary.conflicts;
      progress.endTime = new Date();
      progress.summary = summary;
      importProgressStore.set(importId, progress);

    } catch (error) {
      progress.status = 'failed';
      progress.progress = 0;
      progress.errors = [{
        rowIndex: 0,
        message: error instanceof Error ? error.message : 'Import failed',
        severity: 'error',
      }];
      progress.endTime = new Date();
      importProgressStore.set(importId, progress);
    }
  }

  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    let i = 0;

    while (i < line.length) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i += 2;
        } else {
          inQuotes = !inQuotes;
          i++;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
        i++;
      } else {
        current += char;
        i++;
      }
    }

    result.push(current.trim());
    return result;
  }

  private getRequiredColumns(importType: ImportType): string[] {
    switch (importType) {
      case 'plant_taxonomy':
        return ['Family', 'Genus', 'Species', 'Common Name/Variety'];
      case 'plant_instances':
        return ['Common Name/Variety', 'Location'];
      case 'propagations':
        return ['Common Name/Variety', 'Location', 'Date Started'];
      default:
        return [];
    }
  }

  private generateConflictId(conflict: ImportConflict): string {
    return `${conflict.type}_${conflict.rowIndex}_${Date.now()}`;
  }
}