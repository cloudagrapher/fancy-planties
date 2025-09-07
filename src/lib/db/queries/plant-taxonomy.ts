import { db } from '@/lib/db';
import { plants, users } from '@/lib/db/schema';
import { eq, and, or, ilike, desc, asc, sql, count } from 'drizzle-orm';
import type { 
  PlantSearch, 
  PlantFilter, 
  CreatePlant,
  UpdatePlant
} from '@/lib/validation/plant-schemas';
import type { 
  PlantSearchResult, 
  EnhancedPlant, 
  PlantWithStats,
  TaxonomyValidationResult,
  PlantLookupOptions,
  QuickSelectPlants
} from '@/lib/types/plant-types';
import { plantHelpers } from '@/lib/types/plant-types';

// Helper function to build plant visibility conditions
function buildPlantVisibilityFilter(currentUserId?: number) {
  if (!currentUserId) {
    // If no user context, only show verified plants
    return eq(plants.isVerified, true);
  }

  // Plants are visible if:
  // 1. They are verified (public)
  // 2. They were created by a curator (public)
  // 3. They were created by the current user (private)
  return or(
    eq(plants.isVerified, true),
    and(
      eq(plants.createdBy, currentUserId)
    ),
    // Plants created by curators are visible to all
    sql`EXISTS (
      SELECT 1 FROM ${users} 
      WHERE ${users.id} = ${plants.createdBy} 
      AND ${users.isCurator} = true
    )`
  );
}

// Create a new plant taxonomy entry
export async function createPlant(data: CreatePlant, userId?: number): Promise<EnhancedPlant> {
  const plantData = {
    ...data,
    createdBy: userId || data.createdBy,
  };

  const [newPlant] = await db.insert(plants).values(plantData).returning();
  return plantHelpers.enhancePlant(newPlant);
}

// Update an existing plant taxonomy entry
export async function updatePlant(data: UpdatePlant): Promise<EnhancedPlant | null> {
  const { id, ...updateData } = data;
  
  const [updatedPlant] = await db
    .update(plants)
    .set({
      ...updateData,
      updatedAt: new Date(),
    })
    .where(eq(plants.id, id))
    .returning();

  return updatedPlant ? plantHelpers.enhancePlant(updatedPlant) : null;
}

// Get plant by ID
export async function getPlantById(id: number): Promise<EnhancedPlant | null> {
  const plant = await db.query.plants.findFirst({
    where: eq(plants.id, id),
    with: {
      createdBy: {
        columns: {
          id: true,
          name: true,
        },
      },
    },
  });

  return plant ? plantHelpers.enhancePlant(plant) : null;
}

// Get plants with usage statistics
export async function getPlantsWithStats(
  filter: PlantFilter = { limit: 20, offset: 0 },
  userId?: number
): Promise<PlantWithStats[]> {
  const conditions = [];
  
  // Add visibility filter based on curator/user logic
  conditions.push(buildPlantVisibilityFilter(userId));
  
  if (filter.family) {
    conditions.push(ilike(plants.family, `%${filter.family}%`));
  }
  if (filter.genus) {
    conditions.push(ilike(plants.genus, `%${filter.genus}%`));
  }
  if (filter.isVerified !== undefined) {
    conditions.push(eq(plants.isVerified, filter.isVerified));
  }
  if (filter.createdBy) {
    conditions.push(eq(plants.createdBy, filter.createdBy));
  }

  const whereClause = and(...conditions);

  // Query with subqueries for statistics
  const plantsWithStats = await db
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
      instanceCount: sql<number>`(
        SELECT COUNT(*) FROM plant_instances 
        WHERE plant_id = ${plants.id}
        ${userId ? sql`AND user_id = ${userId}` : sql``}
      )`,
      propagationCount: sql<number>`(
        SELECT COUNT(*) FROM propagations 
        WHERE plant_id = ${plants.id}
        ${userId ? sql`AND user_id = ${userId}` : sql``}
      )`,
      lastUsed: sql<Date | null>`(
        SELECT MAX(created_at) FROM (
          SELECT created_at FROM plant_instances WHERE plant_id = ${plants.id}
          ${userId ? sql`AND user_id = ${userId}` : sql``}
          UNION ALL
          SELECT created_at FROM propagations WHERE plant_id = ${plants.id}
          ${userId ? sql`AND user_id = ${userId}` : sql``}
        ) AS usage_dates
      )`,
    })
    .from(plants)
    .where(whereClause)
    .orderBy(desc(plants.updatedAt))
    .limit(filter.limit || 20)
    .offset(filter.offset || 0);

  return plantsWithStats.map(plant => ({
    ...plantHelpers.enhancePlant(plant),
    instanceCount: plant.instanceCount,
    propagationCount: plant.propagationCount,
    popularityScore: plant.instanceCount + plant.propagationCount * 0.5,
    lastUsed: plant.lastUsed || undefined,
  }));
}

