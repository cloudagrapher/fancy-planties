/**
 * Realistic Test Data Factory - Creates test data matching actual application structures
 * Implements Requirements 8.1, 8.2, 8.3
 */

import type { 
  TestUser, TestPlant, TestPlantInstance, TestPropagation, TestCareHistory, TestCareGuide 
} from './database-test-manager';

/**
 * Realistic plant taxonomy data based on common houseplants
 */
export const REALISTIC_PLANT_FAMILIES = {
  Araceae: {
    genera: {
      Monstera: ['deliciosa', 'adansonii', 'obliqua'],
      Philodendron: ['hederaceum', 'scandens', 'bipinnatifidum', 'erubescens'],
      Pothos: ['aureus', 'marble queen', 'neon'],
      Anthurium: ['andraeanum', 'crystallinum', 'warocqueanum'],
    },
  },
  Moraceae: {
    genera: {
      Ficus: ['lyrata', 'elastica', 'benjamina', 'microcarpa'],
    },
  },
  Asparagaceae: {
    genera: {
      Sansevieria: ['trifasciata', 'cylindrica', 'moonshine'],
      Dracaena: ['marginata', 'fragrans', 'reflexa'],
    },
  },
  Cactaceae: {
    genera: {
      Echinopsis: ['pachanoi', 'peruviana'],
      Opuntia: ['microdasys', 'ficus-indica'],
      Mammillaria: ['elongata', 'gracilis'],
    },
  },
  Crassulaceae: {
    genera: {
      Echeveria: ['elegans', 'agavoides', 'pulidonis'],
      Sedum: ['morganianum', 'rubrotinctum', 'adolphii'],
      Crassula: ['ovata', 'perforata', 'capitella'],
    },
  },
};

/**
 * Common plant names mapping
 */
export const COMMON_NAMES: Record<string, string> = {
  'Monstera deliciosa': 'Swiss Cheese Plant',
  'Monstera adansonii': 'Swiss Cheese Vine',
  'Philodendron hederaceum': 'Heart Leaf Philodendron',
  'Philodendron scandens': 'Sweetheart Plant',
  'Pothos aureus': 'Golden Pothos',
  'Ficus lyrata': 'Fiddle Leaf Fig',
  'Ficus elastica': 'Rubber Plant',
  'Sansevieria trifasciata': 'Snake Plant',
  'Dracaena marginata': 'Dragon Tree',
  'Crassula ovata': 'Jade Plant',
};

/**
 * Realistic care schedules
 */
export const CARE_SCHEDULES = {
  watering: ['1 week', '2 weeks', '3 weeks', '1 month'],
  fertilizing: ['2 weeks', '1 month', '2 months', '3 months'],
  repotting: ['1 year', '2 years', '3 years'],
};

/**
 * Common locations for houseplants
 */
export const PLANT_LOCATIONS = [
  'Living Room',
  'Bedroom',
  'Kitchen',
  'Bathroom',
  'Office',
  'Dining Room',
  'Hallway',
  'Balcony',
  'Greenhouse',
  'Windowsill',
  'Plant Shelf',
  'Hanging Basket',
];

/**
 * Realistic propagation methods and statuses
 */
export const PROPAGATION_DATA = {
  methods: ['water', 'soil', 'air layering', 'division', 'leaf cutting', 'stem cutting'],
  statuses: ['started', 'rooting', 'planted', 'established'] as const,
  sources: ['gift', 'trade', 'purchase', 'other'] as const,
};

/**
 * Care types and related data
 */
export const CARE_DATA = {
  types: ['fertilizer', 'water', 'repot', 'prune', 'inspect', 'other'] as const,
  fertilizerTypes: [
    'Liquid fertilizer',
    'Slow-release pellets',
    'Organic compost',
    'Fish emulsion',
    'Worm castings',
    'Bone meal',
  ],
  potSizes: ['2 inch', '4 inch', '6 inch', '8 inch', '10 inch', '12 inch', '14 inch'],
  soilTypes: [
    'Potting mix',
    'Succulent mix',
    'Orchid bark',
    'Peat-based mix',
    'Coco coir mix',
    'Custom blend',
  ],
};

/**
 * Factory for creating realistic test users
 */
export class TestUserFactory {
  private static userCounter = 1;

  static create(overrides: Partial<TestUser> = {}): TestUser {
    const id = this.userCounter++;
    
    return {
      id,
      email: `testuser${id}@example.com`,
      hashedPassword: `$2b$10$hashedpassword${id}`,
      name: `Test User ${id}`,
      isCurator: false,
      createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random date within last 30 days
      updatedAt: new Date(),
      ...overrides,
    };
  }

