// Plant test data factory
import type { NewPlant, NewPlantInstance, Plant, PlantInstance } from '@/lib/db/schema';

// Counter for unique test data
let plantCounter = 0;
let plantInstanceCounter = 0;

/**
 * Creates a test plant object with realistic data
 * @param overrides - Properties to override in the generated plant
 * @returns Test plant object
 */
export const createTestPlant = (overrides: Partial<NewPlant> = {}): NewPlant => {
  plantCounter++;
  const timestamp = Date.now();
  const randomSuffix = Math.floor(Math.random() * 10000);
  
  const basePlant: NewPlant = {
    family: `Testaceae${plantCounter}_${timestamp}`,
    genus: `Testus${plantCounter}_${timestamp}`,
    species: `testicus${plantCounter}_${timestamp}`,
    cultivar: plantCounter % 2 === 0 ? `'Variegata${plantCounter}_${randomSuffix}'` : null,
    commonName: `Test Plant ${plantCounter}_${timestamp}`,
    isVerified: true,
  };
  
  return {
    ...basePlant,
    ...overrides,
  };
};

/**
 * Creates a test plant instance object with realistic data
 * @param overrides - Properties to override in the generated plant instance
 * @returns Test plant instance object
 */
export const createTestPlantInstance = (overrides: Partial<NewPlantInstance> = {}): NewPlantInstance => {
  plantInstanceCounter++;
  
  const basePlantInstance: NewPlantInstance = {
    // userId and plantId should be provided via overrides
    userId: 1, // Default user ID, should be overridden
    plantId: 1, // Default plant ID, should be overridden
    nickname: `My Test Plant ${plantInstanceCounter}`,
    location: `Test Location ${plantInstanceCounter}`,
    fertilizerSchedule: 'every_4_weeks',
    lastFertilized: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7), // 1 week ago
    lastRepot: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30), // 1 month ago
    notes: `Test notes for plant instance ${plantInstanceCounter}`,
    images: [],
    isActive: true,
  };
  
  return {
    ...basePlantInstance,
    ...overrides,
  };
};

/**
 * Creates a test plant suggestion object (for search/selection)
 * @param overrides - Properties to override
 * @returns Test plant suggestion object
 */
export const createTestPlantSuggestion = (overrides: Partial<Plant> = {}): Partial<Plant> => {
  const plant = createTestPlant(overrides);
  
  return {
    id: Math.floor(Math.random() * 10000) + 1,
    family: plant.family,
    genus: plant.genus,
    species: plant.species,
    cultivar: plant.cultivar,
    commonName: plant.commonName,
    isVerified: plant.isVerified,
    ...overrides,
  };
};

/**
 * Creates multiple test plants
 * @param count - Number of plants to create
 * @param baseOverrides - Base properties to apply to all plants
 * @returns Array of test plant objects
 */
export const createTestPlants = (count = 3, baseOverrides: Partial<NewPlant> = {}): NewPlant[] => {
  return Array.from({ length: count }, (_, index) => 
    createTestPlant({
      ...baseOverrides,
      commonName: `Test Plant ${plantCounter + index + 1}`,
    })
  );
};

/**
 * Creates multiple test plant instances
 * @param count - Number of plant instances to create
 * @param baseOverrides - Base properties to apply to all plant instances
 * @returns Array of test plant instance objects
 */
export const createTestPlantInstances = (count = 3, baseOverrides: Partial<NewPlantInstance> = {}): NewPlantInstance[] => {
  return Array.from({ length: count }, (_, index) => 
    createTestPlantInstance({
      ...baseOverrides,
      nickname: `My Test Plant ${plantInstanceCounter + index + 1}`,
    })
  );
};

/**
 * Creates a test plant with specific taxonomy
 * @param taxonomy - Taxonomy data (family, genus, species, etc.)
 * @param overrides - Additional properties to override
 * @returns Test plant with specified taxonomy
 */
export const createTestPlantWithTaxonomy = (
  taxonomy: {
    family?: string;
    genus?: string;
    species?: string;
    cultivar?: string | null;
    commonName?: string;
  },
  overrides: Partial<NewPlant> = {}
): NewPlant => {
  return createTestPlant({
    family: taxonomy.family || 'Testaceae',
    genus: taxonomy.genus || 'Testus',
    species: taxonomy.species || 'testicus',
    cultivar: taxonomy.cultivar || null,
    commonName: taxonomy.commonName || 'Test Plant',
    ...overrides,
  });
};