// Fuzzy search for plants
export async function searchPlants(
  searchParams: PlantSearch,
  options: PlantLookupOptions = {}
): Promise<PlantSearchResult> {
  const startTime = Date.now();
  const { query, limit = 20, offset = 0, includeUnverified = true } = searchParams;
  
  // Build search conditions
  const searchConditions = [];
  const searchTerm = `%${query.toLowerCase()}%`;
  
  // Add visibility filter based on curator/user logic
  searchConditions.push(buildPlantVisibilityFilter(options.userContext?.userId));
  
  searchConditions.push(
    or(
      ilike(plants.family, searchTerm),
      ilike(plants.genus, searchTerm),
      ilike(plants.species, searchTerm),
      ilike(plants.commonName, searchTerm),
      // Search in scientific name combination
      sql`LOWER(CONCAT(${plants.genus}, ' ', ${plants.species})) LIKE ${searchTerm}`,
      // Search in full taxonomy
      sql`LOWER(CONCAT(${plants.family}, ' ', ${plants.genus}, ' ', ${plants.species})) LIKE ${searchTerm}`
    )
  );

  if (!includeUnverified) {
    searchConditions.push(eq(plants.isVerified, true));
  }

  if (options.filters?.family) {
    searchConditions.push(ilike(plants.family, `%${options.filters.family}%`));
  }

  if (options.filters?.genus) {
    searchConditions.push(ilike(plants.genus, `%${options.filters.genus}%`));
  }

  if (options.filters?.isVerified !== undefined) {
    searchConditions.push(eq(plants.isVerified, options.filters.isVerified));
  }

  const whereClause = and(...searchConditions);

  // Get total count
  const [{ totalCount }] = await db
    .select({ totalCount: count() })
    .from(plants)
    .where(whereClause);

  // Get search results with relevance scoring
  const results = await db
    .select({
      id: plants.id,
      family: plants.family,
      genus: plants.genus,
      species: plants.species,
      commonName: plants.commonName,
      isVerified: plants.isVerified,
      // Simple relevance scoring based on match position and field priority
      score: sql<number>`
        CASE 
          WHEN LOWER(${plants.commonName}) = LOWER(${query}) THEN 100
          WHEN LOWER(${plants.commonName}) LIKE ${`${query.toLowerCase()}%`} THEN 90
          WHEN LOWER(CONCAT(${plants.genus}, ' ', ${plants.species})) = LOWER(${query}) THEN 85
          WHEN LOWER(CONCAT(${plants.genus}, ' ', ${plants.species})) LIKE ${`${query.toLowerCase()}%`} THEN 80
          WHEN LOWER(${plants.genus}) = LOWER(${query}) THEN 75
          WHEN LOWER(${plants.species}) = LOWER(${query}) THEN 70
          WHEN LOWER(${plants.family}) = LOWER(${query}) THEN 65
          WHEN LOWER(${plants.commonName}) LIKE ${searchTerm} THEN 60
          WHEN LOWER(${plants.genus}) LIKE ${searchTerm} THEN 50
          WHEN LOWER(${plants.species}) LIKE ${searchTerm} THEN 45
          WHEN LOWER(${plants.family}) LIKE ${searchTerm} THEN 40
          ELSE 30
        END
      `,
    })
    .from(plants)
    .where(whereClause)
    .orderBy(desc(sql<number>`
        CASE 
          WHEN LOWER(${plants.commonName}) = LOWER(${query}) THEN 100
          WHEN LOWER(${plants.commonName}) LIKE ${`${query.toLowerCase()}%`} THEN 90
          WHEN LOWER(CONCAT(${plants.genus}, ' ', ${plants.species})) = LOWER(${query}) THEN 85
          WHEN LOWER(CONCAT(${plants.genus}, ' ', ${plants.species})) LIKE ${`${query.toLowerCase()}%`} THEN 80
          WHEN LOWER(${plants.genus}) = LOWER(${query}) THEN 75
          WHEN LOWER(${plants.species}) = LOWER(${query}) THEN 70
          WHEN LOWER(${plants.family}) = LOWER(${query}) THEN 65
          WHEN LOWER(${plants.commonName}) LIKE ${searchTerm} THEN 60
          WHEN LOWER(${plants.genus}) LIKE ${searchTerm} THEN 50
          WHEN LOWER(${plants.species}) LIKE ${searchTerm} THEN 45
          WHEN LOWER(${plants.family}) LIKE ${searchTerm} THEN 40
          ELSE 30
        END
      `), desc(plants.isVerified), asc(plants.commonName))
    .limit(limit)
    .offset(offset);

  const searchTime = Date.now() - startTime;

  return {
    plants: results.map(result => ({
      ...result,
      score: result.score,
    })),
    totalCount,
    hasMore: offset + limit < totalCount,
    searchTime,
  };
}

