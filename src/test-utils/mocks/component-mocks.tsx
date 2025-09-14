import React from 'react';

/**
 * Component mock system for testing
 * Provides lightweight, consistent mocks that don't cause import issues
 */

// Types for mock components
export interface MockComponentProps {
  children?: React.ReactNode;
  [key: string]: any;
}

export interface MockComponentOptions {
  defaultProps?: Record<string, any>;
  renderContent?: (props: any, children?: React.ReactNode) => React.ReactNode;
  trackCalls?: boolean;
}

export interface MockComponentCall {
  props: Record<string, any>;
  children?: React.ReactNode;
  timestamp: Date;
}

export interface TrackingMockComponent extends React.FC<any> {
  getCalls: () => MockComponentCall[];
  getLastCall: () => MockComponentCall | undefined;
  getCallCount: () => number;
  clearCalls: () => void;
}

/**
 * Create a simple mock component that renders children and props
 */
export const createMockComponent = (
  displayName: string, 
  defaultProps: Record<string, any> = {}
): React.FC<MockComponentProps> => {
  const MockComponent: React.FC<MockComponentProps> = ({ children, ...props }) => {
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
 */
export const createTrackingMockComponent = (
  displayName: string, 
  options: MockComponentOptions = {}
): TrackingMockComponent => {
  const { defaultProps = {}, renderContent = null, trackCalls = true } = options;
  const calls: MockComponentCall[] = [];
  
  const MockComponent: any = ({ children, ...props }: MockComponentProps) => {
    const mergedProps = { ...defaultProps, ...props };
    
    // Track this call if enabled
    if (trackCalls) {
      calls.push({
        props: mergedProps,
        children,
        timestamp: new Date(),
      });
    }
    
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
  
  return MockComponent as TrackingMockComponent;
};

/**
 * Mock a component with specific behavior
 */
export const mockComponent = (
  modulePath: string, 
  componentName: string, 
  mockImplementation?: React.FC<any> | MockComponentOptions | null
) => {
  let mockImpl: React.FC<any>;
  
  if (typeof mockImplementation === 'function') {
    mockImpl = mockImplementation;
  } else if (mockImplementation && typeof mockImplementation === 'object') {
    mockImpl = createTrackingMockComponent(componentName, mockImplementation);
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
 */
export const mockComponents = (
  modulePath: string, 
  componentMocks: Record<string, React.FC<any> | MockComponentOptions>
) => {
  const mocks: Record<string, React.FC<any>> = {};
  
  for (const [componentName, mockImpl] of Object.entries(componentMocks)) {
    if (typeof mockImpl === 'function') {
      mocks[componentName] = mockImpl;
    } else {
      mocks[componentName] = createTrackingMockComponent(componentName, mockImpl);
    }
  }
  
  jest.doMock(modulePath, () => ({
    ...jest.requireActual(modulePath),
    ...mocks,
  }));
  
  return mocks;
};

// Shared component mocks
export const sharedComponentMocks = {
  LoadingSpinner: createMockComponent('LoadingSpinner', {
    'aria-label': 'Loading',
    role: 'progressbar',
  }),

  InlineLoadingSpinner: createMockComponent('InlineLoadingSpinner', {
    'aria-label': 'Loading',
    role: 'progressbar',
    className: 'inline-spinner',
  }),

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
          className: 'modal-overlay',
        },
        React.createElement(
          'div',
          { className: 'modal-content' },
          children
        )
      );
    },
  }),

  ModalWithTabs: createTrackingMockComponent('ModalWithTabs', {
    renderContent: (props, children) => {
      if (!props.isOpen) return null;
      return React.createElement(
        'div',
        {
          role: 'dialog',
          'aria-modal': 'true',
          'data-active-tab': props.activeTab,
        },
        children
      );
    },
  }),

  ConfirmationModal: createTrackingMockComponent('ConfirmationModal', {
    renderContent: (props) => {
      if (!props.isOpen) return null;
      return React.createElement(
        'div',
        { role: 'dialog', 'aria-modal': 'true' },
        React.createElement('p', null, props.message),
        React.createElement('button', { onClick: props.onConfirm }, 'Confirm'),
        React.createElement('button', { onClick: props.onCancel }, 'Cancel')
      );
    },
  }),

  ErrorDisplay: createMockComponent('ErrorDisplay', {
    role: 'alert',
    'aria-live': 'polite',
  }),

  InlineErrorDisplay: createMockComponent('InlineErrorDisplay', {
    role: 'alert',
    className: 'inline-error',
  }),

  ErrorToast: createTrackingMockComponent('ErrorToast', {
    renderContent: (props) => {
      return React.createElement(
        'div',
        {
          role: 'alert',
          'data-error-type': props.error?.type,
          className: 'error-toast',
        },
        props.error?.message || 'An error occurred',
        React.createElement('button', { onClick: props.onDismiss }, '×')
      );
    },
  }),

  AsyncButton: createTrackingMockComponent('AsyncButton', {
    renderContent: (props, children) => {
      return React.createElement(
        'button',
        {
          type: props.type || 'button',
          disabled: props.loading || props.disabled,
          'data-loading': props.loading,
          onClick: props.onClick,
          className: props.className,
        },
        props.loading ? 'Loading...' : children
      );
    },
  }),

  SubmitButton: createTrackingMockComponent('SubmitButton', {
    renderContent: (props, children) => {
      return React.createElement(
        'button',
        {
          type: 'submit',
          disabled: props.isLoading || props.disabled,
          'data-loading': props.isLoading,
        },
        props.isLoading ? 'Submitting...' : (children || 'Submit')
      );
    },
  }),

  SaveButton: createTrackingMockComponent('SaveButton', {
    renderContent: (props, children) => {
      return React.createElement(
        'button',
        {
          type: props.type || 'button',
          disabled: props.isLoading || props.disabled,
          'data-loading': props.isLoading,
          onClick: props.onClick,
        },
        props.isLoading ? 'Saving...' : (children || 'Save')
      );
    },
  }),

  DeleteButton: createTrackingMockComponent('DeleteButton', {
    renderContent: (props, children) => {
      return React.createElement(
        'button',
        {
          type: props.type || 'button',
          disabled: props.isLoading || props.disabled,
          'data-loading': props.isLoading,
          onClick: props.onClick,
          className: `${props.className || ''} delete-button`,
        },
        props.isLoading ? 'Deleting...' : (children || 'Delete')
      );
    },
  }),

  RetryButton: createTrackingMockComponent('RetryButton', {
    renderContent: (props, children) => {
      return React.createElement(
        'button',
        {
          type: props.type || 'button',
          disabled: props.isLoading || props.disabled,
          'data-loading': props.isLoading,
          onClick: props.onClick,
        },
        props.isLoading ? 'Retrying...' : (children || 'Try Again')
      );
    },
  }),

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

  OptimizedImage: createMockComponent('OptimizedImage', {
    renderContent: (props) => {
      return React.createElement('img', {
        src: props.src,
        alt: props.alt,
        width: props.width,
        height: props.height,
        'data-optimized': true,
        className: props.className,
      });
    },
  }),

  LazyImageGallery: createTrackingMockComponent('LazyImageGallery', {
    renderContent: (props) => {
      return React.createElement(
        'div',
        {
          'data-testid': 'lazy-image-gallery',
          'data-image-count': props.images?.length || 0,
        },
        props.images?.map((image: any, index: number) => 
          React.createElement('img', {
            key: index,
            src: image.src || image,
            alt: props.alt || `Image ${index + 1}`,
          })
        )
      );
    },
  }),

  DashboardStatistics: createTrackingMockComponent('DashboardStatistics', {
    renderContent: (props) => {
      return React.createElement(
        'div',
        {
          'data-testid': 'dashboard-statistics',
          'data-user-id': props.userId,
          className: props.className,
        },
        'Dashboard Statistics'
      );
    },
  }),

  PWAInstallPrompt: createTrackingMockComponent('PWAInstallPrompt', {
    renderContent: () => {
      return React.createElement(
        'div',
        { 'data-testid': 'pwa-install-prompt' },
        'Install App'
      );
    },
  }),
};