/**
 * Creates a test plant instance with care history
 * @param overrides - Properties to override
 * @param careRecordCount - Number of care records to create
 * @returns Test plant instance with care history
 */
export const createTestPlantInstanceWithCareHistory = (
  overrides: Partial<NewPlantInstance> = {}, 
  careRecordCount = 5
): NewPlantInstance & { careHistory: any[] } => {
  const plantInstance = createTestPlantInstance(overrides);
  
  // Create care history
  const careHistory = Array.from({ length: careRecordCount }, (_, index) => ({
    id: index + 1,
    plantInstanceId: 1, // Will be set when plant instance is created
    userId: plantInstance.userId,
    careType: ['fertilizer', 'water', 'repot', 'prune', 'inspect'][index % 5],
    careDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * (index + 1)), // Days ago
    notes: `Care record ${index + 1}`,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * (index + 1)),
  }));
  
  return {
    ...plantInstance,
    careHistory,
  };
};

/**
 * Creates a test plant instance with images
 * @param overrides - Properties to override
 * @param imageCount - Number of images to create
 * @returns Test plant instance with images
 */
export const createTestPlantInstanceWithImages = (
  overrides: Partial<NewPlantInstance> = {}, 
  imageCount = 3
): NewPlantInstance => {
  const images = Array.from({ length: imageCount }, (_, index) => 
    `/uploads/plants/test-image-${index + 1}.jpg`
  );
  
  return createTestPlantInstance({
    ...overrides,
    images,
  });
};

/**
 * Creates a test plant instance for a specific user
 * @param userId - User ID to associate with the plant instance
 * @param overrides - Properties to override
 * @returns Test plant instance for the specified user
 */
export const createTestPlantInstanceForUser = (userId: number, overrides: Partial<NewPlantInstance> = {}): NewPlantInstance => {
  return createTestPlantInstance({
    userId,
    ...overrides,
  });
};

/**
 * Creates test plant instances with different fertilizer schedules
 * @param schedules - Array of fertilizer schedules
 * @returns Array of plant instances with different schedules
 */
export const createTestPlantInstancesWithSchedules = (
  schedules: string[] = ['weekly', 'biweekly', 'every_4_weeks']
): NewPlantInstance[] => {
  return schedules.map((schedule, index) => 
    createTestPlantInstance({
      nickname: `Plant with ${schedule} schedule`,
      fertilizerSchedule: schedule,
    })
  );
};

/**
 * Creates a test plant instance that needs care
 * @param careType - Type of care needed
 * @param daysOverdue - Number of days overdue (default: 1)
 * @param overrides - Properties to override
 * @returns Test plant instance that needs care
 */
export const createTestPlantInstanceNeedingCare = (
  careType: 'fertilizer' | 'water' = 'fertilizer', 
  daysOverdue = 1, 
  overrides: Partial<NewPlantInstance> = {}
): NewPlantInstance => {
  const lastCareDate = new Date();
  
  // Calculate when care was last done based on schedule and overdue days
  if (careType === 'fertilizer') {
    lastCareDate.setDate(lastCareDate.getDate() - (28 + daysOverdue)); // 4 weeks + overdue
  }
  
  return createTestPlantInstance({
    lastFertilized: careType === 'fertilizer' ? lastCareDate : null,
    fertilizerSchedule: 'every_4_weeks',
    ...overrides,
  });
};

/**
 * Creates test data for plant search/filtering
 * @param searchCriteria - Search criteria to match
 * @returns Array of plants that match search criteria
 */
export const createTestPlantsForSearch = (searchCriteria: {
  family?: string;
  genus?: string;
  species?: string;
  commonName?: string;
} = {}): NewPlant[] => {
  const plants: NewPlant[] = [];
  
  // Create plants that match search criteria
  if (searchCriteria.family) {
    plants.push(createTestPlant({
      family: searchCriteria.family,
      commonName: `Plant in ${searchCriteria.family}`,
    }));
  }
  
  if (searchCriteria.commonName) {
    plants.push(createTestPlant({
      commonName: searchCriteria.commonName,
    }));
  }
  
  if (searchCriteria.genus) {
    plants.push(createTestPlant({
      genus: searchCriteria.genus,
      commonName: `${searchCriteria.genus} species`,
    }));
  }
  
  // Add some non-matching plants for contrast
  plants.push(
    createTestPlant({ commonName: 'Non-matching Plant 1' }),
    createTestPlant({ commonName: 'Non-matching Plant 2' })
  );
  
  return plants;
};