// Get quick select plants (recent, popular, verified)
export async function getQuickSelectPlants(userId?: number): Promise<QuickSelectPlants> {
  // Get recent plants (based on user's recent plant instances/propagations)
  const recentQuery = userId ? db
    .select({
      id: plants.id,
      family: plants.family,
      genus: plants.genus,
      species: plants.species,
      commonName: plants.commonName,
      isVerified: plants.isVerified,
    })
    .from(plants)
    .innerJoin(
      sql`(
        SELECT plant_id, MAX(created_at) as last_used
        FROM (
          SELECT plant_id, created_at FROM plant_instances WHERE user_id = ${userId}
          UNION ALL
          SELECT plant_id, created_at FROM propagations WHERE user_id = ${userId}
        ) recent_usage
        GROUP BY plant_id
        ORDER BY last_used DESC
        LIMIT 10
      ) recent_plants`,
      sql`recent_plants.plant_id = ${plants.id}`
    ) : Promise.resolve([]);

  // Get popular plants (most instances across all users)
  const popularQuery = db
    .select({
      id: plants.id,
      family: plants.family,
      genus: plants.genus,
      species: plants.species,
      commonName: plants.commonName,
      isVerified: plants.isVerified,
      instanceCount: sql<number>`COUNT(plant_instances.id)`,
    })
    .from(plants)
    .leftJoin(sql`plant_instances`, sql`plant_instances.plant_id = ${plants.id}`)
    .groupBy(plants.id)
    .orderBy(sql`COUNT(plant_instances.id) DESC`)
    .limit(10);

  // Get verified plants (admin-verified taxonomy)
  const verifiedQuery = db
    .select({
      id: plants.id,
      family: plants.family,
      genus: plants.genus,
      species: plants.species,
      commonName: plants.commonName,
      isVerified: plants.isVerified,
    })
    .from(plants)
    .where(eq(plants.isVerified, true))
    .orderBy(asc(plants.commonName))
    .limit(10);

  const [recent, popular, verified] = await Promise.all([
    recentQuery,
    popularQuery,
    verifiedQuery,
  ]);

  return {
    recent: Array.isArray(recent) ? recent : [],
    popular: popular.map(({ instanceCount: _instanceCount, ...plant }) => plant),
    verified,
  };
}

