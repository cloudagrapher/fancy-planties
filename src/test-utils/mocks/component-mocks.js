// Component mocking utilities

import React from 'react';

/**
 * Create a simple mock component that renders children and props
 * @param {string} displayName - Component display name for debugging
 * @param {Object} defaultProps - Default props to merge
 * @returns {Function} Mock component function
 */
export const createMockComponent = (displayName, defaultProps = {}) => {
  const MockComponent = ({ children, ...props }) => {
    const mergedProps = { ...defaultProps, ...props };
    
    return React.createElement(
      'div',
      {
        'data-testid': `mock-${displayName.toLowerCase()}`,
        'data-component': displayName,
        ...mergedProps,
      },
      children
    );
  };
  
  MockComponent.displayName = `Mock${displayName}`;
  return MockComponent;
};

/**
 * Create a mock component that tracks its calls and props
 * @param {string} displayName - Component display name
 * @param {Object} options - Mock options
 * @returns {Function} Mock component with call tracking
 */
export const createTrackingMockComponent = (displayName, options = {}) => {
  const { defaultProps = {}, renderContent = null } = options;
  
  const calls = [];
  
  const MockComponent = ({ children, ...props }) => {
    const mergedProps = { ...defaultProps, ...props };
    
    // Track this call
    calls.push({
      props: mergedProps,
      children,
      timestamp: new Date(),
    });
    
    // Custom render content or default
    const content = renderContent 
      ? renderContent(mergedProps, children)
      : children;
    
    return React.createElement(
      'div',
      {
        'data-testid': `mock-${displayName.toLowerCase()}`,
        'data-component': displayName,
        'data-call-count': calls.length,
      },
      content
    );
  };
  
  MockComponent.displayName = `Mock${displayName}`;
  MockComponent.getCalls = () => calls;
  MockComponent.getLastCall = () => calls[calls.length - 1];
  MockComponent.getCallCount = () => calls.length;
  MockComponent.clearCalls = () => calls.length = 0;
  
  return MockComponent;
};

/**
 * Mock a component with specific behavior
 * @param {string} modulePath - Path to the module containing the component
 * @param {string} componentName - Name of the component to mock
 * @param {Function|Object} mockImplementation - Mock implementation or options
 */
export const mockComponent = (modulePath, componentName, mockImplementation = null) => {
  let mockImpl;
  
  if (typeof mockImplementation === 'function') {
    mockImpl = mockImplementation;
  } else if (mockImplementation && typeof mockImplementation === 'object') {
    mockImpl = createMockComponent(componentName, mockImplementation);
  } else {
    mockImpl = createMockComponent(componentName);
  }
  
  jest.doMock(modulePath, () => ({
    ...jest.requireActual(modulePath),
    [componentName]: mockImpl,
    default: mockImpl,
  }));
  
  return mockImpl;
};

/**
 * Mock multiple components from a module
 * @param {string} modulePath - Path to the module
 * @param {Object} componentMocks - Object mapping component names to mock implementations
 */
export const mockComponents = (modulePath, componentMocks) => {
  const mocks = {};
  
  for (const [componentName, mockImpl] of Object.entries(componentMocks)) {
    if (typeof mockImpl === 'function') {
      mocks[componentName] = mockImpl;
    } else {
      mocks[componentName] = createMockComponent(componentName, mockImpl);
    }
  }
  
  jest.doMock(modulePath, () => ({
    ...jest.requireActual(modulePath),
    ...mocks,
  }));
  
  return mocks;
};

/**
 * Common component mocks for the plant tracker app
 */