  static createMany(count: number, overrides: Partial<TestUser> = {}): TestUser[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }

  static createCurator(overrides: Partial<TestUser> = {}): TestUser {
    return this.create({ isCurator: true, ...overrides });
  }

  static reset(): void {
    this.userCounter = 1;
  }
}

/**
 * Factory for creating realistic test plants
 */
export class TestPlantFactory {
  private static plantCounter = 1;

  static create(overrides: Partial<TestPlant> = {}): TestPlant {
    const id = this.plantCounter++;
    
    // Select random family and genus
    const families = Object.keys(REALISTIC_PLANT_FAMILIES);
    const family = families[Math.floor(Math.random() * families.length)];
    const genera = Object.keys(REALISTIC_PLANT_FAMILIES[family as keyof typeof REALISTIC_PLANT_FAMILIES].genera);
    const genus = genera[Math.floor(Math.random() * genera.length)];
    const species = REALISTIC_PLANT_FAMILIES[family as keyof typeof REALISTIC_PLANT_FAMILIES].genera[genus as keyof typeof REALISTIC_PLANT_FAMILIES[keyof typeof REALISTIC_PLANT_FAMILIES]['genera']][0];
    
    const scientificName = `${genus} ${species}`;
    const commonName = COMMON_NAMES[scientificName] || `${genus} ${species}`;
    
    return {
      id,
      family,
      genus,
      species,
      cultivar: Math.random() > 0.7 ? 'Variegated' : null, // 30% chance of cultivar
      commonName,
      careInstructions: `Care instructions for ${commonName}`,
      defaultImage: null,
      createdBy: Math.random() > 0.5 ? 1 : null, // 50% chance of having a creator
      isVerified: Math.random() > 0.3, // 70% chance of being verified
      createdAt: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000), // Random date within last 90 days
      updatedAt: new Date(),
      ...overrides,
    };
  }

  static createMany(count: number, overrides: Partial<TestPlant> = {}): TestPlant[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }

  static createByTaxonomy(family: string, genus: string, species: string, overrides: Partial<TestPlant> = {}): TestPlant {
    const scientificName = `${genus} ${species}`;
    const commonName = COMMON_NAMES[scientificName] || `${genus} ${species}`;
    
    return this.create({
      family,
      genus,
      species,
      commonName,
      ...overrides,
    });
  }

  static createMonstera(overrides: Partial<TestPlant> = {}): TestPlant {
    return this.createByTaxonomy('Araceae', 'Monstera', 'deliciosa', overrides);
  }

  static createPhilodendron(overrides: Partial<TestPlant> = {}): TestPlant {
    return this.createByTaxonomy('Araceae', 'Philodendron', 'hederaceum', overrides);
  }

  static createSnakePlant(overrides: Partial<TestPlant> = {}): TestPlant {
    return this.createByTaxonomy('Asparagaceae', 'Sansevieria', 'trifasciata', overrides);
  }

  static reset(): void {
    this.plantCounter = 1;
  }
}

/**
 * Factory for creating realistic test plant instances
 */
export class TestPlantInstanceFactory {
  private static instanceCounter = 1;

  static create(overrides: Partial<TestPlantInstance> = {}): TestPlantInstance {
    const id = this.instanceCounter++;
    const location = PLANT_LOCATIONS[Math.floor(Math.random() * PLANT_LOCATIONS.length)];
    const fertilizerSchedule = CARE_SCHEDULES.fertilizing[Math.floor(Math.random() * CARE_SCHEDULES.fertilizing.length)];
    
    // Generate realistic dates
    const createdAt = new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000); // Random date within last year
    const lastFertilized = Math.random() > 0.3 ? new Date(createdAt.getTime() + Math.random() * (Date.now() - createdAt.getTime())) : null;
    
    // Calculate fertilizer due date if last fertilized exists
    let fertilizerDue: Date | null = null;
    if (lastFertilized) {
      const scheduleWeeks = fertilizerSchedule.includes('week') ? parseInt(fertilizerSchedule) : 
                           fertilizerSchedule.includes('month') ? parseInt(fertilizerSchedule) * 4 : 8;
      fertilizerDue = new Date(lastFertilized.getTime() + scheduleWeeks * 7 * 24 * 60 * 60 * 1000);
    }
    