// Validate plant taxonomy for duplicates and conflicts
export async function validatePlantTaxonomy(
  taxonomy: Pick<CreatePlant, 'family' | 'genus' | 'species' | 'commonName'>
): Promise<TaxonomyValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const suggestions = {
    family: [] as string[],
    genus: [] as string[],
    species: [] as string[],
    commonName: [] as string[],
  };

  // Check for exact taxonomic duplicates
  const exactDuplicates = await db
    .select()
    .from(plants)
    .where(
      and(
        eq(sql`LOWER(${plants.family})`, taxonomy.family.toLowerCase()),
        eq(sql`LOWER(${plants.genus})`, taxonomy.genus.toLowerCase()),
        eq(sql`LOWER(${plants.species})`, taxonomy.species.toLowerCase())
      )
    );

  // Check for common name conflicts
  const commonNameConflicts = await db
    .select()
    .from(plants)
    .where(eq(sql`LOWER(${plants.commonName})`, taxonomy.commonName.toLowerCase()));

  // Get similar families for suggestions
  const similarFamilies = await db
    .select({ family: plants.family })
    .from(plants)
    .where(ilike(plants.family, `%${taxonomy.family.substring(0, 3)}%`))
    .groupBy(plants.family)
    .limit(5);

  // Get similar genera for suggestions
  const similarGenera = await db
    .select({ genus: plants.genus })
    .from(plants)
    .where(ilike(plants.genus, `%${taxonomy.genus.substring(0, 3)}%`))
    .groupBy(plants.genus)
    .limit(5);

  if (exactDuplicates.length > 0) {
    errors.push('A plant with this exact taxonomy already exists');
  }

  if (commonNameConflicts.length > 0 && 
      !exactDuplicates.some(dup => dup.commonName.toLowerCase() === taxonomy.commonName.toLowerCase())) {
    warnings.push('Another plant already uses this common name');
  }

  suggestions.family = similarFamilies.map(f => f.family);
  suggestions.genus = similarGenera.map(g => g.genus);

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    suggestions,
    duplicates: exactDuplicates.map(plant => ({
      id: plant.id,
      family: plant.family,
      genus: plant.genus,
      species: plant.species,
      commonName: plant.commonName,
      isVerified: plant.isVerified,
    })),
  };
}

// Get taxonomy hierarchy for browsing
export async function getTaxonomyHierarchy() {
  const hierarchy = await db
    .select({
      family: plants.family,
      genus: plants.genus,
      species: plants.species,
      plantCount: count(),
    })
    .from(plants)
    .groupBy(plants.family, plants.genus, plants.species)
    .orderBy(asc(plants.family), asc(plants.genus), asc(plants.species));

  // Group by family and genus
  const familyMap = new Map();
  
  hierarchy.forEach(item => {
    if (!familyMap.has(item.family)) {
      familyMap.set(item.family, {
        name: item.family,
        count: 0,
        genera: new Map(),
      });
    }
    
    const family = familyMap.get(item.family);
    family.count += item.plantCount;
    
    if (!family.genera.has(item.genus)) {
      family.genera.set(item.genus, {
        name: item.genus,
        count: 0,
        species: [],
      });
    }
    
    const genus = family.genera.get(item.genus);
    genus.count += item.plantCount;
    genus.species.push({
      name: item.species,
      count: item.plantCount,
      plants: [], // Would need additional query to populate
    });
  });

  return {
    families: Array.from(familyMap.values()).map(family => ({
      ...family,
      genera: Array.from(family.genera.values()),
    })),
  };
}

// Delete a plant (only if no instances exist)
export async function deletePlant(id: number, userId?: number): Promise<boolean> {
  // Check if plant has any instances
  const [instanceCount] = await db
    .select({ count: count() })
    .from(sql`plant_instances`)
    .where(sql`plant_id = ${id}`);

  if (instanceCount.count > 0) {
    throw new Error('Cannot delete plant with existing instances');
  }

  // Check if plant has any propagations
  const [propagationCount] = await db
    .select({ count: count() })
    .from(sql`propagations`)
    .where(sql`plant_id = ${id}`);

  if (propagationCount.count > 0) {
    throw new Error('Cannot delete plant with existing propagations');
  }

  // If userId provided, only allow deletion of plants created by that user (unless admin)
  const whereConditions = [eq(plants.id, id)];
  if (userId) {
    whereConditions.push(eq(plants.createdBy, userId));
  }

  const result = await db
    .delete(plants)
    .where(and(...whereConditions))
    .returning({ id: plants.id });

  return result.length > 0;
}