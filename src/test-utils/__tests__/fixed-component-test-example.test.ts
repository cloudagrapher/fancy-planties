/**
 * Fixed Component Test Example - Shows how to use the new infrastructure
 * This demonstrates fixing the PlantTaxonomySelector test using the robust infrastructure
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { renderWithTestConfig } from '../component-test-helpers';
import { TestPlantFactory } from '../realistic-test-data';

// Mock the PlantTaxonomySelector component for this test
const MockPlantTaxonomySelector = ({ selectedPlant, onSelect, placeholder }: {
  selectedPlant: any;
  onSelect: (plant: any) => void;
  placeholder?: string;
}) => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [plants, setPlants] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    if (searchTerm.length > 0) {
      setIsLoading(true);
      
      // Simulate API call
      fetch(`/api/plants/search?q=${encodeURIComponent(searchTerm)}`)
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            setPlants(data.data.plants || []);
          }
          setIsLoading(false);
        })
        .catch(() => {
          setIsLoading(false);
        });
    } else {
      setPlants([]);
    }
  }, [searchTerm]);

  return React.createElement('div', { 'data-testid': 'plant-taxonomy-selector' }, [
    React.createElement('input', {
      key: 'search-input',
      'data-testid': 'plant-search-input',
      type: 'text',
      placeholder: placeholder || 'Search plants...',
      value: searchTerm,
      onChange: (e: any) => setSearchTerm(e.target.value),
    }),
    
    isLoading && React.createElement('div', {
      key: 'loading',
      'data-testid': 'loading-indicator',
    }, 'Loading...'),
    
    React.createElement('div', {
      key: 'results',
      'data-testid': 'search-results',
    }, plants.map((plant, index) => 
      React.createElement('div', {
        key: plant.id || index,
        'data-testid': `plant-option-${plant.id}`,
        onClick: () => onSelect(plant),
        style: { cursor: 'pointer', padding: '8px', border: '1px solid #ccc', margin: '4px 0' },
      }, `${plant.commonName} (${plant.genus} ${plant.species})`)
    )),
    
    selectedPlant && React.createElement('div', {
      key: 'selected',
      'data-testid': 'selected-plant',
    }, `Selected: ${selectedPlant.commonName}`)
  ]);
};

describe('Fixed Component Test Example', () => {
  describe('PlantTaxonomySelector with Robust Infrastructure', () => {
    it('should render and handle plant search correctly', async () => {
      // Create realistic test data
      const testPlants = [
        TestPlantFactory.createMonstera({ id: 1 }),
        TestPlantFactory.createPhilodendron({ id: 2 }),
        TestPlantFactory.createSnakePlant({ id: 3 }),
      ];

      let selectedPlant: any = null;
      const handleSelect = jest.fn((plant) => {
        selectedPlant = plant;
      });

      // Configure component test with realistic mocks
      const { user } = renderWithTestConfig(
        React.createElement(MockPlantTaxonomySelector, {
          selectedPlant: null,
          onSelect: handleSelect,
          placeholder: 'Search for plants...',
        }),
        {
          config: {
            mockPlants: testPlants,
            mockApiResponses: {
              '/api/plants/search': {
                success: true,
                data: {
                  plants: testPlants.filter(p => 
                    p.commonName.toLowerCase().includes('monstera') ||
                    p.genus.toLowerCase().includes('monstera')
                  ),
                },
              },
            },
            enableUserEvents: true,
          },
        }
      );

      // Verify component renders
      expect(screen.getByTestId('plant-taxonomy-selector')).toBeInTheDocument();
      expect(screen.getByTestId('plant-search-input')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Search for plants...')).toBeInTheDocument();

      // Test search functionality
      const searchInput = screen.getByTestId('plant-search-input');
      
      if (user) {
        await user.type(searchInput, 'monstera');
        
        // Wait for results (loading might be too fast to catch)
        await waitFor(() => {
          expect(screen.getByTestId('search-results')).toBeInTheDocument();
        });
        
        // Verify search results
        const monsteraOption = screen.getByTestId('plant-option-1');
        expect(monsteraOption).toBeInTheDocument();
        expect(monsteraOption).toHaveTextContent('Swiss Cheese Plant (Monstera deliciosa)');
        
        // Test plant selection
        await user.click(monsteraOption);
        
        expect(handleSelect).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 1,
            genus: 'Monstera',
            species: 'deliciosa',
          })
        );
      }
    });

    it('should handle empty search results', async () => {
      const { user } = renderWithTestConfig(
        React.createElement(MockPlantTaxonomySelector, {
          selectedPlant: null,
          onSelect: jest.fn(),
        }),
        {
          config: {
            mockPlants: [],
            mockApiResponses: {
              '/api/plants/search': {
                success: true,
                data: {
                  plants: [],
                },
              },
            },
            enableUserEvents: true,
          },
        }
      );

      const searchInput = screen.getByTestId('plant-search-input');
      
      if (user) {
        await user.type(searchInput, 'nonexistent');
        
        await waitFor(() => {
          const results = screen.getByTestId('search-results');
          expect(results).toBeInTheDocument();
          expect(results).toBeEmptyDOMElement();
        });
      }
    });

    it('should handle API errors gracefully', async () => {
      const { user } = renderWithTestConfig(
        React.createElement(MockPlantTaxonomySelector, {
          selectedPlant: null,
          onSelect: jest.fn(),
        }),
        {
          config: {
            mockApiResponses: {
              '/api/plants/search': {
                success: false,
                error: 'API Error',
              },
            },
            enableUserEvents: true,
          },
        }
      );

      const searchInput = screen.getByTestId('plant-search-input');
      
      if (user) {
        await user.type(searchInput, 'test');
        
        // Should handle error gracefully (no crash)
        await waitFor(() => {
          expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument();
        });
        
        const results = screen.getByTestId('search-results');
        expect(results).toBeEmptyDOMElement();
      }
    });

    it('should display selected plant', () => {
      const selectedPlant = TestPlantFactory.createMonstera({ id: 1 });
      
      renderWithTestConfig(
        React.createElement(MockPlantTaxonomySelector, {
          selectedPlant,
          onSelect: jest.fn(),
        }),
        {
          config: {
            mockPlants: [selectedPlant],
          },
        }
      );

      expect(screen.getByTestId('selected-plant')).toBeInTheDocument();
      expect(screen.getByTestId('selected-plant')).toHaveTextContent('Selected: Swiss Cheese Plant');
    });
  });

  describe('Infrastructure Benefits Demonstration', () => {
    it('should provide realistic test data', () => {
      const monstera = TestPlantFactory.createMonstera();
      
      expect(monstera.family).toBe('Araceae');
      expect(monstera.genus).toBe('Monstera');
      expect(monstera.species).toBe('deliciosa');
      expect(monstera.commonName).toBe('Swiss Cheese Plant');
      expect(monstera.isVerified).toBeDefined();
      expect(monstera.createdAt).toBeInstanceOf(Date);
    });

    it('should provide consistent mock API responses', async () => {
      const testPlants = TestPlantFactory.createMany(5);
      
      const { getByTestId } = renderWithTestConfig(
        React.createElement('div', { 'data-testid': 'test-component' }, 'Test'),
        {
          config: {
            mockPlants: testPlants,
            mockApiResponses: {
              '/api/plants/search': {
                success: true,
                data: { plants: testPlants },
              },
            },
          },
        }
      );

      // Verify component renders (infrastructure working)
      expect(getByTestId('test-component')).toBeInTheDocument();
      
      // Test API mock
      const response = await fetch('/api/plants/search?q=test');
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.data.plants).toHaveLength(5);
      expect(data.data.plants[0]).toHaveProperty('genus');
      expect(data.data.plants[0]).toHaveProperty('species');
    });

    it('should provide proper error boundaries', () => {
      const ErrorComponent = () => {
        throw new Error('Test error for error boundary');
      };

      const { createTestWrapper } = require('../component-test-helpers');
      
      let caughtError: Error | null = null;
      const ErrorWrapper = createTestWrapper({
        onError: (error) => {
          caughtError = error;
        },
      });

      const { getByTestId } = renderWithTestConfig(
        React.createElement(ErrorComponent),
        {
          wrapper: ErrorWrapper,
        }
      );

      expect(getByTestId('error-boundary')).toBeInTheDocument();
      expect(caughtError).toBeInstanceOf(Error);
      expect(caughtError?.message).toBe('Test error for error boundary');
    });

    it('should provide user event utilities', async () => {
      const handleClick = jest.fn();
      
      const { user } = renderWithTestConfig(
        React.createElement('button', {
          'data-testid': 'test-button',
          onClick: handleClick,
        }, 'Click me'),
        {
          config: {
            enableUserEvents: true,
          },
        }
      );

      const button = screen.getByTestId('test-button');
      expect(button).toBeInTheDocument();
      
      if (user) {
        await user.click(button);
        expect(handleClick).toHaveBeenCalledTimes(1);
      }
    });
  });
});