    return {
      id,
      userId: 1,
      plantId: 1,
      nickname: `Plant ${id}`,
      location,
      lastFertilized,
      fertilizerSchedule,
      fertilizerDue,
      lastRepot: Math.random() > 0.5 ? new Date(createdAt.getTime() + Math.random() * (Date.now() - createdAt.getTime())) : null,
      notes: Math.random() > 0.6 ? `Notes for plant ${id}` : null,
      images: Math.random() > 0.7 ? [`image${id}.jpg`] : [],
      isActive: Math.random() > 0.1, // 90% chance of being active
      createdAt,
      updatedAt: new Date(),
      ...overrides,
    };
  }

  static createMany(count: number, overrides: Partial<TestPlantInstance> = {}): TestPlantInstance[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }

  static createWithCareNeeded(overrides: Partial<TestPlantInstance> = {}): TestPlantInstance {
    const pastDate = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000); // 20 days ago
    const dueDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); // 2 days overdue
    
    return this.create({
      lastFertilized: pastDate,
      fertilizerDue: dueDate,
      fertilizerSchedule: '2 weeks',
      ...overrides,
    });
  }

  static createRecentlyFertilized(overrides: Partial<TestPlantInstance> = {}): TestPlantInstance {
    const recentDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000); // 3 days ago
    const futureDate = new Date(Date.now() + 11 * 24 * 60 * 60 * 1000); // 11 days from now
    
    return this.create({
      lastFertilized: recentDate,
      fertilizerDue: futureDate,
      fertilizerSchedule: '2 weeks',
      ...overrides,
    });
  }

  static reset(): void {
    this.instanceCounter = 1;
  }
}

/**
 * Factory for creating realistic test propagations
 */
export class TestPropagationFactory {
  private static propagationCounter = 1;

  static create(overrides: Partial<TestPropagation> = {}): TestPropagation {
    const id = this.propagationCounter++;
    const status = PROPAGATION_DATA.statuses[Math.floor(Math.random() * PROPAGATION_DATA.statuses.length)];
    const sourceType = Math.random() > 0.7 ? 'external' : 'internal';
    const externalSource = sourceType === 'external' ? 
      PROPAGATION_DATA.sources[Math.floor(Math.random() * PROPAGATION_DATA.sources.length)] : null;
    
    const dateStarted = new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000); // Random date within last 6 months
    const location = PLANT_LOCATIONS[Math.floor(Math.random() * PLANT_LOCATIONS.length)];
    
    return {
      id,
      userId: 1,
      plantId: 1,
      parentInstanceId: sourceType === 'internal' ? 1 : null,
      nickname: `Propagation ${id}`,
      location,
      dateStarted,
      status,
      sourceType,
      externalSource,
      externalSourceDetails: externalSource ? `Details for ${externalSource}` : null,
      notes: Math.random() > 0.5 ? `Notes for propagation ${id}` : null,
      images: Math.random() > 0.6 ? [`prop${id}.jpg`] : [],
      createdAt: dateStarted,
      updatedAt: new Date(),
      ...overrides,
    };
  }

  static createMany(count: number, overrides: Partial<TestPropagation> = {}): TestPropagation[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }

  static createByStatus(status: typeof PROPAGATION_DATA.statuses[number], overrides: Partial<TestPropagation> = {}): TestPropagation {
    return this.create({ status, ...overrides });
  }

  static createExternal(source: typeof PROPAGATION_DATA.sources[number], overrides: Partial<TestPropagation> = {}): TestPropagation {
    return this.create({
      sourceType: 'external',
      externalSource: source,
      parentInstanceId: null,
      ...overrides,
    });
  }

  static reset(): void {
    this.propagationCounter = 1;
  }
}

/**
 * Factory for creating realistic test care history
 */
export class TestCareHistoryFactory {
  private static careCounter = 1;

  static create(overrides: Partial<TestCareHistory> = {}): TestCareHistory {
    const id = this.careCounter++;
    const careType = CARE_DATA.types[Math.floor(Math.random() * CARE_DATA.types.length)];
    const careDate = new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000); // Random date within last 90 days
    
    // Add type-specific data
    const typeSpecificData: Partial<TestCareHistory> = {};
    
    if (careType === 'fertilizer') {
      typeSpecificData.fertilizerType = CARE_DATA.fertilizerTypes[Math.floor(Math.random() * CARE_DATA.fertilizerTypes.length)];
    } else if (careType === 'repot') {
      typeSpecificData.potSize = CARE_DATA.potSizes[Math.floor(Math.random() * CARE_DATA.potSizes.length)];
      typeSpecificData.soilType = CARE_DATA.soilTypes[Math.floor(Math.random() * CARE_DATA.soilTypes.length)];
    }
    
