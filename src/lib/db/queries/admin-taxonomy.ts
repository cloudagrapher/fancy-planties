import 'server-only';
import { db } from '@/lib/db';
import { plants, plantInstances, propagations } from '@/lib/db/schema';
import { eq, and, sql, count, desc, asc, inArray } from 'drizzle-orm';

export interface TaxonomyNode {
  id: string;
  name: string;
  level: 'family' | 'genus' | 'species' | 'cultivar';
  plantCount: number;
  instanceCount: number;
  propagationCount: number;
  children?: TaxonomyNode[];
  plants?: TaxonomyPlant[];
}

export interface TaxonomyPlant {
  id: number;
  family: string;
  genus: string;
  species: string;
  cultivar?: string;
  commonName: string;
  isVerified: boolean;
  instanceCount: number;
  propagationCount: number;
  createdAt: Date;
}

export interface TaxonomyStats {
  totalFamilies: number;
  totalGenera: number;
  totalSpecies: number;
  totalCultivars: number;
  totalPlants: number;
  verifiedPlants: number;
  unverifiedPlants: number;
  plantsWithInstances: number;
  plantsWithPropagations: number;
  duplicateCandidates: TaxonomyPlant[];
}

export interface TaxonomyMergeRequest {
  sourceId: number;
  targetId: number;
  reason: string;
}