export const commonComponentMocks = {
  /**
   * Mock LoadingSpinner component
   */
  LoadingSpinner: createMockComponent('LoadingSpinner', {
    'aria-label': 'Loading',
    role: 'progressbar',
  }),

  /**
   * Mock Modal component
   */
  Modal: createTrackingMockComponent('Modal', {
    defaultProps: { isOpen: false },
    renderContent: (props, children) => {
      if (!props.isOpen) return null;
      return React.createElement(
        'div',
        {
          role: 'dialog',
          'aria-modal': 'true',
          'data-modal-title': props.title,
        },
        children
      );
    },
  }),

  /**
   * Mock ErrorDisplay component
   */
  ErrorDisplay: createMockComponent('ErrorDisplay', {
    role: 'alert',
    'aria-live': 'polite',
  }),

  /**
   * Mock AsyncButton component
   */
  AsyncButton: createTrackingMockComponent('AsyncButton', {
    renderContent: (props, children) => {
      return React.createElement(
        'button',
        {
          type: props.type || 'button',
          disabled: props.loading || props.disabled,
          'data-loading': props.loading,
          onClick: props.onClick,
        },
        props.loading ? 'Loading...' : children
      );
    },
  }),

  /**
   * Mock ImageUpload component
   */
  ImageUpload: createTrackingMockComponent('ImageUpload', {
    renderContent: (props) => {
      return React.createElement(
        'div',
        {
          'data-testid': 'image-upload',
          'data-accept': props.accept,
          'data-multiple': props.multiple,
        },
        React.createElement(
          'input',
          {
            type: 'file',
            accept: props.accept,
            multiple: props.multiple,
            onChange: props.onUpload,
          }
        ),
        'Upload Images'
      );
    },
  }),

  /**
   * Mock OptimizedImage component
   */
  OptimizedImage: createMockComponent('OptimizedImage', {
    renderContent: (props) => {
      return React.createElement('img', {
        src: props.src,
        alt: props.alt,
        width: props.width,
        height: props.height,
        'data-optimized': true,
      });
    },
  }),
};

/**
 * Plant-specific component mocks
 */
export const plantComponentMocks = {
  /**
   * Mock PlantCard component
   */
  PlantCard: createTrackingMockComponent('PlantCard', {
    renderContent: (props) => {
      return React.createElement(
        'div',
        {
          'data-testid': 'plant-card',
          'data-plant-id': props.plant?.id,
          onClick: props.onClick,
        },
        React.createElement('h3', null, props.plant?.nickname || props.plant?.commonName),
        React.createElement('p', null, props.plant?.location),
        props.showCareStatus && React.createElement('div', { 'data-testid': 'care-status' }, 'Care Status')
      );
    },
  }),

  /**
   * Mock PlantInstanceForm component
   */
  PlantInstanceForm: createTrackingMockComponent('PlantInstanceForm', {
    renderContent: (props) => {
      return React.createElement(
        'form',
        {
          'data-testid': 'plant-instance-form',
          onSubmit: props.onSubmit,
        },
        React.createElement('input', {
          name: 'nickname',
          placeholder: 'Plant nickname',
          defaultValue: props.initialData?.nickname,
        }),
        React.createElement('input', {
          name: 'location',
          placeholder: 'Location',
          defaultValue: props.initialData?.location,
        }),
        React.createElement('button', { type: 'submit' }, 'Save Plant')
      );
    },
  }),

  /**
   * Mock PlantSelector component
   */
  PlantSelector: createTrackingMockComponent('PlantSelector', {
    renderContent: (props) => {
      return React.createElement(
        'div',
        {
          'data-testid': 'plant-selector',
          'data-selected': props.selectedPlant?.id,
        },
        React.createElement('input', {
          type: 'text',
          placeholder: 'Search plants...',
          onChange: props.onSearch,
        }),
        React.createElement('button', {
          onClick: () => props.onSelect?.(props.selectedPlant),
        }, 'Select Plant')
      );
    },
  }),

  /**
   * Mock PlantsGrid component
   */
  PlantsGrid: createTrackingMockComponent('PlantsGrid', {
    renderContent: (props) => {
      return React.createElement(
        'div',
        {
          'data-testid': 'plants-grid',
          'data-plant-count': props.plants?.length || 0,
        },
        props.plants?.map((plant, index) => 
          React.createElement(
            'div',
            {
              key: plant.id || index,
              'data-testid': 'grid-plant-item',
              'data-plant-id': plant.id,
            },
            plant.nickname || plant.commonName
          )
        )
      );
    },
  }),
};

/**
 * Care-related component mocks
 */
