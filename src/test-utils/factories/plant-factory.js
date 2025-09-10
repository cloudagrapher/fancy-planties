// Plant test data factory

// Counter for unique test data
let plantCounter = 0;
let plantInstanceCounter = 0;
let propagationCounter = 0;

// Common plant families and genera for realistic test data
const PLANT_FAMILIES = [
  'Araceae', 'Arecaceae', 'Cactaceae', 'Euphorbiaceae', 'Ficus',
  'Marantaceae', 'Orchidaceae', 'Piperaceae', 'Rubiaceae', 'Succulentaceae'
];

const PLANT_GENERA = {
  'Araceae': ['Monstera', 'Philodendron', 'Pothos', 'Anthurium', 'Alocasia'],
  'Arecaceae': ['Chamaedorea', 'Dypsis', 'Phoenix', 'Howea'],
  'Cactaceae': ['Echinopsis', 'Mammillaria', 'Opuntia', 'Cereus'],
  'Euphorbiaceae': ['Euphorbia', 'Codiaeum', 'Jatropha'],
  'Ficus': ['Ficus'],
  'Marantaceae': ['Maranta', 'Calathea', 'Ctenanthe', 'Stromanthe'],
  'Orchidaceae': ['Phalaenopsis', 'Dendrobium', 'Cattleya'],
  'Piperaceae': ['Peperomia', 'Piper'],
  'Rubiaceae': ['Coffea', 'Gardenia'],
  'Succulentaceae': ['Echeveria', 'Sedum', 'Crassula', 'Haworthia']
};

const SPECIES_NAMES = [
  'deliciosa', 'adansonii', 'aureus', 'elastica', 'lyrata',
  'orbifolia', 'zebrina', 'tricolor', 'variegata', 'compacta'
];

const COMMON_NAMES = [
  'Swiss Cheese Plant', 'Golden Pothos', 'Rubber Plant', 'Fiddle Leaf Fig',
  'Prayer Plant', 'Snake Plant', 'Peace Lily', 'Spider Plant', 'Jade Plant',
  'Aloe Vera', 'String of Hearts', 'Monstera Deliciosa', 'Philodendron Brasil'
];

const LOCATIONS = [
  'Living Room', 'Bedroom', 'Kitchen', 'Bathroom', 'Office',
  'Balcony', 'Patio', 'Greenhouse', 'Windowsill', 'Dining Room'
];

const FERTILIZER_SCHEDULES = [
  'weekly', 'bi-weekly', 'monthly', 'bi-monthly', 'seasonal', 'as-needed'
];

/**
 * Creates a test plant (taxonomy) object with realistic data
 * @param {Object} overrides - Properties to override in the generated plant
 * @returns {Object} Test plant object
 */