/**
 * Reset the plant counters (useful for test isolation)
 */
export const resetPlantCounters = () => {
  plantCounter = 0;
  plantInstanceCounter = 0;
};

/**
 * Creates realistic plant data for specific plant types
 */
export const createRealisticPlants = {
  monstera: (): NewPlant => createTestPlant({
    family: 'Araceae',
    genus: 'Monstera',
    species: 'deliciosa',
    cultivar: null,
    commonName: 'Monstera Deliciosa',
  }),
  
  pothos: (): NewPlant => createTestPlant({
    family: 'Araceae',
    genus: 'Epipremnum',
    species: 'aureum',
    cultivar: null,
    commonName: 'Golden Pothos',
  }),
  
  snakePlant: (): NewPlant => createTestPlant({
    family: 'Asparagaceae',
    genus: 'Sansevieria',
    species: 'trifasciata',
    cultivar: null,
    commonName: 'Snake Plant',
  }),
  
  fiddle: (): NewPlant => createTestPlant({
    family: 'Moraceae',
    genus: 'Ficus',
    species: 'lyrata',
    cultivar: null,
    commonName: 'Fiddle Leaf Fig',
  }),
};

/**
 * Creates realistic plant instances for specific scenarios
 */
export const createRealisticPlantInstances = {
  thriving: (userId = 1, plantId = 1): NewPlantInstance => createTestPlantInstance({
    userId,
    plantId,
    nickname: 'My Thriving Plant',
    location: 'Living Room Window',
    notes: 'Growing beautifully, lots of new growth',
    lastFertilized: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14), // 2 weeks ago
    fertilizerSchedule: 'every_4_weeks',
  }),
  
  struggling: (userId = 1, plantId = 1): NewPlantInstance => createTestPlantInstance({
    userId,
    plantId,
    nickname: 'Struggling Plant',
    location: 'Dark Corner',
    notes: 'Yellowing leaves, might need more light',
    lastFertilized: new Date(Date.now() - 1000 * 60 * 60 * 24 * 35), // 5 weeks ago (overdue)
    fertilizerSchedule: 'every_4_weeks',
  }),
  
  newPlant: (userId = 1, plantId = 1): NewPlantInstance => createTestPlantInstance({
    userId,
    plantId,
    nickname: 'New Addition',
    location: 'Kitchen Counter',
    notes: 'Just brought home from nursery',
    lastFertilized: null,
    lastRepot: new Date(), // Just repotted
    fertilizerSchedule: 'every_4_weeks',
  }),
};

/**
 * Creates test data for plant management workflows
 * @param userId - User ID to associate with the data
 * @returns Complete test data set for plant management testing
 */
export const createPlantManagementTestData = (userId = 1) => {
  const plants = [
    createRealisticPlants.monstera(),
    createRealisticPlants.pothos(),
    createRealisticPlants.snakePlant(),
  ];
  
  const plantInstances = [
    createRealisticPlantInstances.thriving(userId, 1),
    createRealisticPlantInstances.struggling(userId, 2),
    createRealisticPlantInstances.newPlant(userId, 3),
  ];
  
  return {
    plants,
    plantInstances,
    searchableData: createTestPlantsForSearch({
      family: 'Araceae',
      genus: 'Monstera',
      commonName: 'Test Search Plant',
    }),
  };
};

/**
 * Creates test data for plant taxonomy validation
 * @returns Test data for taxonomy validation scenarios
 */
export const createTaxonomyTestData = () => {
  return {
    validTaxonomy: {
      family: 'Araceae',
      genus: 'Monstera',
      species: 'deliciosa',
      cultivar: null,
      commonName: 'Monstera Deliciosa',
    },
    taxonomyWithCultivar: {
      family: 'Araceae',
      genus: 'Monstera',
      species: 'deliciosa',
      cultivar: 'Variegata',
      commonName: 'Variegated Monstera Deliciosa',
    },
    incompleteTaxonomy: {
      family: 'Araceae',
      genus: 'Monstera',
      // Missing species
      commonName: 'Incomplete Monstera',
    },
    duplicateTaxonomy: {
      family: 'Araceae',
      genus: 'Monstera',
      species: 'deliciosa',
      cultivar: null,
      commonName: 'Another Monstera Deliciosa', // Different common name, same taxonomy
    },
  };
};