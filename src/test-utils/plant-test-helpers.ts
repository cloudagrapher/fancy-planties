/**
 * Test helpers specifically for plant-related components
 */

import { createMockFetch, mockPlantData } from './mock-factories';

/**
 * Setup mocks specifically for PlantTaxonomySelector component
 */
export function setupPlantTaxonomySelectorMocks() {
  const mockFetch = createMockFetch([
    {
      url: '/api/plants/suggestions?type=quick',
      response: {
        ok: true,
        status: 200,
        data: {
          success: true,
          data: {
            quickSelect: mockPlantData.quickSelect,
          },
        },
      },
    },
    {
      url: '/api/plants/search',
      response: {
        ok: true,
        status: 200,
        data: {
          success: true,
          data: {
            plants: mockPlantData.plants,
            total: mockPlantData.plants.length,
          },
        },
      },
    },
  ]);
  
  global.fetch = mockFetch;
  
  return {
    mockFetch,
    mockData: mockPlantData,
  };
}

/**
 * Mock data for plant search results
 */
export const mockPlantSearchResults = {
  success: true,
  data: {
    plants: [
      {
        id: 1,
        family: 'Araceae',
        genus: 'Monstera',
        species: 'deliciosa',
        commonName: 'Monstera Deliciosa',
        scientificName: 'Monstera deliciosa',
        isVerified: true,
        matchedFields: ['commonName'],
      },
      {
        id: 2,
        family: 'Araceae',
        genus: 'Philodendron',
        species: 'hederaceum',
        commonName: 'Heart Leaf Philodendron',
        scientificName: 'Philodendron hederaceum',
        isVerified: false,
        matchedFields: ['genus'],
      },
      {
        id: 3,
        family: 'Moraceae',
        genus: 'Ficus',
        species: 'lyrata',
        commonName: 'Fiddle Leaf Fig',
        scientificName: 'Ficus lyrata',
        isVerified: true,
        matchedFields: ['species'],
      },
    ],
    total: 3,
  },
};

/**
 * Mock data for quick select suggestions
 */
export const mockQuickSelectData = {
  success: true,
  data: {
    quickSelect: {
      recent: [
        {
          id: 1,
          family: 'Araceae',
          genus: 'Monstera',
          species: 'deliciosa',
          commonName: 'Monstera Deliciosa',
          scientificName: 'Monstera deliciosa',
          isVerified: true,
        },
      ],
      popular: [
        {
          id: 2,
          family: 'Araceae',
          genus: 'Philodendron',
          species: 'hederaceum',
          commonName: 'Heart Leaf Philodendron',
          scientificName: 'Philodendron hederaceum',
          isVerified: false,
        },
      ],
    },
  },
};

/**
 * Setup fetch mock with specific responses for plant taxonomy selector
 */
export function mockPlantTaxonomyFetch() {
  const mockFetch = jest.fn((url: string) => {
    if (url.includes('/api/plants/suggestions?type=quick')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockQuickSelectData),
      });
    }
    
    if (url.includes('/api/plants/search')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockPlantSearchResults),
      });
    }
    
    // Default response
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ success: true, data: {} }),
    });
  });
  
  global.fetch = mockFetch;
  return mockFetch;
}

/**
 * Wait for component to finish loading and render search results
 */
export async function waitForPlantSearchResults() {
  // Wait for debounced search and API call
  await new Promise(resolve => setTimeout(resolve, 100));
}

/**
 * Mock lodash debounce for immediate execution in tests
 */
export function mockLodashDebounce() {
  jest.mock('lodash-es', () => ({
    debounce: (fn: any) => fn,
  }));
}

/**
 * Setup all mocks needed for plant component tests
 */
export function setupPlantComponentMocks() {
  // Mock lodash debounce
  mockLodashDebounce();
  
  // Setup fetch mocks
  const mockFetch = mockPlantTaxonomyFetch();
  
  return {
    mockFetch,
    mockData: {
      searchResults: mockPlantSearchResults,
      quickSelect: mockQuickSelectData,
    },
  };
}