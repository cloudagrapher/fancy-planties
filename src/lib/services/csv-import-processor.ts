import { db } from '@/lib/db';
import { plants, plantInstances, propagations } from '@/lib/db/schema';
import { CSVParser, DateParser, ScheduleParser } from './csv-import';
import { PlantMatcher } from './plant-matching';
import {
  rawPlantTaxonomyRowSchema,
  rawFertilizerScheduleRowSchema,
  rawPropagationRowSchema,
  processedPlantTaxonomySchema,
  processedPlantInstanceSchema,
  processedPropagationSchema,
  type ImportSummary,
  type ImportError,
  type ImportConflict,
  type CSVImportConfig,
  type ProcessedPlantTaxonomy,
  type ProcessedPlantInstance,
  type ProcessedPropagation,
} from '@/lib/validation/csv-schemas';
import { eq, and } from 'drizzle-orm';

export class CSVImportProcessor {
  private config: CSVImportConfig;
  private plantMatcher: PlantMatcher;
  private errors: ImportError[] = [];
  private conflicts: ImportConflict[] = [];
  private warnings: ImportError[] = [];

  constructor(config: CSVImportConfig) {
    this.config = config;
    this.plantMatcher = new PlantMatcher(config.matchingThreshold);
  }

  /**
   * Process plant taxonomy CSV import
   */
  async processPlantTaxonomyImport(csvContent: string): Promise<ImportSummary> {
    const startTime = new Date();
    const summary: ImportSummary = {
      totalRows: 0,
      processedRows: 0,
      successfulImports: 0,
      errors: [],
      conflicts: [],
      warnings: [],
      skippedRows: 0,
      importType: 'plant_taxonomy',
      startTime,
      userId: this.config.userId,
    };

    try {
      // Parse CSV
      const rows = CSVParser.parseCSV(csvContent);
      if (rows.length === 0) {
        throw new Error('CSV file is empty');
      }

      const objects = CSVParser.rowsToObjects(rows);
      summary.totalRows = objects.length;

      // Process each row
      for (let i = 0; i < objects.length; i++) {
        const rowData = objects[i];
        
        try {
          // Validate raw data
          const rawData = rawPlantTaxonomyRowSchema.parse(rowData);
          
          // Skip empty rows if configured
          if (this.config.skipEmptyRows && this.isEmptyPlantRow(rawData)) {
            summary.skippedRows++;
            continue;
          }

          // Process and validate
          const processed = this.processPlantTaxonomyRow(rawData, i);
          const validatedData = processedPlantTaxonomySchema.parse(processed);

          // Check for duplicates
          const existing = await this.findExistingPlant(validatedData);
          if (existing) {
            this.handleDuplicatePlant(validatedData, existing, i);
            continue;
          }

          // Create new plant
          await db.insert(plants).values({
            family: validatedData.family,
            genus: validatedData.genus,
            species: validatedData.species,
            cultivar: validatedData.cultivar,
            commonName: validatedData.commonName,
            createdBy: this.config.userId,
            isVerified: false,
          });

          summary.successfulImports++;
          summary.processedRows++;

        } catch (error) {
          this.addError(i, error instanceof Error ? error.message : 'Unknown error', 'error');
          summary.processedRows++;
        }
      }

    } catch (error) {
      this.addError(0, error instanceof Error ? error.message : 'Failed to process CSV', 'error');
    }

    summary.endTime = new Date();
    summary.errors = this.errors;
    summary.conflicts = this.conflicts;
    summary.warnings = this.warnings;

    return summary;
  }