// Auth component mocks
export const authComponentMocks = {
  SignInForm: createTrackingMockComponent('SignInForm', {
    renderContent: (props) => {
      return React.createElement(
        'form',
        {
          'data-testid': 'signin-form',
          onSubmit: props.onSubmit,
        },
        React.createElement('input', {
          name: 'email',
          type: 'email',
          placeholder: 'Email',
          required: true,
        }),
        React.createElement('input', {
          name: 'password',
          type: 'password',
          placeholder: 'Password',
          required: true,
        }),
        React.createElement('button', { type: 'submit' }, 'Sign In')
      );
    },
  }),

  SignUpForm: createTrackingMockComponent('SignUpForm', {
    renderContent: (props) => {
      return React.createElement(
        'form',
        {
          'data-testid': 'signup-form',
          onSubmit: props.onSubmit,
        },
        React.createElement('input', {
          name: 'email',
          type: 'email',
          placeholder: 'Email',
          required: true,
        }),
        React.createElement('input', {
          name: 'username',
          type: 'text',
          placeholder: 'Username',
          required: true,
        }),
        React.createElement('input', {
          name: 'password',
          type: 'password',
          placeholder: 'Password',
          required: true,
        }),
        React.createElement('button', { type: 'submit' }, 'Sign Up')
      );
    },
  }),

  LogoutButton: createTrackingMockComponent('LogoutButton', {
    renderContent: (props, children) => {
      return React.createElement(
        'button',
        {
          'data-testid': 'logout-button',
          onClick: props.onClick,
          className: props.className,
        },
        children || 'Sign Out'
      );
    },
  }),

  ForgotPasswordForm: createTrackingMockComponent('ForgotPasswordForm', {
    renderContent: (props) => {
      return React.createElement(
        'form',
        {
          'data-testid': 'forgot-password-form',
          onSubmit: props.onSubmit,
        },
        React.createElement('input', {
          name: 'email',
          type: 'email',
          placeholder: 'Email',
          required: true,
        }),
        React.createElement('button', { type: 'submit' }, 'Reset Password')
      );
    },
  }),

  ResetPasswordForm: createTrackingMockComponent('ResetPasswordForm', {
    renderContent: (props) => {
      return React.createElement(
        'form',
        {
          'data-testid': 'reset-password-form',
          'data-token': props.token,
          onSubmit: props.onSubmit,
        },
        React.createElement('input', {
          name: 'password',
          type: 'password',
          placeholder: 'New Password',
          required: true,
        }),
        React.createElement('input', {
          name: 'confirmPassword',
          type: 'password',
          placeholder: 'Confirm Password',
          required: true,
        }),
        React.createElement('button', { type: 'submit' }, 'Reset Password')
      );
    },
  }),

  VerificationCodeInput: createTrackingMockComponent('VerificationCodeInput', {
    renderContent: (props) => {
      return React.createElement(
        'div',
        { 'data-testid': 'verification-code-input' },
        React.createElement('input', {
          type: 'text',
          value: props.value,
          onChange: props.onChange,
          placeholder: 'Enter verification code',
          maxLength: props.length || 6,
        })
      );
    },
  }),

  AuthGuard: createTrackingMockComponent('AuthGuard', {
    renderContent: (props, children) => {
      // Mock authenticated state
      return props.user ? children : React.createElement('div', null, 'Please sign in');
    },
  }),

  AdminGuard: createTrackingMockComponent('AdminGuard', {
    renderContent: (props, children) => {
      return props.user?.role === 'admin' 
        ? children 
        : (props.fallback || React.createElement('div', null, 'Access denied'));
    },
  }),

  CuratorOnly: createTrackingMockComponent('CuratorOnly', {
    renderContent: (props, children) => {
      return props.user?.isCurator 
        ? children 
        : (props.fallback || null);
    },
  }),

  UserProvider: createTrackingMockComponent('UserProvider', {
    renderContent: (props, children) => {
      return React.createElement('div', { 'data-user-id': props.user?.id }, children);
    },
  }),
};

