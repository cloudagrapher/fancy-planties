/**
 * Plant Data Database Query Tests - Fixed Version
 * Tests plant and plant instance CRUD operations, search, filtering, and relationships
 */

import { PlantInstanceQueries } from '../../lib/db/queries/plant-instances';
import { validatePlantTaxonomy } from '../../lib/db/queries/plant-taxonomy';
import { PlantQueries } from '../../lib/db/queries/plants';
import {
    createTestPlant,
    createTestPlantInstance,
    createTestPlantWithTaxonomy,
    resetPlantCounters
} from '../../test-utils/factories/plant-factory.ts';
import { createTestUser, resetUserCounter } from '../../test-utils/factories/user-factory.ts';
import { createDatabaseTestManager } from '../../test-utils/setup/database-test-manager';

describe('Plant Data Database Queries', () => {
    let dbManager;

    beforeAll(() => {
        // Reset all counters at the start
        resetPlantCounters();
        resetUserCounter();
    });

    beforeEach(() => {
        dbManager = createDatabaseTestManager();
    });

    afterEach(async () => {
        await dbManager.cleanup();
    });

    describe('Plant Taxonomy CRUD Operations', () => {
        test('should create a new plant taxonomy entry', async () => {
            const testUser = createTestUser();
            const createdUser = await dbManager.createTestUser(testUser);

            const plantData = createTestPlant({
                createdBy: createdUser.id,
                family: 'TestFamily1',
                genus: 'TestGenus1',
                species: 'testspecies1',
                commonName: 'Test Plant 1'
            });

            const plant = await PlantQueries.create(plantData);

            expect(plant).toBeDefined();
            expect(plant.id).toBeDefined();
            expect(plant.family).toBe('TestFamily1');
            expect(plant.genus).toBe('TestGenus1');
            expect(plant.species).toBe('testspecies1');
            expect(plant.commonName).toBe('Test Plant 1');
            expect(plant.createdBy).toBe(createdUser.id);
            expect(plant.createdAt).toBeInstanceOf(Date);
            expect(plant.updatedAt).toBeInstanceOf(Date);
        });

        test('should retrieve plant by ID', async () => {
            const testUser = createTestUser();
            const createdUser = await dbManager.createTestUser(testUser);

            const plantData = createTestPlant({
                createdBy: createdUser.id,
                family: 'TestFamily2',
                genus: 'TestGenus2',
                species: 'testspecies2'
            });
            const createdPlant = await PlantQueries.create(plantData);

            const foundPlant = await PlantQueries.getById(createdPlant.id);

            expect(foundPlant).toBeDefined();
            expect(foundPlant.id).toBe(createdPlant.id);
            expect(foundPlant.family).toBe(createdPlant.family);
            expect(foundPlant.genus).toBe(createdPlant.genus);
            expect(foundPlant.species).toBe(createdPlant.species);
            expect(foundPlant.commonName).toBe(createdPlant.commonName);
        });

        test('should return null for non-existent plant ID', async () => {
            const plant = await PlantQueries.getById(99999);
            expect(plant).toBeNull();
        });

        test('should update plant taxonomy entry', async () => {
            const testUser = createTestUser();
            const createdUser = await dbManager.createTestUser(testUser);

            const plantData = createTestPlant({
                createdBy: createdUser.id,
                family: 'TestFamily3',
                genus: 'TestGenus3',
                species: 'testspecies3'
            });
            const createdPlant = await PlantQueries.create(plantData);

            const updates = {
                commonName: 'Updated Common Name',
                careInstructions: 'Updated care instructions',
                isVerified: true,
            };

            const updatedPlant = await PlantQueries.update(createdPlant.id, updates);

            expect(updatedPlant.commonName).toBe('Updated Common Name');
            expect(updatedPlant.careInstructions).toBe('Updated care instructions');
            expect(updatedPlant.isVerified).toBe(true);
            expect(updatedPlant.updatedAt.getTime()).toBeGreaterThan(createdPlant.updatedAt.getTime());
        });

        test('should check if plant taxonomy already exists', async () => {
            const testUser = createTestUser();
            const createdUser = await dbManager.createTestUser(testUser);

            const plantData = createTestPlantWithTaxonomy({
                family: 'UniqueFamily1',
                genus: 'UniqueGenus1',
                species: 'uniquespecies1',
                cultivar: null,
            }, { createdBy: createdUser.id });

            await PlantQueries.create(plantData);

            // Check for existing taxonomy
            const existingPlant = await PlantQueries.taxonomyExists('UniqueFamily1', 'UniqueGenus1', 'uniquespecies1');
            expect(existingPlant).toBeDefined();
            expect(existingPlant.family).toBe('UniqueFamily1');

            // Check for non-existing taxonomy
            const nonExistingPlant = await PlantQueries.taxonomyExists('UniqueFamily1', 'UniqueGenus1', 'nonexistent');
            expect(nonExistingPlant).toBeNull();
        });

        test('should handle cultivar variations in taxonomy existence check', async () => {
            const testUser = createTestUser();
            const createdUser = await dbManager.createTestUser(testUser);

            const timestamp = Date.now();
            const randomId = Math.floor(Math.random() * 10000);

            // Create plant with cultivar
            const plantWithCultivar = createTestPlantWithTaxonomy({
                family: `CultivarFamily${timestamp}${randomId}`,
                genus: `CultivarGenus${timestamp}${randomId}`,
                species: `cultivarspecies${timestamp}${randomId}`,
                cultivar: 'Variegata',
            }, { createdBy: createdUser.id });

            await PlantQueries.create(plantWithCultivar);

            // Check for exact match with cultivar
            const exactMatch = await PlantQueries.taxonomyExists(`CultivarFamily${timestamp}${randomId}`, `CultivarGenus${timestamp}${randomId}`, `cultivarspecies${timestamp}${randomId}`, 'Variegata');
            expect(exactMatch).toBeDefined();

            // Check for same species without cultivar
            const withoutCultivar = await PlantQueries.taxonomyExists(`CultivarFamily${timestamp}${randomId}`, `CultivarGenus${timestamp}${randomId}`, `cultivarspecies${timestamp}${randomId}`);
            expect(withoutCultivar).toBeNull(); // Should not match because one has cultivar, one doesn't
        });
    });

    describe('Plant Search and Filtering', () => {
        test('should search plants by common name', async () => {
            const testUser = createTestUser();
            const createdUser = await dbManager.createTestUser(testUser);

            // Create test plants with unique names
            const monstera = createTestPlantWithTaxonomy({
                family: 'SearchFamily1',
                genus: 'SearchGenus1',
                species: 'searchspecies1',
                commonName: 'Unique Monstera Plant',
            }, { createdBy: createdUser.id });

            const pothos = createTestPlantWithTaxonomy({
                family: 'SearchFamily2',
                genus: 'SearchGenus2',
                species: 'searchspecies2',
                commonName: 'Unique Pothos Plant',
            }, { createdBy: createdUser.id });

            await PlantQueries.create(monstera);
            await PlantQueries.create(pothos);

            // Search by common name
            const monsteraResults = await PlantQueries.search('Unique Monstera');
            expect(monsteraResults.length).toBeGreaterThan(0);
            expect(monsteraResults.some(p => p.commonName.includes('Unique Monstera'))).toBe(true);

            const pothosResults = await PlantQueries.search('Unique Pothos');
            expect(pothosResults.length).toBeGreaterThan(0);
            expect(pothosResults.some(p => p.commonName.includes('Unique Pothos'))).toBe(true);
        });

        test('should search plants by genus and species', async () => {
            const testUser = createTestUser();
            const createdUser = await dbManager.createTestUser(testUser);

            const plant = createTestPlantWithTaxonomy({
                family: 'SearchFamily3',
                genus: 'UniqueSearchGenus',
                species: 'uniquesearchspecies',
                commonName: 'Search Test Plant',
            }, { createdBy: createdUser.id });

            await PlantQueries.create(plant);

            // Search by genus
            const genusResults = await PlantQueries.search('UniqueSearchGenus');
            expect(genusResults.length).toBeGreaterThan(0);
            expect(genusResults.some(p => p.genus === 'UniqueSearchGenus')).toBe(true);

            // Search by species
            const speciesResults = await PlantQueries.search('uniquesearchspecies');
            expect(speciesResults.length).toBeGreaterThan(0);
            expect(speciesResults.some(p => p.species === 'uniquesearchspecies')).toBe(true);
        });

        test('should get plants by family', async () => {
            const testUser = createTestUser();
            const createdUser = await dbManager.createTestUser(testUser);

            const timestamp = Date.now();
            const randomId = Math.floor(Math.random() * 10000);
            const uniqueFamily = `UniqueFamilyTest${timestamp}${randomId}`;

            // Create plants in same unique family
            const monstera = createTestPlantWithTaxonomy({
                family: uniqueFamily,
                genus: `TestGenus1${timestamp}${randomId}`,
                species: `testspecies1${timestamp}${randomId}`,
            }, { createdBy: createdUser.id });

            const pothos = createTestPlantWithTaxonomy({
                family: uniqueFamily,
                genus: `TestGenus2${timestamp}${randomId}`,
                species: `testspecies2${timestamp}${randomId}`,
            }, { createdBy: createdUser.id });

            await PlantQueries.create(monstera);
            await PlantQueries.create(pothos);

            const familyResults = await PlantQueries.getByFamily(uniqueFamily);
            expect(familyResults.length).toBe(2);
            expect(familyResults.every(p => p.family === uniqueFamily)).toBe(true);
        });

        test('should perform full-text search', async () => {
            const testUser = createTestUser();
            const createdUser = await dbManager.createTestUser(testUser);

            const plant = createTestPlantWithTaxonomy({
                family: 'FullTextFamily',
                genus: 'FullTextGenus',
                species: 'fulltextspecies',
                commonName: 'Unique Swiss Cheese Plant',
            }, { createdBy: createdUser.id });

            await PlantQueries.create(plant);

            // Test full-text search (should fallback to regular search if PostgreSQL full-text fails)
            const results = await PlantQueries.fullTextSearch('Unique Swiss Cheese');
            expect(results.length).toBeGreaterThan(0);
        });

        test('should get all plants with pagination', async () => {
            const testUser = createTestUser();
            const createdUser = await dbManager.createTestUser(testUser);

            // Create multiple plants with unique names
            const plants = [
                createTestPlantWithTaxonomy({ commonName: 'Pagination Plant 1' }, { createdBy: createdUser.id }),
                createTestPlantWithTaxonomy({ commonName: 'Pagination Plant 2' }, { createdBy: createdUser.id }),
                createTestPlantWithTaxonomy({ commonName: 'Pagination Plant 3' }, { createdBy: createdUser.id }),
            ];

            for (const plant of plants) {
                await PlantQueries.create(plant);
            }

            // Test pagination
            const firstPage = await PlantQueries.getAll(0, 2);
            expect(firstPage.length).toBe(2);

            const secondPage = await PlantQueries.getAll(2, 2);
            expect(secondPage.length).toBeGreaterThanOrEqual(1);
        });
    });

    describe('Plant Instance CRUD Operations', () => {
        test('should create a new plant instance', async () => {
            const testUser = createTestUser();
            const createdUser = await dbManager.createTestUser(testUser);

            const plant = createTestPlant({ createdBy: createdUser.id });
            const createdPlant = await PlantQueries.create(plant);

            const instanceData = {
                userId: createdUser.id,
                plantId: createdPlant.id,
                nickname: 'My Test Plant Instance',
                location: 'Test Room',
                fertilizerSchedule: 'every_4_weeks',
                notes: 'Test plant instance notes',
                images: [],
                isActive: true,
            };

            const instance = await PlantInstanceQueries.create(instanceData);

            expect(instance).toBeDefined();
            expect(instance.id).toBeDefined();
            expect(instance.userId).toBe(createdUser.id);
            expect(instance.plantId).toBe(createdPlant.id);
            expect(instance.nickname).toBe('My Test Plant Instance');
            expect(instance.location).toBe('Test Room');
            expect(instance.fertilizerSchedule).toBe('every_4_weeks');
            expect(instance.isActive).toBe(true);
            expect(instance.createdAt).toBeInstanceOf(Date);
        });

        test('should retrieve plant instance by ID with plant data', async () => {
            const testUser = createTestUser();
            const createdUser = await dbManager.createTestUser(testUser);

            const plant = createTestPlant({ createdBy: createdUser.id });
            const createdPlant = await PlantQueries.create(plant);

            const instanceData = createTestPlantInstance({
                userId: createdUser.id,
                plantId: createdPlant.id,
            });

            const createdInstance = await PlantInstanceQueries.create(instanceData);

            const foundInstance = await PlantInstanceQueries.getById(createdInstance.id);

            expect(foundInstance).toBeDefined();
            expect(foundInstance.id).toBe(createdInstance.id);
            expect(foundInstance.plant).toBeDefined();
            expect(foundInstance.plant.id).toBe(createdPlant.id);
            expect(foundInstance.plant.commonName).toBe(createdPlant.commonName);
        });

        test('should get all plant instances for a user', async () => {
            const testUser = createTestUser();
            const createdUser = await dbManager.createTestUser(testUser);

            const plant = createTestPlant({ createdBy: createdUser.id });
            const createdPlant = await PlantQueries.create(plant);

            // Create multiple instances for the user
            const instance1 = createTestPlantInstance({
                userId: createdUser.id,
                plantId: createdPlant.id,
                nickname: 'Test Plant 1',
            });

            const instance2 = createTestPlantInstance({
                userId: createdUser.id,
                plantId: createdPlant.id,
                nickname: 'Test Plant 2',
            });

            await PlantInstanceQueries.create(instance1);
            await PlantInstanceQueries.create(instance2);

            const userInstances = await PlantInstanceQueries.getByUserId(createdUser.id);

            expect(userInstances.length).toBe(2);
            expect(userInstances.every(i => i.userId === createdUser.id)).toBe(true);
            expect(userInstances.every(i => i.plant)).toBe(true);
        });

        test('should update plant instance', async () => {
            const testUser = createTestUser();
            const createdUser = await dbManager.createTestUser(testUser);

            const plant = createTestPlant({ createdBy: createdUser.id });
            const createdPlant = await PlantQueries.create(plant);

            const instanceData = createTestPlantInstance({
                userId: createdUser.id,
                plantId: createdPlant.id,
            });

            const createdInstance = await PlantInstanceQueries.create(instanceData);

            const updates = {
                nickname: 'Updated Nickname',
                location: 'New Location',
                notes: 'Updated notes',
            };

            const updatedInstance = await PlantInstanceQueries.update(createdInstance.id, updates);

            expect(updatedInstance.nickname).toBe('Updated Nickname');
            expect(updatedInstance.location).toBe('New Location');
            expect(updatedInstance.notes).toBe('Updated notes');
            expect(updatedInstance.updatedAt.getTime()).toBeGreaterThan(createdInstance.updatedAt.getTime());
        });

        test('should deactivate and reactivate plant instance', async () => {
            const testUser = createTestUser();
            const createdUser = await dbManager.createTestUser(testUser);

            const plant = createTestPlant({ createdBy: createdUser.id });
            const createdPlant = await PlantQueries.create(plant);

            const instanceData = createTestPlantInstance({
                userId: createdUser.id,
                plantId: createdPlant.id,
                isActive: true,
            });

            const createdInstance = await PlantInstanceQueries.create(instanceData);

            // Deactivate
            const deactivatedInstance = await PlantInstanceQueries.deactivate(createdInstance.id);
            expect(deactivatedInstance.isActive).toBe(false);

            // Reactivate
            const reactivatedInstance = await PlantInstanceQueries.reactivate(createdInstance.id);
            expect(reactivatedInstance.isActive).toBe(true);
        });
    });

    describe('Plant Instance Care Management', () => {
        test('should log fertilizer application and calculate next due date', async () => {
            const testUser = createTestUser();
            const createdUser = await dbManager.createTestUser(testUser);

            const plant = createTestPlant({ createdBy: createdUser.id });
            const createdPlant = await PlantQueries.create(plant);

            const instanceData = createTestPlantInstance({
                userId: createdUser.id,
                plantId: createdPlant.id,
                fertilizerSchedule: '4 weeks',
                lastFertilized: null,
            });

            const createdInstance = await PlantInstanceQueries.create(instanceData);

            const fertilizerDate = new Date();
            const updatedInstance = await PlantInstanceQueries.logFertilizer(createdInstance.id, fertilizerDate);

            expect(updatedInstance.lastFertilized).toEqual(fertilizerDate);
            expect(updatedInstance.fertilizerDue).toBeDefined();

            // Should be approximately 4 weeks from fertilizer date
            const expectedDue = new Date(fertilizerDate);
            expectedDue.setDate(expectedDue.getDate() + 28);
            const timeDiff = Math.abs(updatedInstance.fertilizerDue.getTime() - expectedDue.getTime());
            expect(timeDiff).toBeLessThan(24 * 60 * 60 * 1000); // Within 24 hours
        });

        test('should log repotting with notes', async () => {
            const testUser = createTestUser();
            const createdUser = await dbManager.createTestUser(testUser);

            const plant = createTestPlant({ createdBy: createdUser.id });
            const createdPlant = await PlantQueries.create(plant);

            const instanceData = createTestPlantInstance({
                userId: createdUser.id,
                plantId: createdPlant.id,
                lastRepot: null,
                notes: 'Original notes',
            });

            const createdInstance = await PlantInstanceQueries.create(instanceData);

            const repotDate = new Date();
            const repotNotes = 'Moved to larger pot with fresh soil';
            const updatedInstance = await PlantInstanceQueries.logRepot(createdInstance.id, repotDate, repotNotes);

            expect(updatedInstance.lastRepot).toEqual(repotDate);
            expect(updatedInstance.notes).toContain('Original notes');
            expect(updatedInstance.notes).toContain(repotNotes);
            expect(updatedInstance.notes).toContain(repotDate.toDateString());
        });

        test('should get plant instances with overdue fertilizer', async () => {
            const testUser = createTestUser();
            const createdUser = await dbManager.createTestUser(testUser);

            const plant = createTestPlant({ createdBy: createdUser.id });
            const createdPlant = await PlantQueries.create(plant);

            // Create instance with overdue fertilizer
            const overdueDate = new Date();
            overdueDate.setDate(overdueDate.getDate() - 1); // 1 day overdue

            const instanceData = createTestPlantInstance({
                userId: createdUser.id,
                plantId: createdPlant.id,
                fertilizerDue: overdueDate,
                isActive: true,
            });

            await PlantInstanceQueries.create(instanceData);

            const overdueInstances = await PlantInstanceQueries.getOverdueFertilizer(createdUser.id);

            expect(overdueInstances.length).toBe(1);
            expect(overdueInstances[0].fertilizerDue.getTime()).toBeLessThanOrEqual(Date.now());
        });

        test('should get plant instances with fertilizer due soon', async () => {
            const testUser = createTestUser();
            const createdUser = await dbManager.createTestUser(testUser);

            const plant = createTestPlant({ createdBy: createdUser.id });
            const createdPlant = await PlantQueries.create(plant);

            // Create instance with fertilizer due in 3 days
            const dueSoonDate = new Date();
            dueSoonDate.setDate(dueSoonDate.getDate() + 3);

            const instanceData = createTestPlantInstance({
                userId: createdUser.id,
                plantId: createdPlant.id,
                fertilizerDue: dueSoonDate,
                isActive: true,
            });

            await PlantInstanceQueries.create(instanceData);

            const dueSoonInstances = await PlantInstanceQueries.getFertilizerDueSoon(createdUser.id, 7);

            expect(dueSoonInstances.length).toBe(1);
            expect(dueSoonInstances[0].fertilizerDue.getTime()).toBeGreaterThan(Date.now());
        });
    });

    describe('Plant Instance Search and Filtering', () => {
        test('should search plant instances by nickname and location', async () => {
            const testUser = createTestUser();
            const createdUser = await dbManager.createTestUser(testUser);

            const plant = createTestPlant({ createdBy: createdUser.id });
            const createdPlant = await PlantQueries.create(plant);

            const instance1 = createTestPlantInstance({
                userId: createdUser.id,
                plantId: createdPlant.id,
                nickname: 'Unique Living Room Plant',
                location: 'Living Room',
            });

            const instance2 = createTestPlantInstance({
                userId: createdUser.id,
                plantId: createdPlant.id,
                nickname: 'Unique Bedroom Plant',
                location: 'Bedroom',
            });

            await PlantInstanceQueries.create(instance1);
            await PlantInstanceQueries.create(instance2);

            // Search by nickname
            const livingRoomResults = await PlantInstanceQueries.search(createdUser.id, 'Unique Living Room');
            expect(livingRoomResults.length).toBe(1);
            expect(livingRoomResults[0].nickname).toContain('Unique Living Room');

            // Search by location
            const bedroomResults = await PlantInstanceQueries.search(createdUser.id, 'Bedroom');
            expect(bedroomResults.length).toBe(1);
            expect(bedroomResults[0].location).toBe('Bedroom');
        });

        test('should get care statistics for user', async () => {
            const testUser = createTestUser();
            const createdUser = await dbManager.createTestUser(testUser);

            const plant = createTestPlant({ createdBy: createdUser.id });
            const createdPlant = await PlantQueries.create(plant);

            // Create active instance
            const activeInstance = createTestPlantInstance({
                userId: createdUser.id,
                plantId: createdPlant.id,
                isActive: true,
            });

            // Create inactive instance
            const inactiveInstance = createTestPlantInstance({
                userId: createdUser.id,
                plantId: createdPlant.id,
                isActive: false,
            });

            await PlantInstanceQueries.create(activeInstance);
            await PlantInstanceQueries.create(inactiveInstance);

            const stats = await PlantInstanceQueries.getCareStats(createdUser.id);

            expect(stats.totalPlants).toBe(2);
            expect(stats.activePlants).toBe(1);
            expect(stats.overdueFertilizer).toBeGreaterThanOrEqual(0);
            expect(stats.dueSoon).toBeGreaterThanOrEqual(0);
        });

        test('should get unique locations for user', async () => {
            const testUser = createTestUser();
            const createdUser = await dbManager.createTestUser(testUser);

            const plant = createTestPlant({ createdBy: createdUser.id });
            const createdPlant = await PlantQueries.create(plant);

            const locations = ['Living Room', 'Bedroom', 'Kitchen', 'Living Room']; // Duplicate

            for (const location of locations) {
                const instance = createTestPlantInstance({
                    userId: createdUser.id,
                    plantId: createdPlant.id,
                    location,
                });
                await PlantInstanceQueries.create(instance);
            }

            const userLocations = await PlantInstanceQueries.getUserLocations(createdUser.id);

            expect(userLocations.length).toBe(3); // Should be unique
            expect(userLocations).toContain('Living Room');
            expect(userLocations).toContain('Bedroom');
            expect(userLocations).toContain('Kitchen');
        });
    });

    describe('Plant Taxonomy Validation', () => {
        test('should validate plant taxonomy for duplicates', async () => {
            const testUser = createTestUser();
            const createdUser = await dbManager.createTestUser(testUser);

            const timestamp = Date.now();
            const randomId = Math.floor(Math.random() * 10000);

            // Create existing plant with unique taxonomy
            const existingPlant = createTestPlantWithTaxonomy({
                family: `ValidationFamily${timestamp}${randomId}`,
                genus: `ValidationGenus${timestamp}${randomId}`,
                species: `validationspecies${timestamp}${randomId}`,
                commonName: `Validation Test Plant ${timestamp}${randomId}`,
            }, { createdBy: createdUser.id });

            await PlantQueries.create(existingPlant);

            // Validate same taxonomy
            const validation = await validatePlantTaxonomy({
                family: `ValidationFamily${timestamp}${randomId}`,
                genus: `ValidationGenus${timestamp}${randomId}`,
                species: `validationspecies${timestamp}${randomId}`,
                commonName: 'Different Common Name', // Different common name
            });

            expect(validation.isValid).toBe(false);
            expect(validation.errors).toContain('A plant with this exact taxonomy already exists');
            expect(validation.duplicates.length).toBe(1);
        });

        test('should provide suggestions for similar taxonomy', async () => {
            const testUser = createTestUser();
            const createdUser = await dbManager.createTestUser(testUser);

            // Create plants with similar names
            const similarPlant = createTestPlantWithTaxonomy({
                family: 'SuggestionFamily',
                genus: 'SuggestionGenus',
                species: 'suggestionspecies',
            }, { createdBy: createdUser.id });

            await PlantQueries.create(similarPlant);

            // Validate similar taxonomy
            const validation = await validatePlantTaxonomy({
                family: 'Sug', // Partial match
                genus: 'Sug', // Partial match
                species: 'newspecies',
                commonName: 'New Suggestion Plant',
            });

            expect(validation.suggestions.family.length).toBeGreaterThan(0);
            expect(validation.suggestions.genus.length).toBeGreaterThan(0);
        });
    });

    describe('Error Handling and Edge Cases', () => {
        test('should handle non-existent plant instance operations gracefully', async () => {
            // Test that specific error messages are thrown for non-existent instances
            try {
                await PlantInstanceQueries.update(99999, { nickname: 'Test' });
                fail('Should have thrown an error');
            } catch (error) {
                expect(error.message).toContain('Plant instance not found');
            }

            try {
                await PlantInstanceQueries.logFertilizer(99999);
                fail('Should have thrown an error');
            } catch (error) {
                expect(error.message).toContain('Plant instance not found');
            }

            try {
                await PlantInstanceQueries.deactivate(99999);
                fail('Should have thrown an error');
            } catch (error) {
                expect(error.message).toContain('Plant instance not found');
            }
        });

        test('should handle non-existent plant operations gracefully', async () => {
            // Test that specific error messages are thrown for non-existent plants
            try {
                await PlantQueries.update(99999, { commonName: 'Test' });
                fail('Should have thrown an error');
            } catch (error) {
                expect(error.message).toContain('Plant not found');
            }

            const nonExistentPlant = await PlantQueries.getById(99999);
            expect(nonExistentPlant).toBeNull();
        });

        test('should handle empty search queries', async () => {
            const results = await PlantQueries.search('');
            expect(Array.isArray(results)).toBe(true);
        });

        test('should handle invalid fertilizer schedule formats', async () => {
            const testUser = createTestUser();
            const createdUser = await dbManager.createTestUser(testUser);

            const plant = createTestPlant({ createdBy: createdUser.id });
            const createdPlant = await PlantQueries.create(plant);

            const instanceData = createTestPlantInstance({
                userId: createdUser.id,
                plantId: createdPlant.id,
                fertilizerSchedule: 'invalid schedule format',
            });

            const createdInstance = await PlantInstanceQueries.create(instanceData);

            // Should not crash, but may not calculate next due date
            const updatedInstance = await PlantInstanceQueries.logFertilizer(createdInstance.id);
            expect(updatedInstance.lastFertilized).toBeDefined();
            // fertilizerDue may be null due to invalid schedule format
        });
    });

    describe('Database Connection and Performance', () => {
        test('should verify database connection is working', async () => {
            const isConnected = await dbManager.isConnected();
            expect(isConnected).toBe(true);
        });

        test('should handle concurrent plant creation', async () => {
            const testUser = createTestUser();
            const createdUser = await dbManager.createTestUser(testUser);

            const plantPromises = Array.from({ length: 5 }, (_, index) => {
                const plantData = createTestPlant({
                    commonName: `Concurrent Plant ${index}`,
                    family: `ConcurrentFamily${index}`,
                    genus: `ConcurrentGenus${index}`,
                    species: `concurrentspecies${index}`,
                    createdBy: createdUser.id,
                });
                return PlantQueries.create(plantData);
            });

            const plants = await Promise.all(plantPromises);
            expect(plants.length).toBe(5);
            expect(plants.every(p => p.id)).toBe(true);
        });

        test('should handle large search result sets efficiently', async () => {
            const testUser = createTestUser();
            const createdUser = await dbManager.createTestUser(testUser);

            // Create many plants with similar names
            const plantPromises = Array.from({ length: 10 }, (_, index) => {
                const plantData = createTestPlant({
                    commonName: `Performance Test Plant ${index}`,
                    family: `PerformanceFamily${index}`,
                    genus: `PerformanceGenus${index}`,
                    species: `performancespecies${index}`,
                    createdBy: createdUser.id,
                });
                return PlantQueries.create(plantData);
            });

            await Promise.all(plantPromises);

            const startTime = Date.now();
            const results = await PlantQueries.search('Performance Test');
            const searchTime = Date.now() - startTime;

            expect(results.length).toBeGreaterThan(0);
            expect(searchTime).toBeLessThan(1000); // Should complete within 1 second
        });
    });
});