export const careComponentMocks = {
  /**
   * Mock CareTaskCard component
   */
  CareTaskCard: createTrackingMockComponent('CareTaskCard', {
    renderContent: (props) => {
      return React.createElement(
        'div',
        {
          'data-testid': 'care-task-card',
          'data-task-type': props.task?.type,
          'data-overdue': props.task?.isOverdue,
        },
        React.createElement('h4', null, props.task?.title),
        React.createElement('p', null, props.task?.description),
        React.createElement('button', {
          onClick: props.onComplete,
        }, 'Mark Complete')
      );
    },
  }),

  /**
   * Mock QuickCareForm component
   */
  QuickCareForm: createTrackingMockComponent('QuickCareForm', {
    renderContent: (props) => {
      return React.createElement(
        'form',
        {
          'data-testid': 'quick-care-form',
          onSubmit: props.onSubmit,
        },
        React.createElement('select', {
          name: 'careType',
          defaultValue: props.defaultCareType,
        }),
        React.createElement('textarea', {
          name: 'notes',
          placeholder: 'Care notes...',
        }),
        React.createElement('button', { type: 'submit' }, 'Log Care')
      );
    },
  }),

  /**
   * Mock CareHistoryTimeline component
   */
  CareHistoryTimeline: createTrackingMockComponent('CareHistoryTimeline', {
    renderContent: (props) => {
      return React.createElement(
        'div',
        {
          'data-testid': 'care-history-timeline',
          'data-record-count': props.careRecords?.length || 0,
        },
        props.careRecords?.map((record, index) => 
          React.createElement(
            'div',
            {
              key: record.id || index,
              'data-testid': 'timeline-item',
              'data-care-type': record.careType,
            },
            `${record.careType} - ${record.careDate}`
          )
        )
      );
    },
  }),
};

/**
 * Navigation component mocks
 */
export const navigationComponentMocks = {
  /**
   * Mock BottomNavigation component
   */
  BottomNavigation: createTrackingMockComponent('BottomNavigation', {
    renderContent: (props) => {
      return React.createElement(
        'nav',
        {
          'data-testid': 'bottom-navigation',
          'data-active-route': props.activeRoute,
        },
        React.createElement('a', { href: '/dashboard' }, 'Dashboard'),
        React.createElement('a', { href: '/plants' }, 'Plants'),
        React.createElement('a', { href: '/care' }, 'Care'),
        React.createElement('a', { href: '/profile' }, 'Profile')
      );
    },
  }),
};

/**
 * Apply all common component mocks
 */
export const applyCommonMocks = () => {
  // Mock shared components
  mockComponents('@/components/shared', commonComponentMocks);
  
  // Mock plant components
  mockComponents('@/components/plants', plantComponentMocks);
  
  // Mock care components
  mockComponents('@/components/care', careComponentMocks);
  
  // Mock navigation components
  mockComponents('@/components/navigation', navigationComponentMocks);
};

/**
 * Selective component mocking for specific test needs
 */
export const selectiveMocks = {
  /**
   * Mock only loading and error components
   */
  loadingAndError: () => {
    mockComponent('@/components/shared/LoadingSpinner', 'LoadingSpinner', commonComponentMocks.LoadingSpinner);
    mockComponent('@/components/shared/ErrorDisplay', 'ErrorDisplay', commonComponentMocks.ErrorDisplay);
  },

  /**
   * Mock only form components
   */
  forms: () => {
    mockComponent('@/components/plants/PlantInstanceForm', 'PlantInstanceForm', plantComponentMocks.PlantInstanceForm);
    mockComponent('@/components/care/QuickCareForm', 'QuickCareForm', careComponentMocks.QuickCareForm);
    mockComponent('@/components/shared/AsyncButton', 'AsyncButton', commonComponentMocks.AsyncButton);
  },

  /**
   * Mock only display components (no interactive elements)
   */
  display: () => {
    mockComponent('@/components/plants/PlantCard', 'PlantCard', plantComponentMocks.PlantCard);
    mockComponent('@/components/plants/PlantsGrid', 'PlantsGrid', plantComponentMocks.PlantsGrid);
    mockComponent('@/components/care/CareHistoryTimeline', 'CareHistoryTimeline', careComponentMocks.CareHistoryTimeline);
  },

  /**
   * Mock only navigation components
   */
  navigation: () => {
    mockComponent('@/components/navigation/BottomNavigation', 'BottomNavigation', navigationComponentMocks.BottomNavigation);
  },
};

/**
 * Reset all component mocks
 */
export const resetComponentMocks = () => {
  jest.resetModules();
  jest.clearAllMocks();
  
  // Clear tracking data from mock components
  Object.values(commonComponentMocks).forEach(mock => {
    if (mock.clearCalls) mock.clearCalls();
  });
  
  Object.values(plantComponentMocks).forEach(mock => {
    if (mock.clearCalls) mock.clearCalls();
  });
  
  Object.values(careComponentMocks).forEach(mock => {
    if (mock.clearCalls) mock.clearCalls();
  });
  
  Object.values(navigationComponentMocks).forEach(mock => {
    if (mock.clearCalls) mock.clearCalls();
  });
};