    return {
      id,
      userId: 1,
      plantInstanceId: 1,
      careType,
      careDate,
      notes: Math.random() > 0.4 ? `Care notes for ${careType}` : null,
      images: Math.random() > 0.8 ? [`care${id}.jpg`] : [],
      createdAt: careDate,
      updatedAt: new Date(),
      ...typeSpecificData,
      ...overrides,
    };
  }

  static createMany(count: number, overrides: Partial<TestCareHistory> = {}): TestCareHistory[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }

  static createByType(careType: typeof CARE_DATA.types[number], overrides: Partial<TestCareHistory> = {}): TestCareHistory {
    return this.create({ careType, ...overrides });
  }

  static createRecentFertilizer(overrides: Partial<TestCareHistory> = {}): TestCareHistory {
    return this.create({
      careType: 'fertilizer',
      careDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      fertilizerType: 'Liquid fertilizer',
      ...overrides,
    });
  }

  static reset(): void {
    this.careCounter = 1;
  }
}

/**
 * Factory for creating realistic test care guides
 */
export class TestCareGuideFactory {
  private static guideCounter = 1;

  static create(overrides: Partial<TestCareGuide> = {}): TestCareGuide {
    const id = this.guideCounter++;
    const taxonomyLevel = ['family', 'genus', 'species', 'cultivar'][Math.floor(Math.random() * 4)] as 'family' | 'genus' | 'species' | 'cultivar';
    
    // Select realistic taxonomy based on level
    const families = Object.keys(REALISTIC_PLANT_FAMILIES);
    const family = families[Math.floor(Math.random() * families.length)];
    const genera = Object.keys(REALISTIC_PLANT_FAMILIES[family as keyof typeof REALISTIC_PLANT_FAMILIES].genera);
    const genus = genera[Math.floor(Math.random() * genera.length)];
    const species = REALISTIC_PLANT_FAMILIES[family as keyof typeof REALISTIC_PLANT_FAMILIES].genera[genus as keyof typeof REALISTIC_PLANT_FAMILIES[keyof typeof REALISTIC_PLANT_FAMILIES]['genera']][0];
    
    const taxonomyData: Partial<TestCareGuide> = { family };
    if (taxonomyLevel !== 'family') {
      taxonomyData.genus = genus;
    }
    if (taxonomyLevel === 'species' || taxonomyLevel === 'cultivar') {
      taxonomyData.species = species;
    }
    if (taxonomyLevel === 'cultivar') {
      taxonomyData.cultivar = 'Variegated';
    }
    
    const commonName = COMMON_NAMES[`${genus} ${species}`] || `${genus} ${species}`;
    
    return {
      id,
      userId: 1,
      taxonomyLevel,
      commonName,
      title: `Care Guide for ${commonName}`,
      description: `Comprehensive care guide for ${commonName}`,
      watering: {
        frequency: CARE_SCHEDULES.watering[Math.floor(Math.random() * CARE_SCHEDULES.watering.length)],
        method: 'Bottom watering',
        tips: 'Allow soil to dry between waterings',
      },
      fertilizing: {
        frequency: CARE_SCHEDULES.fertilizing[Math.floor(Math.random() * CARE_SCHEDULES.fertilizing.length)],
        type: 'Balanced liquid fertilizer',
        schedule: 'Growing season only',
        tips: 'Dilute to half strength',
      },
      lighting: {
        requirements: 'Bright indirect light',
        intensity: 'Medium to high',
        duration: '12-14 hours',
        tips: 'Avoid direct sunlight',
      },
      humidity: {
        requirements: 'Moderate to high',
        range: '50-70%',
        tips: 'Use humidity tray or humidifier',
      },
      temperature: {
        range: '65-80°F (18-27°C)',
        seasonal: 'Cooler in winter',
        tips: 'Avoid cold drafts',
      },
      soil: {
        type: 'Well-draining potting mix',
        recipe: 'Peat, perlite, and bark',
        drainage: 'Excellent drainage required',
        ph: '6.0-7.0',
        tips: 'Add orchid bark for aeration',
      },
      repotting: {
        frequency: CARE_SCHEDULES.repotting[Math.floor(Math.random() * CARE_SCHEDULES.repotting.length)],
        season: 'Spring',
        potSize: 'One size larger',
        tips: 'Check roots for health',
      },
      pruning: {
        frequency: 'As needed',
        method: 'Clean cuts with sterile tools',
        season: 'Growing season',
        tips: 'Remove dead or damaged leaves',
      },
      propagation: {
        methods: 'Stem cuttings, division',
        season: 'Spring and summer',
        difficulty: 'Easy to moderate',
        tips: 'Use rooting hormone for faster results',
      },
      commonIssues: {
        pests: ['Spider mites', 'Aphids', 'Mealybugs'],
        diseases: ['Root rot', 'Leaf spot'],
        problems: ['Yellow leaves', 'Brown tips', 'Drooping'],
        solutions: {
          'Yellow leaves': 'Check watering schedule',
          'Brown tips': 'Increase humidity',
          'Drooping': 'Check soil moisture',
        },
      },
      generalTips: 'Monitor plant regularly for changes',
      additionalNotes: 'Each plant is unique and may have different needs',
      tags: ['houseplant', 'beginner-friendly', 'air-purifying'],
      images: [],
      isPublic: Math.random() > 0.5,
      isVerified: Math.random() > 0.3,
      createdAt: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
      ...taxonomyData,
      ...overrides,
    };
  }