  /**
   * Process plant instances (fertilizer schedule) CSV import
   */
  async processPlantInstancesImport(csvContent: string): Promise<ImportSummary> {
    const startTime = new Date();
    const summary: ImportSummary = {
      totalRows: 0,
      processedRows: 0,
      successfulImports: 0,
      errors: [],
      conflicts: [],
      warnings: [],
      skippedRows: 0,
      importType: 'plant_instances',
      startTime,
      userId: this.config.userId,
    };

    try {
      // Parse CSV
      const rows = CSVParser.parseCSV(csvContent);
      if (rows.length === 0) {
        throw new Error('CSV file is empty');
      }

      const objects = CSVParser.rowsToObjects(rows);
      summary.totalRows = objects.length;

      // Process each row
      for (let i = 0; i < objects.length; i++) {
        const rowData = objects[i];
        
        try {
          // Validate raw data
          const rawData = rawFertilizerScheduleRowSchema.parse(rowData);
          
          // Skip empty rows if configured
          if (this.config.skipEmptyRows && this.isEmptyInstanceRow(rawData)) {
            summary.skippedRows++;
            continue;
          }

          // Process and validate
          const processed = await this.processPlantInstanceRow(rawData, i);
          const validatedData = processedPlantInstanceSchema.parse(processed);

          // Find or create matching plant
          const plantId = await this.findOrCreatePlantForInstance(validatedData, i);
          if (!plantId) {
            continue; // Error already logged
          }

          // Create plant instance
          await db.insert(plantInstances).values({
            userId: this.config.userId,
            plantId,
            nickname: validatedData.nickname,
            location: validatedData.location,
            lastFertilized: validatedData.lastFertilized,
            fertilizerSchedule: validatedData.fertilizerSchedule,
            fertilizerDue: validatedData.fertilizerDue,
            lastRepot: validatedData.lastRepot,
            isActive: true,
          });

          summary.successfulImports++;
          summary.processedRows++;

        } catch (error) {
          this.addError(i, error instanceof Error ? error.message : 'Unknown error', 'error');
          summary.processedRows++;
        }
      }

    } catch (error) {
      this.addError(0, error instanceof Error ? error.message : 'Failed to process CSV', 'error');
    }

    summary.endTime = new Date();
    summary.errors = this.errors;
    summary.conflicts = this.conflicts;
    summary.warnings = this.warnings;

    return summary;
  }

  /**
   * Process propagations CSV import
   */
  async processPropagationsImport(csvContent: string): Promise<ImportSummary> {
    const startTime = new Date();
    const summary: ImportSummary = {
      totalRows: 0,
      processedRows: 0,
      successfulImports: 0,
      errors: [],
      conflicts: [],
      warnings: [],
      skippedRows: 0,
      importType: 'propagations',
      startTime,
      userId: this.config.userId,
    };

    try {
      // Parse CSV
      const rows = CSVParser.parseCSV(csvContent);
      if (rows.length === 0) {
        throw new Error('CSV file is empty');
      }

      const objects = CSVParser.rowsToObjects(rows);
      summary.totalRows = objects.length;

      // Process each row
      for (let i = 0; i < objects.length; i++) {
        const rowData = objects[i];
        
        try {
          // Validate raw data
          const rawData = rawPropagationRowSchema.parse(rowData);
          
          // Skip empty rows if configured
          if (this.config.skipEmptyRows && this.isEmptyPropagationRow(rawData)) {
            summary.skippedRows++;
            continue;
          }

          // Process and validate
          const processed = await this.processPropagationRow(rawData, i);
          const validatedData = processedPropagationSchema.parse(processed);

          // Find matching plant
          const plantId = await this.findPlantForPropagation(validatedData, i);
          if (!plantId) {
            continue; // Error already logged
          }

          // Try to find parent instance for internal propagations
          let parentInstanceId: number | null = null;
          if (validatedData.sourceType === 'internal') {
            parentInstanceId = await this.findParentInstance(validatedData, plantId);
            if (!parentInstanceId) {
              this.addWarning(i, `Could not find parent instance for internal propagation: ${validatedData.nickname}`, 'warning');
              // Convert to external propagation
              validatedData.sourceType = 'external';
              validatedData.externalSource = 'other';
              validatedData.externalSourceDetails = `Originally marked as internal propagation from: ${validatedData.parentPlantName}`;
            }
          }

          // Create propagation
          await db.insert(propagations).values({
            userId: this.config.userId,
            plantId,
            parentInstanceId,
            nickname: validatedData.nickname,
            location: validatedData.location,
            dateStarted: validatedData.dateStarted,
            status: 'started',
            sourceType: validatedData.sourceType,
            externalSource: validatedData.externalSource,
            externalSourceDetails: validatedData.externalSourceDetails,
          });

          summary.successfulImports++;
          summary.processedRows++;

        } catch (error) {
          this.addError(i, error instanceof Error ? error.message : 'Unknown error', 'error');
          summary.processedRows++;
        }
      }

    } catch (error) {
      this.addError(0, error instanceof Error ? error.message : 'Failed to process CSV', 'error');
    }

    summary.endTime = new Date();
    summary.errors = this.errors;
    summary.conflicts = this.conflicts;
    summary.warnings = this.warnings;

    return summary;
  }

  // Helper methods for processing different row types

  private processPlantTaxonomyRow(rawData: any, rowIndex: number): ProcessedPlantTaxonomy {
    // Handle both new separate fields and legacy combined field
    const cultivar = this.cleanField(rawData['Cultivar']) || null;
    const commonName = this.cleanField(rawData['Common Name']) || 
                      this.cleanField(rawData['Common Name/Variety']);

    return {
      family: this.cleanAndCapitalize(rawData['Family']),
      genus: this.cleanAndCapitalize(rawData['Genus']),
      species: this.cleanField(rawData['Species']).toLowerCase(),
      cultivar,
      commonName,
      rowIndex,
    };
  }

