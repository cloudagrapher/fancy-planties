import { db } from '@/lib/db';
import { plants } from '@/lib/db/schema';
import { eq, or, ilike, sql } from 'drizzle-orm';
import type { PlantMatch, PlantMatchResult } from '@/lib/validation/csv-schemas';

export class PlantMatcher {
  private matchingThreshold: number;

  constructor(matchingThreshold: number = 0.7) {
    this.matchingThreshold = matchingThreshold;
  }

  /**
   * Find matching plants for CSV row data
   */
  async findMatches(rowData: Record<string, string>): Promise<PlantMatchResult> {
    const { family, genus, species, cultivar, commonName } = this.extractPlantFields(rowData);
    
    // Get all potential matches from database
    const potentialMatches = await this.getPotentialMatches(family, genus, species, cultivar, commonName);
    
    // Calculate match scores
    const matches: PlantMatch[] = [];
    
    for (const plant of potentialMatches) {
      const match = this.calculateMatch(
        { family, genus, species, cultivar, commonName },
        plant
      );
      
      if (match.confidence >= this.matchingThreshold) {
        matches.push(match);
      }
    }

    // Sort by confidence (highest first)
    matches.sort((a, b) => b.confidence - a.confidence);

    const bestMatch = matches[0];
    const requiresManualReview = !bestMatch || bestMatch.confidence < 0.9;

    return {
      rowIndex: 0, // Will be set by caller
      originalData: rowData,
      matches,
      bestMatch,
      requiresManualReview,
      confidence: bestMatch?.confidence || 0,
    };
  }

  /**
   * Extract plant taxonomy fields from CSV row data
   */
  private extractPlantFields(rowData: Record<string, string>) {
    return {
      family: this.cleanField(rowData['Family'] || rowData['family'] || ''),
      genus: this.cleanField(rowData['Genus'] || rowData['genus'] || ''),
      species: this.cleanField(rowData['Species'] || rowData['species'] || ''),
      cultivar: this.cleanField(rowData['Cultivar'] || rowData['cultivar'] || ''),
      commonName: this.cleanField(rowData['Common Name'] || rowData['Common Name/Variety'] || rowData['commonName'] || ''),
    };
  }

  /**
   * Get potential plant matches from database
   */
  private async getPotentialMatches(
    family: string,
    genus: string,
    species: string,
    cultivar: string,
    commonName: string
  ) {
    const conditions = [];

    // Exact matches first (including cultivar if provided)
    if (family && genus && species) {
      if (cultivar) {
        conditions.push(
          sql`${plants.family} ILIKE ${`%${family}%`} AND ${plants.genus} ILIKE ${`%${genus}%`} AND ${plants.species} ILIKE ${`%${species}%`} AND ${plants.cultivar} ILIKE ${`%${cultivar}%`}`
        );
      } else {
        conditions.push(
          sql`${plants.family} ILIKE ${`%${family}%`} AND ${plants.genus} ILIKE ${`%${genus}%`} AND ${plants.species} ILIKE ${`%${species}%`} AND ${plants.cultivar} IS NULL`
        );
      }
      
      // Also add condition without cultivar constraint for broader matching
      conditions.push(
        sql`${plants.family} ILIKE ${`%${family}%`} AND ${plants.genus} ILIKE ${`%${genus}%`} AND ${plants.species} ILIKE ${`%${species}%`}`
      );
    }

    // Genus and species match
    if (genus && species) {
      conditions.push(
        sql`${plants.genus} ILIKE ${`%${genus}%`} AND ${plants.species} ILIKE ${`%${species}%`}`
      );
    }

    // Common name match
    if (commonName) {
      conditions.push(ilike(plants.commonName, `%${commonName}%`));
    }

    // Cultivar match
    if (cultivar) {
      conditions.push(ilike(plants.cultivar, `%${cultivar}%`));
    }

    // Family and genus match
    if (family && genus) {
      conditions.push(
        sql`${plants.family} ILIKE ${`%${family}%`} AND ${plants.genus} ILIKE ${`%${genus}%`}`
      );
    }

    if (conditions.length === 0) {
      return [];
    }

    return await db
      .select()
      .from(plants)
      .where(or(...conditions))
      .limit(20); // Limit to prevent too many matches
  }