export const createTestPlant = (overrides = {}) => {
  plantCounter++;
  
  const family = PLANT_FAMILIES[plantCounter % PLANT_FAMILIES.length];
  const genusOptions = PLANT_GENERA[family] || ['TestGenus'];
  const genus = genusOptions[plantCounter % genusOptions.length];
  const species = SPECIES_NAMES[plantCounter % SPECIES_NAMES.length];
  const commonName = COMMON_NAMES[plantCounter % COMMON_NAMES.length];
  
  const basePlant = {
    id: plantCounter,
    family,
    genus,
    species,
    cultivar: plantCounter % 3 === 0 ? 'Variegata' : null, // Some plants have cultivars
    commonName,
    careInstructions: `Care instructions for ${commonName}. Water when soil is dry, provide bright indirect light.`,
    defaultImage: null,
    createdBy: null,
    isVerified: plantCounter % 4 === 0, // 25% are verified
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  return {
    ...basePlant,
    ...overrides,
  };
};

/**
 * Creates a verified test plant
 * @param {Object} overrides - Properties to override
 * @returns {Object} Test verified plant object
 */
export const createTestVerifiedPlant = (overrides = {}) => {
  return createTestPlant({
    isVerified: true,
    ...overrides,
  });
};

/**
 * Creates a test plant instance (user's specific plant)
 * @param {Object} plant - Plant taxonomy object
 * @param {Object} user - User object who owns the plant
 * @param {Object} overrides - Properties to override
 * @returns {Object} Test plant instance object
 */
export const createTestPlantInstance = (plant, user, overrides = {}) => {
  plantInstanceCounter++;
  
  const location = LOCATIONS[plantInstanceCounter % LOCATIONS.length];
  const schedule = FERTILIZER_SCHEDULES[plantInstanceCounter % FERTILIZER_SCHEDULES.length];
  
  const basePlantInstance = {
    id: plantInstanceCounter,
    userId: user.id,
    plantId: plant.id,
    nickname: `My ${plant.commonName} #${plantInstanceCounter}`,
    location,
    lastFertilized: plantInstanceCounter % 2 === 0 ? new Date(Date.now() - 1000 * 60 * 60 * 24 * 14) : null, // Some fertilized 2 weeks ago
    fertilizerSchedule: schedule,
    fertilizerDue: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7), // Due in a week
    lastRepot: plantInstanceCounter % 3 === 0 ? new Date(Date.now() - 1000 * 60 * 60 * 24 * 365) : null, // Some repotted a year ago
    notes: `Personal notes about my ${plant.commonName}`,
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
 * Creates a test propagation record
 * @param {Object} plant - Plant taxonomy object
 * @param {Object} user - User object who owns the propagation
 * @param {Object} parentInstance - Optional parent plant instance
 * @param {Object} overrides - Properties to override
 * @returns {Object} Test propagation object
 */
export const createTestPropagation = (plant, user, parentInstance = null, overrides = {}) => {
  propagationCounter++;
  
  const statuses = ['started', 'rooting', 'planted', 'established'];
  const sourceTypes = ['internal', 'external'];
  const externalSources = ['gift', 'trade', 'purchase', 'other'];
  
  const sourceType = sourceTypes[propagationCounter % sourceTypes.length];
  const location = LOCATIONS[propagationCounter % LOCATIONS.length];
  
  const basePropagation = {
    id: propagationCounter,
    userId: user.id,
    plantId: plant.id,
    parentInstanceId: sourceType === 'internal' && parentInstance ? parentInstance.id : null,
    nickname: `${plant.commonName} Propagation #${propagationCounter}`,
    location,
    dateStarted: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30), // Started a month ago
    status: statuses[propagationCounter % statuses.length],
    sourceType,
    externalSource: sourceType === 'external' ? externalSources[propagationCounter % externalSources.length] : null,
    externalSourceDetails: sourceType === 'external' ? 'Details about external source' : null,
    notes: `Propagation notes for ${plant.commonName}`,
    images: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  return {
    ...basePropagation,
    ...overrides,
  };
};

/**
 * Creates multiple test plants
 * @param {number} count - Number of plants to create
 * @param {Object} baseOverrides - Base properties to apply to all plants
 * @returns {Array} Array of test plant objects
 */
export const createTestPlants = (count = 5, baseOverrides = {}) => {
  return Array.from({ length: count }, () => 
    createTestPlant(baseOverrides)
  );
};

/**
 * Creates multiple test plant instances for a user
 * @param {Object} user - User object
 * @param {Array} plants - Array of plant objects
 * @param {Object} baseOverrides - Base properties to apply to all instances
 * @returns {Array} Array of test plant instance objects
 */
export const createTestPlantInstances = (user, plants, baseOverrides = {}) => {
  return plants.map(plant => 
    createTestPlantInstance(plant, user, baseOverrides)
  );
};

/**
 * Creates a complete plant setup (plant + instance + propagations)
 * @param {Object} user - User object
 * @param {Object} plantOverrides - Properties to override for plant
 * @param {Object} instanceOverrides - Properties to override for instance
 * @returns {Object} Object with plant, instance, and propagations
 */
export const createTestPlantSetup = (user, plantOverrides = {}, instanceOverrides = {}) => {
  const plant = createTestPlant(plantOverrides);
  const instance = createTestPlantInstance(plant, user, instanceOverrides);
  const propagations = [
    createTestPropagation(plant, user, instance),
    createTestPropagation(plant, user, null, { sourceType: 'external', externalSource: 'gift' })
  ];
  
  return {
    plant,
    instance,
    propagations,
  };
};

/**
 * Creates a test care guide
 * @param {Object} user - User object who created the guide
 * @param {Object} plant - Plant object (optional, for specific plant guides)
 * @param {Object} overrides - Properties to override
 * @returns {Object} Test care guide object
 */
export const createTestCareGuide = (user, plant = null, overrides = {}) => {
  const careGuideCounter = Math.floor(Math.random() * 1000);
  
  const baseCareGuide = {
    id: careGuideCounter,
    userId: user.id,
    taxonomyLevel: plant ? 'species' : 'genus',
    family: plant?.family || 'Araceae',
    genus: plant?.genus || 'Monstera',
    species: plant?.species || null,
    cultivar: plant?.cultivar || null,
    commonName: plant?.commonName || 'Test Plant',
    title: `Care Guide for ${plant?.commonName || 'Test Plant'}`,
    description: 'Comprehensive care guide with detailed instructions',
    watering: {
      frequency: 'Weekly',
      method: 'Bottom watering',
      tips: 'Allow soil to dry between waterings'
    },
    fertilizing: {
      frequency: 'Monthly',
      type: 'Balanced liquid fertilizer',
      schedule: 'Spring through fall',
      tips: 'Dilute to half strength'
    },
    lighting: {
      requirements: 'Bright indirect light',
      intensity: 'Medium to high',
      duration: '12-14 hours',
      tips: 'Avoid direct sunlight'
    },
    humidity: {
      requirements: '50-60%',
      range: '40-70%',
      tips: 'Use humidity tray or humidifier'
    },
    temperature: {
      range: '65-80°F (18-27°C)',
      seasonal: 'Slightly cooler in winter',
      tips: 'Avoid cold drafts'
    },
    soil: {
      type: 'Well-draining potting mix',
      recipe: 'Peat, perlite, and bark',
      drainage: 'Excellent drainage required',
      ph: '6.0-7.0',
      tips: 'Add orchid bark for aeration'
    },
    repotting: {
      frequency: 'Every 2-3 years',
      season: 'Spring',
      potSize: 'One size larger',
      tips: 'Check root health during repotting'
    },
    pruning: {
      frequency: 'As needed',
      method: 'Clean cuts with sterile tools',
      season: 'Spring and summer',
      tips: 'Remove dead or yellowing leaves'
    },
    propagation: {
      methods: 'Stem cuttings, air layering',
      season: 'Spring and summer',
      difficulty: 'Easy to moderate',
      tips: 'Use rooting hormone for faster results'
    },
    commonIssues: {
      pests: ['Spider mites', 'Mealybugs', 'Scale'],
      diseases: ['Root rot', 'Leaf spot'],
      problems: ['Yellow leaves', 'Brown tips', 'Drooping'],
      solutions: {
        'Yellow leaves': 'Check watering schedule and light levels',
        'Brown tips': 'Increase humidity or check water quality',
        'Drooping': 'Usually indicates watering issues'
      }
    },
    generalTips: 'Regular inspection and consistent care routine are key to success',
    additionalNotes: 'This plant is beginner-friendly and forgiving',
    tags: ['beginner-friendly', 'low-maintenance', 'air-purifying'],
    images: [],
    isPublic: false,
    isVerified: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  return {
    ...baseCareGuide,
    ...overrides,
  };
};

/**
 * Reset all plant counters (useful for test isolation)
 */
export const resetPlantCounters = () => {
  plantCounter = 0;
  plantInstanceCounter = 0;
  propagationCounter = 0;
};