  static createMany(count: number, overrides: Partial<TestCareGuide> = {}): TestCareGuide[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }

  static createByTaxonomyLevel(level: 'family' | 'genus' | 'species' | 'cultivar', overrides: Partial<TestCareGuide> = {}): TestCareGuide {
    return this.create({ taxonomyLevel: level, ...overrides });
  }

  static reset(): void {
    this.guideCounter = 1;
  }
}

/**
 * Complete test dataset factory
 */
export class TestDatasetFactory {
  static createCompleteDataset(options: {
    userCount?: number;
    plantCount?: number;
    instanceCount?: number;
    propagationCount?: number;
    careHistoryCount?: number;
    careGuideCount?: number;
  } = {}): {
    users: TestUser[];
    plants: TestPlant[];
    plantInstances: TestPlantInstance[];
    propagations: TestPropagation[];
    careHistory: TestCareHistory[];
    careGuides: TestCareGuide[];
  } {
    const {
      userCount = 3,
      plantCount = 10,
      instanceCount = 15,
      propagationCount = 8,
      careHistoryCount = 25,
      careGuideCount = 5,
    } = options;

    // Reset all counters
    TestUserFactory.reset();
    TestPlantFactory.reset();
    TestPlantInstanceFactory.reset();
    TestPropagationFactory.reset();
    TestCareHistoryFactory.reset();
    TestCareGuideFactory.reset();

    const users = TestUserFactory.createMany(userCount);
    const plants = TestPlantFactory.createMany(plantCount);
    
    // Create plant instances with proper user and plant references
    const plantInstances = TestPlantInstanceFactory.createMany(instanceCount).map((instance, index) => ({
      ...instance,
      userId: users[index % users.length].id!,
      plantId: plants[index % plants.length].id!,
    }));

    // Create propagations with proper references
    const propagations = TestPropagationFactory.createMany(propagationCount).map((propagation, index) => ({
      ...propagation,
      userId: users[index % users.length].id!,
      plantId: plants[index % plants.length].id!,
      parentInstanceId: propagation.sourceType === 'internal' ? plantInstances[index % plantInstances.length].id! : null,
    }));

    // Create care history with proper references
    const careHistory = TestCareHistoryFactory.createMany(careHistoryCount).map((care, index) => ({
      ...care,
      userId: users[index % users.length].id!,
      plantInstanceId: plantInstances[index % plantInstances.length].id!,
    }));

    // Create care guides with proper references
    const careGuides = TestCareGuideFactory.createMany(careGuideCount).map((guide, index) => ({
      ...guide,
      userId: users[index % users.length].id!,
    }));

    return {
      users,
      plants,
      plantInstances,
      propagations,
      careHistory,
      careGuides,
    };
  }

  static createMinimalDataset(): {
    users: TestUser[];
    plants: TestPlant[];
    plantInstances: TestPlantInstance[];
    propagations: TestPropagation[];
    careHistory: TestCareHistory[];
    careGuides: TestCareGuide[];
  } {
    return this.createCompleteDataset({
      userCount: 1,
      plantCount: 3,
      instanceCount: 5,
      propagationCount: 2,
      careHistoryCount: 8,
      careGuideCount: 2,
    });
  }
}

/**
 * Reset all factory counters
 */
export function resetAllFactories(): void {
  TestUserFactory.reset();
  TestPlantFactory.reset();
  TestPlantInstanceFactory.reset();
  TestPropagationFactory.reset();
  TestCareHistoryFactory.reset();
  TestCareGuideFactory.reset();
}