  /**
   * Calculate match confidence between CSV data and database plant
   */
  private calculateMatch(
    csvData: { family: string; genus: string; species: string; cultivar: string; commonName: string },
    dbPlant: any
  ): PlantMatch {
    const matchedFields: string[] = [];
    let totalScore = 0;
    let maxScore = 0;

    // Family match (weight: 1)
    if (csvData.family && dbPlant.family) {
      maxScore += 1;
      const similarity = this.calculateStringSimilarity(csvData.family, dbPlant.family);
      if (similarity > 0.8) {
        totalScore += similarity;
        matchedFields.push('family');
      }
    }

    // Genus match (weight: 2)
    if (csvData.genus && dbPlant.genus) {
      maxScore += 2;
      const similarity = this.calculateStringSimilarity(csvData.genus, dbPlant.genus);
      if (similarity > 0.8) {
        totalScore += similarity * 2;
        matchedFields.push('genus');
      }
    }

    // Species match (weight: 2)
    if (csvData.species && dbPlant.species) {
      maxScore += 2;
      const similarity = this.calculateStringSimilarity(csvData.species, dbPlant.species);
      if (similarity > 0.8) {
        totalScore += similarity * 2;
        matchedFields.push('species');
      }
    }

    // Cultivar match (weight: 1.5)
    if (csvData.cultivar || dbPlant.cultivar) {
      maxScore += 1.5;
      if (csvData.cultivar && dbPlant.cultivar) {
        const similarity = this.calculateStringSimilarity(csvData.cultivar, dbPlant.cultivar);
        if (similarity > 0.8) {
          totalScore += similarity * 1.5;
          matchedFields.push('cultivar');
        }
      } else if (!csvData.cultivar && !dbPlant.cultivar) {
        // Both null/empty - perfect match
        totalScore += 1.5;
        matchedFields.push('cultivar');
      }
      // If one has cultivar and other doesn't, no points but still valid match
    }

    // Common name match (weight: 1.5)
    if (csvData.commonName && dbPlant.commonName) {
      maxScore += 1.5;
      const similarity = this.calculateStringSimilarity(csvData.commonName, dbPlant.commonName);
      if (similarity > 0.6) { // Lower threshold for common names due to variations
        totalScore += similarity * 1.5;
        matchedFields.push('commonName');
      }
    }

    const confidence = maxScore > 0 ? totalScore / maxScore : 0;

    return {
      plantId: dbPlant.id,
      confidence: Math.min(confidence, 1), // Cap at 1.0
      matchedFields,
      plant: {
        id: dbPlant.id,
        family: dbPlant.family,
        genus: dbPlant.genus,
        species: dbPlant.species,
        cultivar: dbPlant.cultivar,
        commonName: dbPlant.commonName,
      },
    };
  }

  /**
   * Calculate string similarity using Levenshtein distance
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();

    if (s1 === s2) return 1.0;
    if (s1.length === 0 || s2.length === 0) return 0.0;

    // Check for substring matches
    if (s1.includes(s2) || s2.includes(s1)) {
      return 0.9;
    }

    // Levenshtein distance calculation
    const matrix = Array(s2.length + 1).fill(null).map(() => Array(s1.length + 1).fill(null));

    for (let i = 0; i <= s1.length; i++) {
      matrix[0][i] = i;
    }

    for (let j = 0; j <= s2.length; j++) {
      matrix[j][0] = j;
    }

    for (let j = 1; j <= s2.length; j++) {
      for (let i = 1; i <= s1.length; i++) {
        const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }

    const distance = matrix[s2.length][s1.length];
    const maxLength = Math.max(s1.length, s2.length);
    return 1 - distance / maxLength;
  }

  /**
   * Clean and normalize field values
   */
  private cleanField(value: string): string {
    return value
      .trim()
      .replace(/[""]/g, '"') // Normalize quotes
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/^\(.*\)$/, '') // Remove parentheses around entire value
      .trim();
  }

  /**
   * Create a new plant from CSV data if no good match is found
   */
  async createPlantFromCSV(
    csvData: Record<string, string>,
    userId: number
  ): Promise<{ id: number } | null> {
    const { family, genus, species, cultivar, commonName } = this.extractPlantFields(csvData);

    // Validate required fields
    if (!family || !genus || !species || !commonName) {
      return null;
    }

    try {
      const [newPlant] = await db
        .insert(plants)
        .values({
          family,
          genus,
          species,
          cultivar: cultivar || null,
          commonName,
          createdBy: userId,
          isVerified: false,
        })
        .returning({ id: plants.id });

      return newPlant;
    } catch (error) {
      // Handle duplicate key errors
      if (error instanceof Error && error.message.includes('unique')) {
        // Try to find the existing plant
        const existing = await db
          .select({ id: plants.id })
          .from(plants)
          .where(
            sql`${plants.family} = ${family} AND ${plants.genus} = ${genus} AND ${plants.species} = ${species} AND ${plants.cultivar} ${cultivar ? `= ${cultivar}` : 'IS NULL'}`
          )
          .limit(1);

        return existing[0] || null;
      }
      throw error;
    }
  }
}