// Get complete taxonomy hierarchy with statistics
export async function getTaxonomyHierarchy(): Promise<TaxonomyNode[]> {
  const plantsWithStats = await db
    .select({
      id: plants.id,
      family: plants.family,
      genus: plants.genus,
      species: plants.species,
      cultivar: plants.cultivar,
      commonName: plants.commonName,
      isVerified: plants.isVerified,
      createdAt: plants.createdAt,
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
    .orderBy(asc(plants.family), asc(plants.genus), asc(plants.species));

  // Build hierarchy structure
  const familyMap = new Map<string, TaxonomyNode>();

  plantsWithStats.forEach(plant => {
    // Create or get family node
    if (!familyMap.has(plant.family)) {
      familyMap.set(plant.family, {
        id: `family-${plant.family}`,
        name: plant.family,
        level: 'family',
        plantCount: 0,
        instanceCount: 0,
        propagationCount: 0,
        children: [],
      });
    }
    const familyNode = familyMap.get(plant.family)!;

    // Find or create genus node
    let genusNode = familyNode.children?.find(g => g.name === plant.genus);
    if (!genusNode) {
      genusNode = {
        id: `genus-${plant.family}-${plant.genus}`,
        name: plant.genus,
        level: 'genus',
        plantCount: 0,
        instanceCount: 0,
        propagationCount: 0,
        children: [],
      };
      familyNode.children!.push(genusNode);
    }

    // Find or create species node
    let speciesNode = genusNode.children?.find(s => s.name === plant.species);
    if (!speciesNode) {
      speciesNode = {
        id: `species-${plant.family}-${plant.genus}-${plant.species}`,
        name: plant.species,
        level: 'species',
        plantCount: 0,
        instanceCount: 0,
        propagationCount: 0,
        children: [],
        plants: [],
      };
      genusNode.children!.push(speciesNode);
    }

    // Add plant to species node
    const taxonomyPlant: TaxonomyPlant = {
      id: plant.id,
      family: plant.family,
      genus: plant.genus,
      species: plant.species,
      cultivar: plant.cultivar || undefined,
      commonName: plant.commonName,
      isVerified: plant.isVerified,
      instanceCount: plant.instanceCount,
      propagationCount: plant.propagationCount,
      createdAt: plant.createdAt,
    };

    speciesNode.plants!.push(taxonomyPlant);

    // Update counts
    speciesNode.plantCount++;
    speciesNode.instanceCount += plant.instanceCount;
    speciesNode.propagationCount += plant.propagationCount;

    genusNode.plantCount++;
    genusNode.instanceCount += plant.instanceCount;
    genusNode.propagationCount += plant.propagationCount;

    familyNode.plantCount++;
    familyNode.instanceCount += plant.instanceCount;
    familyNode.propagationCount += plant.propagationCount;

    // Handle cultivars if present
    if (plant.cultivar) {
      let cultivarNode = speciesNode.children?.find(c => c.name === plant.cultivar);
      if (!cultivarNode) {
        cultivarNode = {
          id: `cultivar-${plant.family}-${plant.genus}-${plant.species}-${plant.cultivar}`,
          name: plant.cultivar,
          level: 'cultivar',
          plantCount: 0,
          instanceCount: 0,
          propagationCount: 0,
          plants: [],
        };
        speciesNode.children!.push(cultivarNode);
      }
      cultivarNode.plants!.push(taxonomyPlant);
      cultivarNode.plantCount++;
      cultivarNode.instanceCount += plant.instanceCount;
      cultivarNode.propagationCount += plant.propagationCount;
    }
  });

  return Array.from(familyMap.values());
}

// Get taxonomy statistics
export async function getTaxonomyStats(): Promise<TaxonomyStats> {
  const [
    familyCount,
    genusCount,
    speciesCount,
    cultivarCount,
    totalPlants,
    verifiedCount,
    plantsWithInstancesCount,
    plantsWithPropagationsCount,
  ] = await Promise.all([
    // Count unique families
    db.select({ count: sql<number>`COUNT(DISTINCT ${plants.family})` }).from(plants),
    // Count unique genera
    db.select({ count: sql<number>`COUNT(DISTINCT CONCAT(${plants.family}, '|', ${plants.genus}))` }).from(plants),
    // Count unique species
    db.select({ count: sql<number>`COUNT(DISTINCT CONCAT(${plants.family}, '|', ${plants.genus}, '|', ${plants.species}))` }).from(plants),
    // Count plants with cultivars
    db.select({ count: count() }).from(plants).where(sql`${plants.cultivar} IS NOT NULL`),
    // Total plants
    db.select({ count: count() }).from(plants),
    // Verified plants
    db.select({ count: count() }).from(plants).where(eq(plants.isVerified, true)),
    // Plants with instances
    db.select({ count: sql<number>`COUNT(DISTINCT ${plants.id})` })
      .from(plants)
      .innerJoin(plantInstances, eq(plants.id, plantInstances.plantId)),
    // Plants with propagations
    db.select({ count: sql<number>`COUNT(DISTINCT ${plants.id})` })
      .from(plants)
      .innerJoin(propagations, eq(plants.id, propagations.plantId)),
  ]);

  // Find potential duplicates (same genus/species, different common names or slight variations)
  const duplicateCandidates = await findDuplicateCandidates();

  return {
    totalFamilies: familyCount[0].count,
    totalGenera: genusCount[0].count,
    totalSpecies: speciesCount[0].count,
    totalCultivars: cultivarCount[0].count,
    totalPlants: totalPlants[0].count,
    verifiedPlants: verifiedCount[0].count,
    unverifiedPlants: totalPlants[0].count - verifiedCount[0].count,
    plantsWithInstances: plantsWithInstancesCount[0].count,
    plantsWithPropagations: plantsWithPropagationsCount[0].count,
    duplicateCandidates,
  };
}

// Find potential duplicate plants
async function findDuplicateCandidates(): Promise<TaxonomyPlant[]> {
  const duplicates = await db
    .select({
      id: plants.id,
      family: plants.family,
      genus: plants.genus,
      species: plants.species,
      cultivar: plants.cultivar,
      commonName: plants.commonName,
      isVerified: plants.isVerified,
      createdAt: plants.createdAt,
      instanceCount: sql<number>`(
        SELECT COUNT(*) FROM ${plantInstances} 
        WHERE ${plantInstances.plantId} = ${plants.id}
      )`,
      propagationCount: sql<number>`(
        SELECT COUNT(*) FROM ${propagations} 
        WHERE ${propagations.plantId} = ${plants.id}
      )`,
      duplicateCount: sql<number>`(
        SELECT COUNT(*) FROM ${plants} p2 
        WHERE p2.genus = ${plants.genus} 
        AND p2.species = ${plants.species}
        AND p2.id != ${plants.id}
      )`,
    })
    .from(plants)
    .having(sql`COUNT(*) > 1`)
    .groupBy(plants.genus, plants.species)
    .orderBy(desc(sql`duplicateCount`));

  return duplicates
    .filter(plant => plant.duplicateCount > 0)
    .map(plant => ({
      id: plant.id,
      family: plant.family,
      genus: plant.genus,
      species: plant.species,
      cultivar: plant.cultivar || undefined,
      commonName: plant.commonName,
      isVerified: plant.isVerified,
      instanceCount: plant.instanceCount,
      propagationCount: plant.propagationCount,
      createdAt: plant.createdAt,
    }));
}

// Merge two plants (move all instances and propagations from source to target)
export async function mergePlants(request: TaxonomyMergeRequest): Promise<void> {
  const { sourceId, targetId, reason } = request;

  await db.transaction(async (tx) => {
    // Update all plant instances to point to target plant
    await tx
      .update(plantInstances)
      .set({ plantId: targetId })
      .where(eq(plantInstances.plantId, sourceId));

    // Update all propagations to point to target plant
    await tx
      .update(propagations)
      .set({ plantId: targetId })
      .where(eq(propagations.plantId, sourceId));

    // Delete the source plant
    await tx
      .delete(plants)
      .where(eq(plants.id, sourceId));

    // TODO: Add audit log entry for the merge
    // This would require an audit log table to be implemented
  });
}

// Validate taxonomy entry for duplicates
export async function validateTaxonomyEntry(
  family: string,
  genus: string,
  species: string,
  cultivar?: string,
  excludeId?: number
): Promise<{ isValid: boolean; conflicts: TaxonomyPlant[] }> {
  const conditions = [
    eq(plants.family, family),
    eq(plants.genus, genus),
    eq(plants.species, species),
  ];

  if (cultivar) {
    conditions.push(eq(plants.cultivar, cultivar));
  } else {
    conditions.push(sql`${plants.cultivar} IS NULL`);
  }

  if (excludeId) {
    conditions.push(sql`${plants.id} != ${excludeId}`);
  }

  const conflicts = await db
    .select({
      id: plants.id,
      family: plants.family,
      genus: plants.genus,
      species: plants.species,
      cultivar: plants.cultivar,
      commonName: plants.commonName,
      isVerified: plants.isVerified,
      createdAt: plants.createdAt,
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
    .where(and(...conditions));

  return {
    isValid: conflicts.length === 0,
    conflicts: conflicts.map(plant => ({
      id: plant.id,
      family: plant.family,
      genus: plant.genus,
      species: plant.species,
      cultivar: plant.cultivar || undefined,
      commonName: plant.commonName,
      isVerified: plant.isVerified,
      instanceCount: plant.instanceCount,
      propagationCount: plant.propagationCount,
      createdAt: plant.createdAt,
    })),
  };
}

// Get plants by taxonomy level
export async function getPlantsByTaxonomy(
  level: 'family' | 'genus' | 'species',
  values: { family?: string; genus?: string; species?: string }
): Promise<TaxonomyPlant[]> {
  const conditions = [];

  if (values.family) {
    conditions.push(eq(plants.family, values.family));
  }
  if (values.genus) {
    conditions.push(eq(plants.genus, values.genus));
  }
  if (values.species) {
    conditions.push(eq(plants.species, values.species));
  }

  const results = await db
    .select({
      id: plants.id,
      family: plants.family,
      genus: plants.genus,
      species: plants.species,
      cultivar: plants.cultivar,
      commonName: plants.commonName,
      isVerified: plants.isVerified,
      createdAt: plants.createdAt,
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
    .where(and(...conditions))
    .orderBy(asc(plants.commonName));

  return results.map(plant => ({
    id: plant.id,
    family: plant.family,
    genus: plant.genus,
    species: plant.species,
    cultivar: plant.cultivar || undefined,
    commonName: plant.commonName,
    isVerified: plant.isVerified,
    instanceCount: plant.instanceCount,
    propagationCount: plant.propagationCount,
    createdAt: plant.createdAt,
  }));
}

// Bulk delete plants (only if no instances/propagations)
export async function bulkDeletePlants(plantIds: number[]): Promise<{ deleted: number; errors: string[] }> {
  const errors: string[] = [];
  let deleted = 0;

  for (const plantId of plantIds) {
    try {
      // Check for instances
      const [instanceCount] = await db
        .select({ count: count() })
        .from(plantInstances)
        .where(eq(plantInstances.plantId, plantId));

      if (instanceCount.count > 0) {
        errors.push(`Plant ${plantId} has ${instanceCount.count} instances and cannot be deleted`);
        continue;
      }

      // Check for propagations
      const [propagationCount] = await db
        .select({ count: count() })
        .from(propagations)
        .where(eq(propagations.plantId, plantId));

      if (propagationCount.count > 0) {
        errors.push(`Plant ${plantId} has ${propagationCount.count} propagations and cannot be deleted`);
        continue;
      }

      // Delete the plant
      const result = await db
        .delete(plants)
        .where(eq(plants.id, plantId))
        .returning({ id: plants.id });

      if (result.length > 0) {
        deleted++;
      }
    } catch (error) {
      errors.push(`Failed to delete plant ${plantId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return { deleted, errors };
}