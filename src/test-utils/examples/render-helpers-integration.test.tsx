// Integration test demonstrating enhanced render helpers with real components

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import {
  renderWithProviders,
  renderWithAuthenticatedUser,
  renderWithCuratorUser,
  mockApiResponses,
  userInteractions,
  testUtils,
  resetTestState,
} from '../helpers/render-helpers';

// Mock a simple form component for testing
const MockSignInForm: React.FC = () => {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error('Sign in failed');
      }

      // Simulate successful sign in
      console.log('Sign in successful');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h1>Sign In</h1>
      
      <label htmlFor="email">Email</label>
      <input
        id="email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      
      <label htmlFor="password">Password</label>
      <input
        id="password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      
      <button type="submit" disabled={loading}>
        {loading ? 'Signing in...' : 'Sign In'}
      </button>
      
      {error && <div role="alert">{error}</div>}
    </form>
  );
};

// Mock a component that uses authentication context
const MockUserProfile: React.FC = () => {
  return (
    <div>
      <h1>User Profile</h1>
      <p>Welcome to your profile page</p>
      <button>Edit Profile</button>
    </div>
  );
};

// Mock an admin component
const MockAdminPanel: React.FC = () => {
  return (
    <div>
      <h1>Admin Panel</h1>
      <p>Admin controls and settings</p>
      <button>Manage Users</button>
      <button>View Audit Logs</button>
    </div>
  );
};

describe('Render Helpers Integration Tests', () => {
  beforeEach(() => {
    resetTestState();
  });

  describe('Form Testing with API Mocking', () => {
    it('should handle successful sign in flow', async () => {
      // Mock successful API response
      mockApiResponses({
        '/api/auth/signin': {
          user: { id: 1, email: 'test@example.com', name: 'Test User' },
          session: { id: 'session-123' }
        }
      });

      const result = renderWithProviders(<MockSignInForm />);

      // Fill and submit form using enhanced utilities
      await userInteractions.signIn(
        { email: 'test@example.com', password: 'password123' },
        result.user
      );

      // Verify API call was made
      testUtils.expectApiCall('/api/auth/signin', {
        method: 'POST',
        body: { email: 'test@example.com', password: 'password123' }
      });

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByText('Signing in...')).not.toBeInTheDocument();
      });
    });

    it('should handle sign in error', async () => {
      // Mock error response
      mockApiResponses({
        '/api/auth/signin': {
          ok: false,
          status: 401,
          data: { error: 'Invalid credentials' }
        }
      });

      const result = renderWithProviders(<MockSignInForm />);

      await userInteractions.signIn(
        { email: 'wrong@example.com', password: 'wrongpassword' },
        result.user
      );

      // Wait for error to appear
      await waitFor(() => {
        testUtils.expectErrorMessage('Sign in failed');
      });
    });
  });

  describe('Authentication Context Testing', () => {
    it('should render component with authenticated user', () => {
      const result = renderWithAuthenticatedUser(<MockUserProfile />, {
        userOverrides: { 
          name: 'John Doe', 
          email: 'john@example.com' 
        }
      });

      expect(screen.getByText('User Profile')).toBeInTheDocument();
      expect(screen.getByText('Welcome to your profile page')).toBeInTheDocument();
      expect(result.testUser.name).toBe('John Doe');
      expect(result.testUser.email).toBe('john@example.com');
    });

    it('should render component with curator privileges', () => {
      const result = renderWithCuratorUser(<MockAdminPanel />);

      expect(screen.getByText('Admin Panel')).toBeInTheDocument();
      expect(screen.getByText('Admin controls and settings')).toBeInTheDocument();
      expect(result.testUser.isCurator).toBe(true);
      
      // Verify admin-specific elements
      expect(screen.getByRole('button', { name: 'Manage Users' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'View Audit Logs' })).toBeInTheDocument();
    });
  });

  describe('Navigation Testing', () => {
    it('should handle route-specific rendering', () => {
      const MockDashboard: React.FC = () => (
        <div>
          <h1>Dashboard</h1>
          <p>Current path: /dashboard</p>
        </div>
      );

      const result = renderWithProviders(<MockDashboard />, {
        route: '/dashboard'
      });

      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(result.router.pathname).toBe('/dashboard');
    });

    it('should handle navigation interactions', async () => {
      const MockNavigation: React.FC = () => {
        const handleNavigate = () => {
          // In real component, this would use Next.js router
          console.log('Navigating to profile');
        };

        return (
          <nav>
            <button onClick={handleNavigate}>Go to Profile</button>
          </nav>
        );
      };

      const result = renderWithProviders(<MockNavigation />);

      // Simulate navigation
      userInteractions.navigate('/profile');

      // Verify navigation state
      expect(result.router.pathname).toBe('/profile');
      testUtils.expectNavigation('/profile', 'push');
    });
  });

  describe('Complex User Interactions', () => {
    it('should handle multi-step form interactions', async () => {
      const MockMultiStepForm: React.FC = () => {
        const [step, setStep] = React.useState(1);
        const [formData, setFormData] = React.useState({
          name: '',
          email: '',
          preferences: ''
        });

        return (
          <div>
            <h1>Multi-Step Form - Step {step}</h1>
            
            {step === 1 && (
              <div>
                <label htmlFor="name">Name</label>
                <input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                />
                <button onClick={() => setStep(2)}>Next</button>
              </div>
            )}
            
            {step === 2 && (
              <div>
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                />
                <button onClick={() => setStep(1)}>Back</button>
                <button onClick={() => setStep(3)}>Next</button>
              </div>
            )}
            
            {step === 3 && (
              <div>
                <label htmlFor="preferences">Preferences</label>
                <textarea
                  id="preferences"
                  value={formData.preferences}
                  onChange={(e) => setFormData(prev => ({ ...prev, preferences: e.target.value }))}
                />
                <button onClick={() => setStep(2)}>Back</button>
                <button type="submit">Submit</button>
              </div>
            )}
          </div>
        );
      };

      const result = renderWithProviders(<MockMultiStepForm />);

      // Step 1: Fill name
      await userInteractions.fillForm({ name: 'John Doe' }, result.user);
      await result.user.click(screen.getByText('Next'));

      expect(screen.getByText('Multi-Step Form - Step 2')).toBeInTheDocument();

      // Step 2: Fill email
      await userInteractions.fillForm({ email: 'john@example.com' }, result.user);
      await result.user.click(screen.getByText('Next'));

      expect(screen.getByText('Multi-Step Form - Step 3')).toBeInTheDocument();

      // Step 3: Fill preferences
      await userInteractions.fillForm({ preferences: 'Dark mode preferred' }, result.user);

      // Verify all data is preserved
      testUtils.expectFieldValue('preferences', 'Dark mode preferred');
    });
  });

  describe('Accessibility Testing', () => {
    it('should verify accessibility attributes', () => {
      const MockAccessibleForm: React.FC = () => (
        <form>
          <label htmlFor="search">Search</label>
          <input
            id="search"
            type="search"
            aria-label="Search plants"
            aria-describedby="search-help"
            required
          />
          <div id="search-help">Enter plant name or species</div>
          <button type="submit" aria-label="Submit search">
            Search
          </button>
        </form>
      );

      renderWithProviders(<MockAccessibleForm />);

      const searchInput = screen.getByRole('searchbox');
      const submitButton = screen.getByRole('button');

      testUtils.expectAccessibility(searchInput, {
        'aria-label': 'Search plants',
        'aria-describedby': 'search-help',
        'required': true
      });

      testUtils.expectAccessibility(submitButton, {
        'aria-label': 'Submit search'
      });
    });
  });
});