  private async processPlantInstanceRow(rawData: any, rowIndex: number): Promise<ProcessedPlantInstance> {
    const lastFertilized = DateParser.parseDate(rawData['Last Fertilized']);
    const fertilizerSchedule = ScheduleParser.parseSchedule(rawData['Fertilizer Schedule']);
    const fertilizerDue = DateParser.parseDate(rawData['Fertilizer Due']) || 
                         ScheduleParser.calculateNextDue(lastFertilized, fertilizerSchedule);
    const lastRepot = DateParser.parseDate(rawData['Last Repot']);

    // Handle both new separate fields and legacy combined field
    const cultivar = this.cleanField(rawData['Cultivar']) || null;
    const commonName = this.cleanField(rawData['Common Name']) || 
                      this.cleanField(rawData['Common Name/Variety']);

    return {
      family: this.cleanField(rawData['Family']),
      genus: this.cleanField(rawData['Genus']),
      species: this.cleanField(rawData['Species']),
      cultivar,
      commonName,
      nickname: commonName, // Use common name as nickname
      location: this.cleanField(rawData['Location']),
      lastFertilized,
      fertilizerSchedule,
      fertilizerDue,
      lastRepot,
      rowIndex,
    };
  }

  private async processPropagationRow(rawData: any, rowIndex: number): Promise<ProcessedPropagation> {
    const dateStarted = DateParser.parseDate(rawData['Date Started']);
    if (!dateStarted) {
      throw new Error('Invalid or missing date started');
    }

    // Handle both new separate fields and legacy combined field
    const cultivar = this.cleanField(rawData['Cultivar']) || null;
    const commonName = this.cleanField(rawData['Common Name']) || 
                      this.cleanField(rawData['Common Name/Variety']);

    // Detect external source information
    const sourceField = this.cleanField(rawData['Source']).toLowerCase();
    const sourceDetails = this.cleanField(rawData['Source Details']) || null;
    const parentPlantName = this.cleanField(rawData['Parent Plant']) || null;

    // Determine source type and external source
    let sourceType: 'internal' | 'external' = 'external'; // Default to external for CSV imports
    let externalSource: 'gift' | 'trade' | 'purchase' | 'other' | null = null;

    if (parentPlantName) {
      sourceType = 'internal';
    } else if (sourceField) {
      sourceType = 'external';
      // Map common source terms to our enum values
      if (sourceField.includes('gift') || sourceField.includes('given')) {
        externalSource = 'gift';
      } else if (sourceField.includes('trade') || sourceField.includes('swap') || sourceField.includes('exchange')) {
        externalSource = 'trade';
      } else if (sourceField.includes('purchase') || sourceField.includes('bought') || sourceField.includes('buy')) {
        externalSource = 'purchase';
      } else {
        externalSource = 'other';
      }
    } else {
      // No source information provided, default to external/other
      externalSource = 'other';
    }

    return {
      family: this.cleanField(rawData['Family']),
      genus: this.cleanField(rawData['Genus']),
      species: this.cleanField(rawData['Species']),
      cultivar,
      commonName,
      nickname: commonName,
      location: this.cleanField(rawData['Location']),
      dateStarted,
      sourceType,
      externalSource,
      externalSourceDetails: sourceDetails,
      parentPlantName,
      rowIndex,
    };
  }

  // Helper methods for data validation and processing

  private isEmptyPlantRow(data: any): boolean {
    return !data['Family'] && !data['Genus'] && !data['Species'] && 
           !data['Common Name'] && !data['Common Name/Variety'];
  }

  private isEmptyInstanceRow(data: any): boolean {
    return !data['Common Name'] && !data['Common Name/Variety'] && !data['Location'];
  }

  private isEmptyPropagationRow(data: any): boolean {
    return !data['Common Name'] && !data['Common Name/Variety'] && 
           !data['Location'] && !data['Date Started'];
  }

  private cleanField(value: string): string {
    if (!value) return '';
    return value.trim().replace(/[""]/g, '"').replace(/\s+/g, ' ');
  }

  private cleanAndCapitalize(value: string): string {
    const cleaned = this.cleanField(value);
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
  }

  private async findExistingPlant(data: ProcessedPlantTaxonomy) {
    return await db
      .select()
      .from(plants)
      .where(
        and(
          eq(plants.family, data.family),
          eq(plants.genus, data.genus),
          eq(plants.species, data.species)
        )
      )
      .limit(1);
  }

