import 'server-only';
import { db } from '../index';
import { plants, users, plantInstances, propagations } from '../schema';
import { eq, and, or, ilike, desc, asc, sql, count } from 'drizzle-orm';
import type { Plant, NewPlant } from '../schema';

export interface PlantWithDetails extends Plant {
  createdByName: string | null;
  instanceCount: number;
  propagationCount: number;
}

export interface PlantFilters {
  search?: string;
  family?: string;
  genus?: string;
  species?: string;
  isVerified?: boolean;
  createdBy?: number;
}

export interface PlantSortConfig {
  field: 'commonName' | 'family' | 'genus' | 'species' | 'createdAt' | 'updatedAt';
  direction: 'asc' | 'desc';
}

export class AdminPlantQueries {
  // Get a single plant by ID
  static async getPlantById(id: number): Promise<Plant | null> {
    try {
      const [plant] = await db
        .select()
        .from(plants)
        .where(eq(plants.id, id))
        .limit(1);

      return plant || null;
    } catch (error) {
      console.error('Failed to get plant by ID:', error);
      throw new Error('Failed to get plant by ID');
    }
  }

  // Get plants with detailed information for admin management
  static async getPlantsWithDetails(
    filters: PlantFilters = {},
    sort: PlantSortConfig = { field: 'updatedAt', direction: 'desc' },
    limit: number = 50,
    offset: number = 0
  ): Promise<{ plants: PlantWithDetails[]; totalCount: number }> {
    try {
      // Build where conditions
      const conditions = [];
      
      if (filters.search) {
        const searchTerm = `%${filters.search.toLowerCase()}%`;
        conditions.push(
          or(
            ilike(plants.family, searchTerm),
            ilike(plants.genus, searchTerm),
            ilike(plants.species, searchTerm),
            ilike(plants.cultivar, searchTerm),
            ilike(plants.commonName, searchTerm)
          )
        );
      }
      
      if (filters.family) {
        conditions.push(ilike(plants.family, `%${filters.family}%`));
      }
      
      if (filters.genus) {
        conditions.push(ilike(plants.genus, `%${filters.genus}%`));
      }
      
      if (filters.species) {
        conditions.push(ilike(plants.species, `%${filters.species}%`));
      }
      
      if (filters.isVerified !== undefined) {
        conditions.push(eq(plants.isVerified, filters.isVerified));
      }
      
      if (filters.createdBy) {
        conditions.push(eq(plants.createdBy, filters.createdBy));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Get total count
      const [{ totalCount }] = await db
        .select({ totalCount: count() })
        .from(plants)
        .where(whereClause);

      // Build order by clause
      let orderByClause;
      const direction = sort.direction === 'asc' ? asc : desc;
      
      switch (sort.field) {
        case 'commonName':
          orderByClause = direction(plants.commonName);
          break;
        case 'family':
          orderByClause = direction(plants.family);
          break;
        case 'genus':
          orderByClause = direction(plants.genus);
          break;
        case 'species':
          orderByClause = direction(plants.species);
          break;
        case 'createdAt':
          orderByClause = direction(plants.createdAt);
          break;
        case 'updatedAt':
        default:
          orderByClause = direction(plants.updatedAt);
          break;
      }

      // Get plants with details
      const plantsWithDetails = await db
        .select({
          id: plants.id,
          family: plants.family,
          genus: plants.genus,
          species: plants.species,
          cultivar: plants.cultivar,
          commonName: plants.commonName,
          careInstructions: plants.careInstructions,
          defaultImage: plants.defaultImage,
          createdBy: plants.createdBy,
          isVerified: plants.isVerified,
          createdAt: plants.createdAt,
          updatedAt: plants.updatedAt,
          createdByName: users.name,
          instanceCount: sql<number>`(
            SELECT COUNT(*) FROM ${plantInstances} 
            WHERE ${plantInstances.plantId} = ${plants.id}
          )`,
          propagationCount: sql<number>`(
            SELECT COUNT(*) FROM ${propagations} 
            WHERE ${propagations.plantId} = ${plants.id}
          )`,
        })
        .from(plants)
        .leftJoin(users, eq(plants.createdBy, users.id))
        .where(whereClause)
        .orderBy(orderByClause)
        .limit(limit)
        .offset(offset);

      return {
        plants: plantsWithDetails,
        totalCount,
      };
    } catch (error) {
      console.error('Failed to get plants with details:', error);
      throw new Error('Failed to get plants with details');
    }
  }

  // Update plant with validation
  static async updatePlant(id: number, plantData: Partial<NewPlant>): Promise<Plant> {
    try {
      // Check if taxonomy combination already exists (excluding current plant)
      if (plantData.family || plantData.genus || plantData.species || plantData.cultivar !== undefined) {
        const currentPlant = await db.select().from(plants).where(eq(plants.id, id)).limit(1);
        if (currentPlant.length === 0) {
          throw new Error('Plant not found');
        }

        const plant = currentPlant[0];
        const newFamily = plantData.family ?? plant.family;
        const newGenus = plantData.genus ?? plant.genus;
        const newSpecies = plantData.species ?? plant.species;
        const newCultivar = plantData.cultivar !== undefined ? plantData.cultivar : plant.cultivar;

        // Check for duplicate taxonomy
        const conditions = [
          eq(plants.family, newFamily),
          eq(plants.genus, newGenus),
          eq(plants.species, newSpecies),
          sql`${plants.id} != ${id}`, // Exclude current plant
        ];

        if (newCultivar) {
          conditions.push(eq(plants.cultivar, newCultivar));
        } else {
          conditions.push(sql`${plants.cultivar} IS NULL`);
        }

        const existingPlant = await db
          .select()
          .from(plants)
          .where(and(...conditions))
          .limit(1);

        if (existingPlant.length > 0) {
          throw new Error('A plant with this taxonomy combination already exists');
        }
      }

      const [updatedPlant] = await db
        .update(plants)
        .set({ ...plantData, updatedAt: new Date() })
        .where(eq(plants.id, id))
        .returning();

      if (!updatedPlant) {
        throw new Error('Plant not found');
      }

      return updatedPlant;
    } catch (error) {
      console.error('Failed to update plant:', error);
      throw error;
    }
  }

  // Get unique taxonomy values for filtering
  static async getTaxonomyOptions(): Promise<{
    families: string[];
    genera: string[];
    species: string[];
  }> {
    try {
      const [families, genera, species] = await Promise.all([
        db
          .selectDistinct({ family: plants.family })
          .from(plants)
          .orderBy(asc(plants.family)),
        db
          .selectDistinct({ genus: plants.genus })
          .from(plants)
          .orderBy(asc(plants.genus)),
        db
          .selectDistinct({ species: plants.species })
          .from(plants)
          .orderBy(asc(plants.species)),
      ]);

      return {
        families: families.map(f => f.family),
        genera: genera.map(g => g.genus),
        species: species.map(s => s.species),
      };
    } catch (error) {
      console.error('Failed to get taxonomy options:', error);
      throw new Error('Failed to get taxonomy options');
    }
  }

  // Delete plant (only if no instances or propagations exist)
  static async deletePlant(id: number): Promise<boolean> {
    try {
      // Check for instances
      const [instanceCount] = await db
        .select({ count: count() })
        .from(plantInstances)
        .where(eq(plantInstances.plantId, id));

      if (instanceCount.count > 0) {
        throw new Error('Cannot delete plant with existing instances');
      }

      // Check for propagations
      const [propagationCount] = await db
        .select({ count: count() })
        .from(propagations)
        .where(eq(propagations.plantId, id));

      if (propagationCount.count > 0) {
        throw new Error('Cannot delete plant with existing propagations');
      }

      const result = await db.delete(plants).where(eq(plants.id, id)).returning();
      return result.length > 0;
    } catch (error) {
      console.error('Failed to delete plant:', error);
      throw error;
    }
  }

  // Bulk update plants verification status
  static async bulkUpdateVerification(plantIds: number[], isVerified: boolean): Promise<number> {
    try {
      const result = await db
        .update(plants)
        .set({ isVerified, updatedAt: new Date() })
        .where(sql`${plants.id} = ANY(${plantIds})`)
        .returning({ id: plants.id });

      return result.length;
    } catch (error) {
      console.error('Failed to bulk update verification:', error);
      throw new Error('Failed to bulk update verification');
    }
  }
}