// Plant component mocks
export const plantComponentMocks = {
  PlantCard: createTrackingMockComponent('PlantCard', {
    renderContent: (props) => {
      return React.createElement(
        'div',
        {
          'data-testid': 'plant-card',
          'data-plant-id': props.plant?.id,
          onClick: props.onClick,
          className: props.className,
        },
        React.createElement('h3', null, props.plant?.nickname || props.plant?.commonName),
        React.createElement('p', null, props.plant?.location),
        props.showCareStatus && React.createElement('div', { 'data-testid': 'care-status' }, 'Care Status')
      );
    },
  }),

  PlantCardSkeleton: createMockComponent('PlantCardSkeleton', {
    'data-testid': 'plant-card-skeleton',
    className: 'skeleton',
  }),

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

  PlantTaxonomySelector: createTrackingMockComponent('PlantTaxonomySelector', {
    renderContent: (props) => {
      return React.createElement(
        'div',
        {
          'data-testid': 'plant-taxonomy-selector',
          'data-selected': props.selectedPlant?.id,
        },
        React.createElement('input', {
          type: 'text',
          placeholder: props.placeholder || 'Search taxonomy...',
          onChange: props.onSearch,
        }),
        React.createElement('button', {
          onClick: () => props.onSelect?.(props.selectedPlant),
        }, 'Select')
      );
    },
  }),

  PlantsGrid: createTrackingMockComponent('PlantsGrid', {
    renderContent: (props) => {
      return React.createElement(
        'div',
        {
          'data-testid': 'plants-grid',
          'data-plant-count': props.plants?.length || 0,
          className: props.className,
        },
        props.plants?.map((plant: any, index: number) => 
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

  PlantDetailModal: createTrackingMockComponent('PlantDetailModal', {
    renderContent: (props, children) => {
      if (!props.isOpen) return null;
      return React.createElement(
        'div',
        {
          role: 'dialog',
          'data-testid': 'plant-detail-modal',
          'data-plant-id': props.plant?.id,
        },
        children
      );
    },
  }),

  PlantImageGallery: createTrackingMockComponent('PlantImageGallery', {
    renderContent: (props) => {
      return React.createElement(
        'div',
        {
          'data-testid': 'plant-image-gallery',
          'data-image-count': props.images?.length || 0,
        },
        'Plant Images'
      );
    },
  }),

  PlantSearchFilter: createTrackingMockComponent('PlantSearchFilter', {
    renderContent: (props) => {
      return React.createElement(
        'div',
        {
          'data-testid': 'plant-search-filter',
        },
        React.createElement('input', {
          type: 'text',
          placeholder: 'Search plants...',
          onChange: props.onSearch,
        })
      );
    },
  }),

  PlantTaxonomyForm: createTrackingMockComponent('PlantTaxonomyForm', {
    renderContent: (props) => {
      return React.createElement(
        'form',
        {
          'data-testid': 'plant-taxonomy-form',
          onSubmit: props.onSubmit,
        },
        React.createElement('input', { name: 'commonName', placeholder: 'Common Name' }),
        React.createElement('input', { name: 'scientificName', placeholder: 'Scientific Name' }),
        React.createElement('input', { name: 'family', placeholder: 'Family' }),
        React.createElement('button', { type: 'submit' }, 'Save')
      );
    },
  }),

  PlantLineage: createTrackingMockComponent('PlantLineage', {
    renderContent: (props) => {
      return React.createElement(
        'div',
        {
          'data-testid': 'plant-lineage',
          'data-plant-id': props.plantId,
        },
        'Plant Lineage'
      );
    },
  }),

  PlantNotes: createTrackingMockComponent('PlantNotes', {
    renderContent: (props) => {
      return React.createElement(
        'div',
        {
          'data-testid': 'plant-notes',
          'data-plant-id': props.plantId,
        },
        React.createElement('textarea', {
          value: props.notes,
          onChange: props.onChange,
          placeholder: 'Plant notes...',
        })
      );
    },
  }),
};

// Care component mocks
export const careComponentMocks = {
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

  CareHistoryTimeline: createTrackingMockComponent('CareHistoryTimeline', {
    renderContent: (props) => {
      return React.createElement(
        'div',
        {
          'data-testid': 'care-history-timeline',
          'data-record-count': props.careRecords?.length || 0,
        },
        props.careRecords?.map((record: any, index: number) => 
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

  QuickCareActions: createTrackingMockComponent('QuickCareActions', {
    renderContent: (props) => {
      return React.createElement(
        'div',
        {
          'data-testid': 'quick-care-actions',
          'data-plant-id': props.plantId,
        },
        React.createElement('button', { onClick: props.onWater }, 'Water'),
        React.createElement('button', { onClick: props.onFertilize }, 'Fertilize'),
        React.createElement('button', { onClick: props.onPrune }, 'Prune')
      );
    },
  }),

  CareDashboard: createTrackingMockComponent('CareDashboard', {
    renderContent: (props) => {
      return React.createElement(
        'div',
        {
          'data-testid': 'care-dashboard',
          'data-user-id': props.userId,
        },
        'Care Dashboard'
      );
    },
  }),

  CareStatistics: createTrackingMockComponent('CareStatistics', {
    renderContent: (props) => {
      return React.createElement(
        'div',
        {
          'data-testid': 'care-statistics',
          'data-period': props.period,
        },
        'Care Statistics'
      );
    },
  }),
};

// Navigation component mocks
export const navigationComponentMocks = {
  BottomNavigation: createTrackingMockComponent('BottomNavigation', {
    renderContent: (props) => {
      return React.createElement(
        'nav',
        {
          'data-testid': 'bottom-navigation',
          'data-active-route': props.activeRoute,
          'data-care-notifications': props.careNotificationCount,
        },
        React.createElement('a', { href: '/dashboard' }, 'Dashboard'),
        React.createElement('a', { href: '/plants' }, 'Plants'),
        React.createElement('a', { href: '/care' }, 'Care'),
        React.createElement('a', { href: '/profile' }, 'Profile')
      );
    },
  }),

  AdminNavigation: createTrackingMockComponent('AdminNavigation', {
    renderContent: (props) => {
      return React.createElement(
        'nav',
        {
          'data-testid': 'admin-navigation',
          'data-pending-approvals': props.pendingApprovals,
        },
        React.createElement('a', { href: '/admin' }, 'Dashboard'),
        React.createElement('a', { href: '/admin/users' }, 'Users'),
        React.createElement('a', { href: '/admin/plants' }, 'Plants')
      );
    },
  }),
};

// Import component mocks
export const importComponentMocks = {
  CSVImportModal: createTrackingMockComponent('CSVImportModal', {
    renderContent: (props, children) => {
      if (!props.isOpen) return null;
      return React.createElement(
        'div',
        {
          role: 'dialog',
          'data-testid': 'csv-import-modal',
          'data-import-type': props.importType,
        },
        children
      );
    },
  }),

  DataImport: createTrackingMockComponent('DataImport', {
    renderContent: (props) => {
      return React.createElement(
        'div',
        {
          'data-testid': 'data-import',
          'data-supported-types': props.supportedTypes?.join(','),
        },
        'Data Import Component'
      );
    },
  }),

  CSVPreview: createTrackingMockComponent('CSVPreview', {
    renderContent: (props) => {
      return React.createElement(
        'div',
        {
          'data-testid': 'csv-preview',
          'data-row-count': props.data?.length || 0,
        },
        'CSV Preview'
      );
    },
  }),

  FileUpload: createTrackingMockComponent('FileUpload', {
    renderContent: (props) => {
      return React.createElement(
        'div',
        {
          'data-testid': 'file-upload',
          'data-accept': props.accept,
        },
        React.createElement('input', {
          type: 'file',
          accept: props.accept,
          onChange: props.onUpload,
        })
      );
    },
  }),

  ImportProgress: createTrackingMockComponent('ImportProgress', {
    renderContent: (props) => {
      return React.createElement(
        'div',
        {
          'data-testid': 'import-progress',
          'data-progress': props.progress,
          'data-status': props.status,
        },
        `Progress: ${props.progress || 0}%`
      );
    },
  }),

  ImportHistory: createTrackingMockComponent('ImportHistory', {
    renderContent: (props) => {
      return React.createElement(
        'div',
        {
          'data-testid': 'import-history',
          'data-import-count': props.imports?.length || 0,
        },
        'Import History'
      );
    },
  }),

  ImportTypeSelector: createTrackingMockComponent('ImportTypeSelector', {
    renderContent: (props) => {
      return React.createElement(
        'select',
        {
          'data-testid': 'import-type-selector',
          value: props.selectedType,
          onChange: props.onChange,
        },
        props.types?.map((type: string) => 
          React.createElement('option', { key: type, value: type }, type)
        )
      );
    },
  }),
};

// Propagation component mocks
export const propagationComponentMocks = {
  PropagationCard: createTrackingMockComponent('PropagationCard', {
    renderContent: (props) => {
      return React.createElement(
        'div',
        {
          'data-testid': 'propagation-card',
          'data-propagation-id': props.propagation?.id,
          'data-status': props.propagation?.status,
        },
        React.createElement('h3', null, props.propagation?.name),
        React.createElement('p', null, `Status: ${props.propagation?.status}`)
      );
    },
  }),

  PropagationForm: createTrackingMockComponent('PropagationForm', {
    renderContent: (props) => {
      return React.createElement(
        'form',
        {
          'data-testid': 'propagation-form',
          onSubmit: props.onSubmit,
        },
        React.createElement('input', { name: 'name', placeholder: 'Propagation name' }),
        React.createElement('select', { name: 'method' }),
        React.createElement('button', { type: 'submit' }, 'Create Propagation')
      );
    },
  }),

  PropagationDashboard: createTrackingMockComponent('PropagationDashboard', {
    renderContent: (props) => {
      return React.createElement(
        'div',
        {
          'data-testid': 'propagation-dashboard',
          'data-user-id': props.userId,
        },
        'Propagation Dashboard'
      );
    },
  }),
};

// Admin component mocks
export const adminComponentMocks = {
  PlantApprovalQueue: createTrackingMockComponent('PlantApprovalQueue', {
    renderContent: (props) => {
      return React.createElement(
        'div',
        {
          'data-testid': 'plant-approval-queue',
          'data-pending-count': props.pendingPlants?.length || 0,
        },
        'Plant Approval Queue'
      );
    },
  }),

  AdminDashboardClient: createTrackingMockComponent('AdminDashboardClient', {
    renderContent: (props) => {
      return React.createElement(
        'div',
        {
          'data-testid': 'admin-dashboard-client',
          'data-stats': JSON.stringify(props.initialStats),
        },
        'Admin Dashboard'
      );
    },
  }),

  UserManagementClient: createTrackingMockComponent('UserManagementClient', {
    renderContent: (props) => {
      return React.createElement(
        'div',
        {
          'data-testid': 'user-management-client',
          'data-user-count': props.initialData?.users?.length || 0,
        },
        'User Management'
      );
    },
  }),

  PlantManagementTable: createTrackingMockComponent('PlantManagementTable', {
    renderContent: (props) => {
      return React.createElement(
        'div',
        {
          'data-testid': 'plant-management-table',
          'data-plant-count': props.initialPlants?.length || 0,
        },
        'Plant Management Table'
      );
    },
  }),

  BulkOperationsToolbar: createTrackingMockComponent('BulkOperationsToolbar', {
    renderContent: (props) => {
      return React.createElement(
        'div',
        {
          'data-testid': 'bulk-operations-toolbar',
          'data-selected-count': props.selectedCount,
          'data-total-count': props.totalCount,
        },
        `${props.selectedCount} of ${props.totalCount} selected`
      );
    },
  }),

  PlantReviewCard: createTrackingMockComponent('PlantReviewCard', {
    renderContent: (props) => {
      return React.createElement(
        'div',
        {
          'data-testid': 'plant-review-card',
          'data-plant-id': props.plant?.id,
          'data-processing': props.isProcessing,
        },
        React.createElement('h3', null, props.plant?.commonName),
        React.createElement('button', { onClick: props.onApprove }, 'Approve'),
        React.createElement('button', { onClick: props.onReject }, 'Reject')
      );
    },
  }),

  PlantEditForm: createTrackingMockComponent('PlantEditForm', {
    renderContent: (props) => {
      return React.createElement(
        'form',
        {
          'data-testid': 'plant-edit-form',
          'data-plant-id': props.plant?.id,
          onSubmit: props.onSave,
        },
        React.createElement('input', { name: 'commonName', defaultValue: props.plant?.commonName }),
        React.createElement('input', { name: 'scientificName', defaultValue: props.plant?.scientificName }),
        React.createElement('button', { type: 'submit' }, 'Save')
      );
    },
  }),

  EmailVerificationMonitor: createTrackingMockComponent('EmailVerificationMonitor', {
    renderContent: () => {
      return React.createElement(
        'div',
        { 'data-testid': 'email-verification-monitor' },
        'Email Verification Monitor'
      );
    },
  }),

  OptimizedAuditLogViewer: createTrackingMockComponent('OptimizedAuditLogViewer', {
    renderContent: (props) => {
      return React.createElement(
        'div',
        {
          'data-testid': 'optimized-audit-log-viewer',
          'data-log-count': props.initialLogs?.length || 0,
        },
        'Audit Log Viewer'
      );
    },
  }),

  AdminLayout: createTrackingMockComponent('AdminLayout', {
    renderContent: (props, children) => {
      return React.createElement(
        'div',
        { 'data-testid': 'admin-layout' },
        children
      );
    },
  }),

  AdminErrorBoundary: createTrackingMockComponent('AdminErrorBoundary', {
    renderContent: (props, children) => {
      return React.createElement(
        'div',
        { 'data-testid': 'admin-error-boundary' },
        children
      );
    },
  }),

  AdminUserErrorBoundary: createTrackingMockComponent('AdminUserErrorBoundary', {
    renderContent: (props, children) => {
      return React.createElement(
        'div',
        { 'data-testid': 'admin-user-error-boundary' },
        children
      );
    },
  }),

  AdminPlantErrorBoundary: createTrackingMockComponent('AdminPlantErrorBoundary', {
    renderContent: (props, children) => {
      return React.createElement(
        'div',
        { 'data-testid': 'admin-plant-error-boundary' },
        children
      );
    },
  }),

  AdminAuditErrorBoundary: createTrackingMockComponent('AdminAuditErrorBoundary', {
    renderContent: (props, children) => {
      return React.createElement(
        'div',
        { 'data-testid': 'admin-audit-error-boundary' },
        children
      );
    },
  }),
};

// Provider component mocks
export const providerComponentMocks = {
  QueryClientProvider: createTrackingMockComponent('QueryClientProvider', {
    renderContent: (props, children) => {
      return React.createElement(
        'div',
        { 'data-testid': 'query-client-provider' },
        children
      );
    },
  }),

  AdminQueryProvider: createTrackingMockComponent('AdminQueryProvider', {
    renderContent: (props, children) => {
      return React.createElement(
        'div',
        { 'data-testid': 'admin-query-provider' },
        children
      );
    },
  }),
};

/**
 * Selective mocking utilities for specific test needs
 */
export const selectiveMocks = {
  /**
   * Mock only loading and error components
   */
  loadingAndError: () => {
    mockComponent('@/components/shared/LoadingSpinner', 'LoadingSpinner', sharedComponentMocks.LoadingSpinner);
    mockComponent('@/components/shared/LoadingSpinner', 'InlineLoadingSpinner', sharedComponentMocks.InlineLoadingSpinner);
    mockComponent('@/components/shared/ErrorDisplay', 'ErrorDisplay', sharedComponentMocks.ErrorDisplay);
    mockComponent('@/components/shared/ErrorDisplay', 'InlineErrorDisplay', sharedComponentMocks.InlineErrorDisplay);
    mockComponent('@/components/shared/ErrorDisplay', 'ErrorToast', sharedComponentMocks.ErrorToast);
  },

  /**
   * Mock only form components
   */
  forms: () => {
    mockComponent('@/components/plants/PlantInstanceForm', 'PlantInstanceForm', plantComponentMocks.PlantInstanceForm);
    mockComponent('@/components/care/QuickCareForm', 'QuickCareForm', careComponentMocks.QuickCareForm);
    mockComponent('@/components/auth/SignInForm', 'SignInForm', authComponentMocks.SignInForm);
    mockComponent('@/components/auth/SignUpForm', 'SignUpForm', authComponentMocks.SignUpForm);
    mockComponent('@/components/shared/AsyncButton', 'AsyncButton', sharedComponentMocks.AsyncButton);
    mockComponents('@/components/shared/AsyncButton', {
      SubmitButton: sharedComponentMocks.SubmitButton,
      SaveButton: sharedComponentMocks.SaveButton,
      DeleteButton: sharedComponentMocks.DeleteButton,
      RetryButton: sharedComponentMocks.RetryButton,
    });
  },

  /**
   * Mock only display components (no interactive elements)
   */
  display: () => {
    mockComponent('@/components/plants/PlantCard', 'PlantCard', plantComponentMocks.PlantCard);
    mockComponent('@/components/plants/PlantsGrid', 'PlantsGrid', plantComponentMocks.PlantsGrid);
    mockComponent('@/components/care/CareHistoryTimeline', 'CareHistoryTimeline', careComponentMocks.CareHistoryTimeline);
    mockComponent('@/components/shared/DashboardStatistics', 'DashboardStatistics', sharedComponentMocks.DashboardStatistics);
  },

  /**
   * Mock only navigation components
   */
  navigation: () => {
    mockComponent('@/components/navigation/BottomNavigation', 'BottomNavigation', navigationComponentMocks.BottomNavigation);
    mockComponent('@/components/navigation/AdminNavigation', 'AdminNavigation', navigationComponentMocks.AdminNavigation);
  },

  /**
   * Mock only authentication components
   */
  auth: () => {
    mockComponents('@/components/auth', authComponentMocks);
  },

  /**
   * Mock only admin components
   */
  admin: () => {
    mockComponents('@/components/admin', adminComponentMocks);
  },

  /**
   * Mock only import components
   */
  import: () => {
    mockComponents('@/components/import', importComponentMocks);
  },

  /**
   * Mock only plant components
   */
  plants: () => {
    mockComponents('@/components/plants', plantComponentMocks);
  },

  /**
   * Mock only care components
   */
  care: () => {
    mockComponents('@/components/care', careComponentMocks);
  },

  /**
   * Mock only propagation components
   */
  propagations: () => {
    mockComponents('@/components/propagations', propagationComponentMocks);
  },

  /**
   * Mock only shared components
   */
  shared: () => {
    mockComponents('@/components/shared', sharedComponentMocks);
  },

  /**
   * Mock only provider components
   */
  providers: () => {
    mockComponents('@/components/providers', providerComponentMocks);
  },
};

/**
 * Apply all common component mocks
 */
export const applyCommonMocks = () => {
  // Mock shared components
  mockComponents('@/components/shared', sharedComponentMocks);
  
  // Mock auth components
  mockComponents('@/components/auth', authComponentMocks);
  
  // Mock plant components
  mockComponents('@/components/plants', plantComponentMocks);
  
  // Mock care components
  mockComponents('@/components/care', careComponentMocks);
  
  // Mock navigation components
  mockComponents('@/components/navigation', navigationComponentMocks);
  
  // Mock import components
  mockComponents('@/components/import', importComponentMocks);
  
  // Mock propagation components
  mockComponents('@/components/propagations', propagationComponentMocks);
  
  // Mock provider components
  mockComponents('@/components/providers', providerComponentMocks);
};

/**
 * Apply admin-specific mocks
 */
export const applyAdminMocks = () => {
  mockComponents('@/components/admin', adminComponentMocks);
  applyCommonMocks();
};

/**
 * Reset all component mocks
 */
export const resetComponentMocks = () => {
  jest.resetModules();
  jest.clearAllMocks();
  
  // Clear tracking data from all mock components
  const allMocks = [
    ...Object.values(sharedComponentMocks),
    ...Object.values(authComponentMocks),
    ...Object.values(plantComponentMocks),
    ...Object.values(careComponentMocks),
    ...Object.values(navigationComponentMocks),
    ...Object.values(importComponentMocks),
    ...Object.values(propagationComponentMocks),
    ...Object.values(adminComponentMocks),
    ...Object.values(providerComponentMocks),
  ];
  
  allMocks.forEach(mock => {
    if (mock && typeof mock === 'function' && mock.clearCalls) {
      mock.clearCalls();
    }
  });
};

/**
 * Mock factory system for creating custom mocks on demand
 */
export class MockFactory {
  private static mocks: Map<string, React.FC<any>> = new Map();

  static create(name: string, options: MockComponentOptions = {}): React.FC<any> {
    const mock = createTrackingMockComponent(name, options);
    this.mocks.set(name, mock);
    return mock;
  }

  static get(name: string): React.FC<any> | undefined {
    return this.mocks.get(name);
  }

  static clear(): void {
    this.mocks.clear();
  }

  static createBatch(mockConfigs: Record<string, MockComponentOptions>): Record<string, React.FC<any>> {
    const result: Record<string, React.FC<any>> = {};
    
    for (const [name, options] of Object.entries(mockConfigs)) {
      result[name] = this.create(name, options);
    }
    
    return result;
  }
}

// Export all mock collections
export const allComponentMocks = {
  shared: sharedComponentMocks,
  auth: authComponentMocks,
  plants: plantComponentMocks,
  care: careComponentMocks,
  navigation: navigationComponentMocks,
  import: importComponentMocks,
  propagations: propagationComponentMocks,
  admin: adminComponentMocks,
  providers: providerComponentMocks,
};