  private async findOrCreatePlantForInstance(data: ProcessedPlantInstance, rowIndex: number): Promise<number | null> {
    // Try to match with existing plant
    const matchResult = await this.plantMatcher.findMatches({
      Family: data.family || '',
      Genus: data.genus || '',
      Species: data.species || '',
      'Common Name/Variety': data.commonName,
    });

    if (matchResult.bestMatch && matchResult.confidence > this.config.matchingThreshold) {
      return matchResult.bestMatch.plantId;
    }

    // Create new plant if configured to do so
    if (this.config.createMissingPlants && data.family && data.genus && data.species) {
      const newPlant = await this.plantMatcher.createPlantFromCSV({
        Family: data.family,
        Genus: data.genus,
        Species: data.species,
        'Common Name/Variety': data.commonName,
      }, this.config.userId);

      if (newPlant) {
        this.addWarning(rowIndex, `Created new plant: ${data.family} ${data.genus} ${data.species}`, 'warning');
        return newPlant.id;
      }
    }

    this.addError(rowIndex, `Could not find or create plant for: ${data.commonName}`, 'error');
    return null;
  }

  private async findPlantForPropagation(data: ProcessedPropagation, rowIndex: number): Promise<number | null> {
    const matchResult = await this.plantMatcher.findMatches({
      'Family': data.family || '',
      'Genus': data.genus || '',
      'Species': data.species || '',
      'Cultivar': data.cultivar || '',
      'Common Name': data.commonName,
    });

    // Use a lower threshold for propagations since we want to be more permissive
    const propagationMatchingThreshold = Math.min(0.6, this.config.matchingThreshold);
    
    if (matchResult.bestMatch && matchResult.confidence > propagationMatchingThreshold) {
      return matchResult.bestMatch.plantId;
    }

    // If no match found, try again with just taxonomy (family, genus, species)
    if (data.family && data.genus && data.species) {
      const taxonomyMatchResult = await this.plantMatcher.findMatches({
        'Family': data.family,
        'Genus': data.genus,
        'Species': data.species,
        'Cultivar': data.cultivar || '',
        'Common Name': '',
      });
      
      if (taxonomyMatchResult.bestMatch && taxonomyMatchResult.confidence > 0.8) {
        this.addWarning(rowIndex, `Using taxonomy match for propagation: ${data.commonName} -> ${taxonomyMatchResult.bestMatch.plant.commonName}`, 'warning');
        return taxonomyMatchResult.bestMatch.plantId;
      }
    }

    // If we still can't find a match, create a new plant entry for propagations import
    if (data.family && data.genus && data.species && data.commonName) {
      try {
        const newPlant = await db.insert(plants).values({
          family: data.family,
          genus: data.genus,
          species: data.species.toLowerCase(),
          cultivar: data.cultivar || null,
          commonName: data.commonName,
          createdBy: this.config.userId,
          isVerified: false,
        }).returning({ id: plants.id });

        this.addWarning(rowIndex, `Created new plant for propagation: ${data.commonName} (${data.genus} ${data.species})`, 'warning');
        return newPlant[0].id;
      } catch (error) {
        this.addError(rowIndex, `Could not create plant for propagation: ${data.commonName} - ${error}`, 'error');
        return null;
      }
    }

    this.addError(rowIndex, `Could not find or create plant for propagation: ${data.commonName} (Family: ${data.family}, Genus: ${data.genus}, Species: ${data.species})`, 'error');
    return null;
  }

  private async findParentInstance(data: ProcessedPropagation, plantId: number): Promise<number | null> {
    const instances = await db
      .select({ id: plantInstances.id })
      .from(plantInstances)
      .where(
        and(
          eq(plantInstances.userId, this.config.userId),
          eq(plantInstances.plantId, plantId),
          eq(plantInstances.isActive, true)
        )
      )
      .limit(1);

    return instances[0]?.id || null;
  }

  private handleDuplicatePlant(data: ProcessedPlantTaxonomy, existing: any, rowIndex: number) {
    this.conflicts.push({
      type: 'duplicate_plant',
      rowIndex,
      message: `Plant already exists: ${data.family} ${data.genus} ${data.species}`,
      existingRecord: existing[0],
      suggestedAction: this.config.handleDuplicates,
    });
  }

  private addError(rowIndex: number, message: string, severity: 'error' | 'warning', field?: string) {
    const error: ImportError = {
      rowIndex,
      field,
      message,
      severity,
    };

    if (severity === 'error') {
      this.errors.push(error);
    } else {
      this.warnings.push(error);
    }
  }

  private addWarning(rowIndex: number, message: string, severity: 'warning', field?: string) {
    this.addError(rowIndex, message, severity, field);
  }
}