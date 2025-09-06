import { eq, ilike, or, and, desc, sql } from 'drizzle-orm';
import { db } from '../index';
import { plants, type Plant, type NewPlant } from '../schema';

// Plant taxonomy CRUD operations
export class PlantQueries {
  // Create a new plant taxonomy entry
  static async create(plantData: NewPlant): Promise<Plant> {
    try {
      const [plant] = await db.insert(plants).values(plantData).returning();
      return plant;
    } catch (error) {
      console.error('Failed to create plant:', error);
      throw new Error('Failed to create plant');
    }
  }

  // Get plant by ID
  static async getById(id: number): Promise<Plant | null> {
    try {
      const [plant] = await db.select().from(plants).where(eq(plants.id, id));
      return plant || null;
    } catch (error) {
      console.error('Failed to get plant by ID:', error);
      throw new Error('Failed to get plant');
    }
  }

  // Search plants by taxonomy or common name (fuzzy search)
  static async search(query: string, limit: number = 20): Promise<Plant[]> {
    try {
      const searchTerm = `%${query.toLowerCase()}%`;
      
      return await db
        .select()
        .from(plants)
        .where(
          or(
            ilike(plants.family, searchTerm),
            ilike(plants.genus, searchTerm),
            ilike(plants.species, searchTerm),
            ilike(plants.commonName, searchTerm)
          )
        )
        .orderBy(desc(plants.isVerified), plants.commonName)
        .limit(limit);
    } catch (error) {
      console.error('Failed to search plants:', error);
      throw new Error('Failed to search plants');
    }
  }

  // Get all plants with pagination
  static async getAll(offset: number = 0, limit: number = 50): Promise<Plant[]> {
    try {
      return await db
        .select()
        .from(plants)
        .orderBy(desc(plants.isVerified), plants.commonName)
        .offset(offset)
        .limit(limit);
    } catch (error) {
      console.error('Failed to get plants:', error);
      throw new Error('Failed to get plants');
    }
  }

  // Get plants by family
  static async getByFamily(family: string): Promise<Plant[]> {
    try {
      return await db
        .select()
        .from(plants)
        .where(eq(plants.family, family))
        .orderBy(plants.genus, plants.species);
    } catch (error) {
      console.error('Failed to get plants by family:', error);
      throw new Error('Failed to get plants by family');
    }
  }

  // Check if plant taxonomy already exists
  static async taxonomyExists(family: string, genus: string, species: string): Promise<Plant | null> {
    try {
      const [plant] = await db
        .select()
        .from(plants)
        .where(
          and(
            eq(plants.family, family),
            eq(plants.genus, genus),
            eq(plants.species, species)
          )
        );
      return plant || null;
    } catch (error) {
      console.error('Failed to check taxonomy existence:', error);
      throw new Error('Failed to check taxonomy');
    }
  }

  // Update plant
  static async update(id: number, plantData: Partial<NewPlant>): Promise<Plant> {
    try {
      const [plant] = await db
        .update(plants)
        .set({ ...plantData, updatedAt: new Date() })
        .where(eq(plants.id, id))
        .returning();
      
      if (!plant) {
        throw new Error('Plant not found');
      }
      
      return plant;
    } catch (error) {
      console.error('Failed to update plant:', error);
      throw new Error('Failed to update plant');
    }
  }

  // Delete plant (only if no instances exist)
  static async delete(id: number): Promise<boolean> {
    try {
      const result = await db.delete(plants).where(eq(plants.id, id));
      return result.length > 0;
    } catch (error) {
      console.error('Failed to delete plant:', error);
      throw new Error('Failed to delete plant');
    }
  }

  // Get popular plants (most used in instances)
  static async getPopular(limit: number = 10): Promise<Plant[]> {
    try {
      return await db
        .select({
          id: plants.id,
          family: plants.family,
          genus: plants.genus,
          species: plants.species,
          commonName: plants.commonName,
          careInstructions: plants.careInstructions,
          defaultImage: plants.defaultImage,
          createdBy: plants.createdBy,
          isVerified: plants.isVerified,
          createdAt: plants.createdAt,
          updatedAt: plants.updatedAt,
        })
        .from(plants)
        .orderBy(desc(plants.isVerified), plants.commonName)
        .limit(limit);
    } catch (error) {
      console.error('Failed to get popular plants:', error);
      throw new Error('Failed to get popular plants');
    }
  }

  // Full-text search using PostgreSQL's built-in search
  static async fullTextSearch(query: string, limit: number = 20): Promise<Plant[]> {
    try {
      return await db
        .select()
        .from(plants)
        .where(
          sql`to_tsvector('english', ${plants.family} || ' ' || ${plants.genus} || ' ' || ${plants.species} || ' ' || ${plants.commonName}) @@ plainto_tsquery('english', ${query})`
        )
        .orderBy(desc(plants.isVerified), plants.commonName)
        .limit(limit);
    } catch (error) {
      console.error('Failed to perform full-text search:', error);
      // Fallback to regular search
      return this.search(query, limit);
    }
  }
}