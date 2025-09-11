// Plant test data factory

// Counter for unique test data
let plantCounter = 0;
let plantInstanceCounter = 0;
let careRecordCounter = 0;

/**
 * Creates a test plant object with realistic data
 * @param {Object} overrides - Properties to override in the generated plant
 * @returns {Object} Test plant object
 */
export const createTestPlant = (overrides = {}) => {
  plantCounter++;
  const timestamp = Date.now();
  const randomSuffix = Math.floor(Math.random() * 10000);
  
  const basePlant = {
    // Remove id - let database auto-generate it
    family: `Testaceae${plantCounter}_${timestamp}`,
    genus: `Testus${plantCounter}_${timestamp}`,
    species: `testicus${plantCounter}_${timestamp}`,
    cultivar: plantCounter % 2 === 0 ? `'Variegata${plantCounter}_${randomSuffix}'` : null,
    commonName: `Test Plant ${plantCounter}_${timestamp}`,
    isVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  return {
    ...basePlant,
    ...overrides,
  };
};

/**
 * Creates a test plant instance object with realistic data
 * @param {Object} overrides - Properties to override in the generated plant instance
 * @returns {Object} Test plant instance object
 */
export const createTestPlantInstance = (overrides = {}) => {
  plantInstanceCounter++;
  
  const basePlantInstance = {
    // Remove id - let database auto-generate it
    // plantId and userId should be provided via overrides
    nickname: `My Test Plant ${plantInstanceCounter}`,
    location: `Test Location ${plantInstanceCounter}`,
    fertilizerSchedule: 'every_4_weeks',
    lastFertilized: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7), // 1 week ago
    lastRepot: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30), // 1 month ago
    notes: `Test notes for plant instance ${plantInstanceCounter}`,
    images: [],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  return {
    ...basePlantInstance,
    ...overrides,
  };
};

/**
 * Creates a test plant suggestion object (for search/selection)
 * @param {Object} overrides - Properties to override
 * @returns {Object} Test plant suggestion object
 */
export const createTestPlantSuggestion = (overrides = {}) => {
  const plant = createTestPlant(overrides);
  
  return {
    id: plant.id,
    family: plant.family,
    genus: plant.genus,
    species: plant.species,
    cultivar: plant.cultivar,
    commonName: plant.commonName,
    isVerified: plant.isVerified,
  };
};

/**
 * Creates multiple test plants
 * @param {number} count - Number of plants to create
 * @param {Object} baseOverrides - Base properties to apply to all plants
 * @returns {Array} Array of test plant objects
 */
export const createTestPlants = (count = 3, baseOverrides = {}) => {
  return Array.from({ length: count }, (_, index) => 
    createTestPlant({
      ...baseOverrides,
      commonName: `Test Plant ${plantCounter + index + 1}`,
    })
  );
};

/**
 * Creates multiple test plant instances
 * @param {number} count - Number of plant instances to create
 * @param {Object} baseOverrides - Base properties to apply to all plant instances
 * @returns {Array} Array of test plant instance objects
 */
export const createTestPlantInstances = (count = 3, baseOverrides = {}) => {
  return Array.from({ length: count }, (_, index) => 
    createTestPlantInstance({
      ...baseOverrides,
      nickname: `My Test Plant ${plantInstanceCounter + index + 1}`,
    })
  );
};

/**
 * Creates a test plant with specific taxonomy
 * @param {Object} taxonomy - Taxonomy data (family, genus, species, etc.)
 * @param {Object} overrides - Additional properties to override
 * @returns {Object} Test plant with specified taxonomy
 */
export const createTestPlantWithTaxonomy = (taxonomy, overrides = {}) => {
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
 * @param {Object} overrides - Properties to override
 * @param {number} careRecordCount - Number of care records to create
 * @returns {Object} Test plant instance with care history
 */
export const createTestPlantInstanceWithCareHistory = (overrides = {}, careRecordCount = 5) => {
  const plantInstance = createTestPlantInstance(overrides);
  
  // Create care history
  const careHistory = Array.from({ length: careRecordCount }, (_, index) => ({
    id: index + 1,
    plantInstanceId: plantInstance.id,
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
 * @param {Object} overrides - Properties to override
 * @param {number} imageCount - Number of images to create
 * @returns {Object} Test plant instance with images
 */
export const createTestPlantInstanceWithImages = (overrides = {}, imageCount = 3) => {
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
 * @param {number} userId - User ID to associate with the plant instance
 * @param {Object} overrides - Properties to override
 * @returns {Object} Test plant instance for the specified user
 */
export const createTestPlantInstanceForUser = (userId, overrides = {}) => {
  return createTestPlantInstance({
    userId,
    ...overrides,
  });
};

/**
 * Creates test plant instances with different fertilizer schedules
 * @param {Array} schedules - Array of fertilizer schedules
 * @returns {Array} Array of plant instances with different schedules
 */
export const createTestPlantInstancesWithSchedules = (schedules = ['weekly', 'biweekly', 'every_4_weeks']) => {
  return schedules.map((schedule, index) => 
    createTestPlantInstance({
      nickname: `Plant with ${schedule} schedule`,
      fertilizerSchedule: schedule,
    })
  );
};

/**
 * Creates a test plant instance that needs care
 * @param {string} careType - Type of care needed
 * @param {number} daysOverdue - Number of days overdue (default: 1)
 * @param {Object} overrides - Properties to override
 * @returns {Object} Test plant instance that needs care
 */
export const createTestPlantInstanceNeedingCare = (careType = 'fertilizer', daysOverdue = 1, overrides = {}) => {
  const lastCareDate = new Date();
  
  // Calculate when care was last done based on schedule and overdue days
  if (careType === 'fertilizer') {
    lastCareDate.setDate(lastCareDate.getDate() - (28 + daysOverdue)); // 4 weeks + overdue
  } else if (careType === 'water') {
    lastCareDate.setDate(lastCareDate.getDate() - (7 + daysOverdue)); // 1 week + overdue
  }
  
  return createTestPlantInstance({
    lastFertilized: careType === 'fertilizer' ? lastCareDate : null,
    lastWatered: careType === 'water' ? lastCareDate : null,
    fertilizerSchedule: 'every_4_weeks',
    ...overrides,
  });
};

/**
 * Creates test data for plant search/filtering
 * @param {Object} searchCriteria - Search criteria to match
 * @returns {Array} Array of plants that match search criteria
 */
export const createTestPlantsForSearch = (searchCriteria = {}) => {
  const plants = [];
  
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
 * Creates a test care record object with realistic data
 * @param {Object} overrides - Properties to override in the generated care record
 * @returns {Object} Test care record object
 */
export const createTestCareRecord = (overrides = {}) => {
  careRecordCounter++;
  
  const baseCareRecord = {
    id: careRecordCounter,
    plantInstanceId: 1,
    userId: 1,
    careType: 'watering',
    careDate: new Date(),
    notes: `Test care record ${careRecordCounter}`,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  return {
    ...baseCareRecord,
    ...overrides,
  };
};

/**
 * Creates multiple test care records
 * @param {number} count - Number of care records to create
 * @param {Object} baseOverrides - Base properties to apply to all care records
 * @returns {Array} Array of test care record objects
 */
export const createTestCareRecords = (count = 3, baseOverrides = {}) => {
  return Array.from({ length: count }, (_, index) => 
    createTestCareRecord({
      ...baseOverrides,
      careType: ['watering', 'fertilizing', 'repotting'][index % 3],
      careDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * (index + 1)), // Days ago
    })
  );
};

/**
 * Creates a test care record for a specific plant instance
 * @param {number} plantInstanceId - Plant instance ID
 * @param {Object} overrides - Properties to override
 * @returns {Object} Test care record for the specified plant instance
 */
export const createTestCareRecordForPlant = (plantInstanceId, overrides = {}) => {
  return createTestCareRecord({
    plantInstanceId,
    ...overrides,
  });
};

/**
 * Reset the plant counters (useful for test isolation)
 */
export const resetPlantCounters = () => {
  plantCounter = 0;
  plantInstanceCounter = 0;
  careRecordCounter = 0;
};

/**
 * Creates realistic plant data for specific plant types
 */
export const createRealisticPlants = {
  monstera: () => createTestPlant({
    family: 'Araceae',
    genus: 'Monstera',
    species: 'deliciosa',
    cultivar: null,
    commonName: 'Monstera Deliciosa',
  }),
  
  pothos: () => createTestPlant({
    family: 'Araceae',
    genus: 'Epipremnum',
    species: 'aureum',
    cultivar: null,
    commonName: 'Golden Pothos',
  }),
  
  snakePlant: () => createTestPlant({
    family: 'Asparagaceae',
    genus: 'Sansevieria',
    species: 'trifasciata',
    cultivar: null,
    commonName: 'Snake Plant',
  }),
  
  fiddle: () => createTestPlant({
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
  thriving: () => createTestPlantInstance({
    nickname: 'My Thriving Plant',
    location: 'Living Room Window',
    notes: 'Growing beautifully, lots of new growth',
    lastFertilized: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14), // 2 weeks ago
    fertilizerSchedule: 'every_4_weeks',
  }),
  
  struggling: () => createTestPlantInstance({
    nickname: 'Struggling Plant',
    location: 'Dark Corner',
    notes: 'Yellowing leaves, might need more light',
    lastFertilized: new Date(Date.now() - 1000 * 60 * 60 * 24 * 35), // 5 weeks ago (overdue)
    fertilizerSchedule: 'every_4_weeks',
  }),
  
  newPlant: () => createTestPlantInstance({
    nickname: 'New Addition',
    location: 'Kitchen Counter',
    notes: 'Just brought home from nursery',
    lastFertilized: null,
    lastRepot: new Date(), // Just repotted
    fertilizerSchedule: 'every_4_weeks',
  }),
};