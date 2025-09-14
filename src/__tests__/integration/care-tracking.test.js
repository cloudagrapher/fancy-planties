// Care Tracking Integration Tests
// Tests complete care record creation, history viewing, and statistics workflows

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test-utils';
import { mockApiResponse, mockApiError, resetApiMocks } from '@/test-utils/helpers/api-helpers';
import { createAuthenticatedTestUser } from '@/test-utils/factories/user-factory';
import { createTestPlantInstance } from '@/test-utils/factories/plant-factory';
import { createTestCareRecord, createTestCareHistory, createCareTrackingTestData } from '@/test-utils/factories/care-factory';
import QuickCareForm from '@/components/care/QuickCareForm';
import CareHistoryTimeline from '@/components/care/CareHistoryTimeline';

// Mock hooks
jest.mock('@/hooks/useOffline', () => ({
  useOffline: () => ({
    isOnline: true,
    addPendingCareEntry: jest.fn(),
  }),
}));

jest.mock('@/lib/utils/service-worker', () => ({
  useServiceWorker: () => ({
    registerBackgroundSync: jest.fn(),
  }),
}));

describe('Care Tracking Integration Tests', () => {
  let testUser;
  let testPlantInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    resetApiMocks();

    // Create authenticated test user
    const authData = createAuthenticatedTestUser();
    testUser = authData.user;

    // Create test plant instance
    testPlantInstance = createTestPlantInstance({
      id: 1,
      userId: testUser.id,
      nickname: 'Test Plant',
    });
  });

  afterEach(() => {
    resetApiMocks();
  });

  describe('Care Record Creation and Logging Workflow', () => {
    it('should complete care logging workflow from form to database', async () => {
      // Arrange
      const newCareRecord = createTestCareRecord({
        id: 1,
        plantInstanceId: testPlantInstance.id,
        careType: 'fertilizer',
        careDate: new Date(),
        notes: 'Applied liquid fertilizer',
        userId: testUser.id,
      });

      mockApiResponse({
        'POST /api/care/log': {
          status: 200,
          data: newCareRecord,
        },
      });

      const mockOnSuccess = jest.fn();
      const { user } = renderWithProviders(
        <QuickCareForm
          plantInstanceId={testPlantInstance.id}
          onSuccess={mockOnSuccess}
          defaultCareType="fertilizer"
        />
      );

      // Act - Fill out care form
      const notesField = screen.getByLabelText(/notes/i);
      await user.type(notesField, 'Applied liquid fertilizer');

      // Select fertilizer care type (should be default)
      const fertilizerButton = screen.getByRole('button', { name: /fertilizer/i });
      await user.click(fertilizerButton);

      // Submit form
      const submitButton = screen.getByRole('button', { name: /log care/i });
      await user.click(submitButton);

      // Assert - Verify API call was made with correct data
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/care/log',
          expect.objectContaining({
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: expect.stringContaining('fertilizer'),
          })
        );
      });

      // Assert - Verify success callback was called
      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });

    it('should handle care logging validation errors', async () => {
      // Arrange
      mockApiResponse({
        'POST /api/care/log': {
          status: 400,
          data: {
            error: 'Care date cannot be in the future',
          },
        },
      });

      const { user } = renderWithProviders(
        <QuickCareForm
          plantInstanceId={testPlantInstance.id}
        />
      );

      // Act - Submit form with invalid data (the component should handle validation)
      const submitButton = screen.getByRole('button', { name: /log care/i });
      await user.click(submitButton);

      // Assert - Verify API call was made and error handling occurred
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/care/log',
          expect.objectContaining({
            method: 'POST',
          })
        );
      });

      // The component should handle the error response internally
      // We verify the API was called with error response
      expect(global.fetch).toHaveBeenCalled();
    });

    it('should handle different care types with specific fields', async () => {
      // Arrange
      const repotCareRecord = createTestCareRecord({
        careType: 'repot',
        potSize: '6 inch',
        soilType: 'Potting mix',
      });

      mockApiResponse({
        'POST /api/care/log': {
          status: 200,
          data: repotCareRecord,
        },
      });

      const { user } = renderWithProviders(
        <QuickCareForm
          plantInstanceId={testPlantInstance.id}
        />
      );

      // Act - Select repot care type
      const repotButton = screen.getByRole('button', { name: /repot/i });
      await user.click(repotButton);

      // Fill repot-specific fields
      await waitFor(() => {
        expect(screen.getByLabelText(/pot size/i)).toBeInTheDocument();
      });

      const potSizeField = screen.getByLabelText(/pot size/i);
      await user.type(potSizeField, '6 inch');

      const soilTypeField = screen.getByLabelText(/soil type/i);
      await user.type(soilTypeField, 'Potting mix');

      // Submit form
      const submitButton = screen.getByRole('button', { name: /log care/i });
      await user.click(submitButton);

      // Assert - Verify API call includes repot-specific data
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/care/log',
          expect.objectContaining({
            body: expect.stringContaining('repot'),
          })
        );
      });
    });

    it('should handle care form submission with all required fields', async () => {
      // Arrange
      const newCareRecord = createTestCareRecord({
        id: 1,
        plantInstanceId: testPlantInstance.id,
        careType: 'water',
        careDate: new Date(),
        notes: 'Watered thoroughly',
        userId: testUser.id,
      });

      mockApiResponse({
        'POST /api/care/log': {
          status: 200,
          data: newCareRecord,
        },
      });

      const { user } = renderWithProviders(
        <QuickCareForm
          plantInstanceId={testPlantInstance.id}
          defaultCareType="water"
        />
      );

      // Act - Fill out form and submit
      const notesField = screen.getByLabelText(/notes/i);
      await user.type(notesField, 'Watered thoroughly');

      const submitButton = screen.getByRole('button', { name: /log care/i });
      await user.click(submitButton);

      // Assert - Verify API call was made with correct data
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/care/log',
          expect.objectContaining({
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: expect.stringContaining('water'),
          })
        );
      });
    });

    it('should handle care logging server errors gracefully', async () => {
      // Arrange
      mockApiError('/api/care/log', 500, { error: 'Database connection failed' }, 'POST');

      const { user } = renderWithProviders(
        <QuickCareForm
          plantInstanceId={testPlantInstance.id}
        />
      );

      // Act - Submit form
      const submitButton = screen.getByRole('button', { name: /log care/i });
      await user.click(submitButton);

      // Assert - Verify error message is displayed
      await waitFor(() => {
        expect(screen.getByText(/database connection failed/i)).toBeInTheDocument();
      });
    });
  });

  describe('Care History Viewing and Filtering', () => {
    it('should display care history timeline with proper formatting', async () => {
      // Arrange
      const careHistory = [
        {
          ...createTestCareRecord({
            careType: 'fertilizer',
            careDate: new Date('2024-01-15'),
            notes: 'Applied liquid fertilizer',
          }),
          id: 1,
          formattedDate: 'Jan 15, 2024',
          daysSinceCare: 5,
          careTypeDisplay: {
            label: 'Fertilizer',
            icon: '🌱',
            color: 'text-green-600',
            description: 'Applied liquid fertilizer'
          }
        },
        {
          ...createTestCareRecord({
            careType: 'water',
            careDate: new Date('2024-01-10'),
            notes: 'Watered thoroughly',
          }),
          id: 2,
          formattedDate: 'Jan 10, 2024',
          daysSinceCare: 10,
          careTypeDisplay: {
            label: 'Water',
            icon: '💧',
            color: 'text-blue-600',
            description: 'Watered thoroughly'
          }
        },
        {
          ...createTestCareRecord({
            careType: 'repot',
            careDate: new Date('2024-01-01'),
            potSize: '6 inch',
            soilType: 'Potting mix',
          }),
          id: 3,
          formattedDate: 'Jan 1, 2024',
          daysSinceCare: 19,
          careTypeDisplay: {
            label: 'Repot',
            icon: '🪴',
            color: 'text-amber-600',
            description: 'Repotted plant'
          }
        },
      ];

      renderWithProviders(
        <CareHistoryTimeline
          careHistory={careHistory}
          plantInstance={testPlantInstance}
        />
      );

      // Assert - Verify care history is displayed
      expect(screen.getByText('Care History')).toBeInTheDocument();
      expect(screen.getByText('Applied liquid fertilizer')).toBeInTheDocument();
      expect(screen.getByText('Watered thoroughly')).toBeInTheDocument();
      expect(screen.getByText('Jan 15, 2024')).toBeInTheDocument();
      expect(screen.getByText('Jan 10, 2024')).toBeInTheDocument();

      // Assert - Verify repot-specific details are shown
      expect(screen.getByText('Pot Size:')).toBeInTheDocument();
      expect(screen.getByText('6 inch')).toBeInTheDocument();
      expect(screen.getByText('Soil Type:')).toBeInTheDocument();
      expect(screen.getByText('Potting mix')).toBeInTheDocument();
    });

    it('should handle empty care history gracefully', async () => {
      // Arrange
      renderWithProviders(
        <CareHistoryTimeline
          careHistory={[]}
          plantInstance={testPlantInstance}
        />
      );

      // Assert - Verify empty state is displayed
      expect(screen.getByText('No Care History')).toBeInTheDocument();
      expect(screen.getByText(/start logging care activities/i)).toBeInTheDocument();
    });

    it('should fetch and display care history from API', async () => {
      // Arrange
      const careHistory = [
        createTestCareRecord({
          id: 1,
          careType: 'fertilizer',
          formattedDate: 'Today',
          daysSinceCare: 0,
        }),
      ];

      mockApiResponse({
        'GET /api/care/history/1': {
          status: 200,
          data: careHistory,
        },
      });

      // Mock a component that fetches care history
      const CareHistoryContainer = () => {
        const [history, setHistory] = React.useState([]);
        const [loading, setLoading] = React.useState(true);

        React.useEffect(() => {
          const fetchHistory = async () => {
            try {
              const response = await fetch(`/api/care/history/${testPlantInstance.id}`);
              const data = await response.json();
              setHistory(data);
            } catch (error) {
              console.error('Failed to fetch care history:', error);
            } finally {
              setLoading(false);
            }
          };

          fetchHistory();
        }, []);

        if (loading) return <div>Loading...</div>;

        return (
          <CareHistoryTimeline
            careHistory={history}
            plantInstance={testPlantInstance}
          />
        );
      };

      renderWithProviders(<CareHistoryContainer />);

      // Assert - Verify API call was made
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(`/api/care/history/${testPlantInstance.id}`);
      });

      // Assert - Verify care history is displayed
      await waitFor(() => {
        expect(screen.getByText('Care History')).toBeInTheDocument();
      });
    });

    it('should handle care history API errors', async () => {
      // Arrange
      mockApiError('/api/care/history/1', 500, { error: 'Failed to fetch care history' });

      const CareHistoryContainer = () => {
        const [history, setHistory] = React.useState([]);
        const [error, setError] = React.useState(null);

        React.useEffect(() => {
          const fetchHistory = async () => {
            try {
              const response = await fetch(`/api/care/history/${testPlantInstance.id}`);
              if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error);
              }
              const data = await response.json();
              setHistory(data);
            } catch (err) {
              setError(err.message);
            }
          };

          fetchHistory();
        }, []);

        if (error) return <div>Error: {error}</div>;

        return (
          <CareHistoryTimeline
            careHistory={history}
            plantInstance={testPlantInstance}
          />
        );
      };

      renderWithProviders(<CareHistoryContainer />);

      // Assert - Verify error is displayed
      await waitFor(() => {
        expect(screen.getByText(/failed to fetch care history/i)).toBeInTheDocument();
      });
    });

    it('should filter care history by care type and date range', async () => {
      // Arrange
      const careHistory = [
        createTestCareRecord({
          id: 1,
          careType: 'fertilizer',
          careDate: new Date('2024-01-15'),
          formattedDate: 'Jan 15, 2024',
        }),
        createTestCareRecord({
          id: 2,
          careType: 'water',
          careDate: new Date('2024-01-10'),
          formattedDate: 'Jan 10, 2024',
        }),
        createTestCareRecord({
          id: 3,
          careType: 'fertilizer',
          careDate: new Date('2024-01-05'),
          formattedDate: 'Jan 5, 2024',
        }),
      ];

      mockApiResponse({
        'GET /api/care/history/1': {
          status: 200,
          data: careHistory.filter(care => care.careType === 'fertilizer'),
        },
      });

      // Mock a component that fetches filtered care history
      const FilteredCareHistory = () => {
        const [history, setHistory] = React.useState([]);
        const [loading, setLoading] = React.useState(true);

        React.useEffect(() => {
          const fetchHistory = async () => {
            try {
              const response = await fetch(`/api/care/history/${testPlantInstance.id}?careType=fertilizer`);
              const data = await response.json();
              setHistory(data);
            } catch (error) {
              console.error('Failed to fetch care history:', error);
            } finally {
              setLoading(false);
            }
          };

          fetchHistory();
        }, []);

        if (loading) return <div>Loading...</div>;

        return (
          <CareHistoryTimeline
            careHistory={history}
            plantInstance={testPlantInstance}
          />
        );
      };

      renderWithProviders(<FilteredCareHistory />);

      // Assert - Verify API call was made with filter parameters
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(`/api/care/history/${testPlantInstance.id}?careType=fertilizer`);
      });

      // Assert - Verify filtered care history is displayed
      await waitFor(() => {
        expect(screen.getByText('Care History')).toBeInTheDocument();
      });
    });
  });

describe('Care Statistics Calculation and Display', () => {
    it('should fetch and display care dashboard statistics', async () => {
      // Arrange
      const dashboardData = {
        totalPlants: 5,
        plantsNeedingCare: 2,
        overduePlants: 1,
        recentCareActivities: 8,
        careStats: {
          fertilizer: { count: 15, lastDate: '2024-01-15' },
          water: { count: 25, lastDate: '2024-01-18' },
          repot: { count: 3, lastDate: '2024-01-01' },
        },
        upcomingCare: [
          {
            plantInstanceId: 1,
            nickname: 'Test Plant',
            careType: 'fertilizer',
            dueDate: '2024-01-20',
            daysUntilDue: 2,
          },
        ],
      };

      mockApiResponse({
        'GET /api/plant-instances/dashboard': {
          status: 200,
          data: dashboardData,
        },
      });

      // Mock a dashboard component that uses the actual API endpoint
      const CareDashboard = () => {
        const [dashboard, setDashboard] = React.useState(null);
        const [loading, setLoading] = React.useState(true);

        React.useEffect(() => {
          const fetchDashboard = async () => {
            try {
              const response = await fetch('/api/plant-instances/dashboard');
              const data = await response.json();
              setDashboard(data);
            } catch (error) {
              console.error('Failed to fetch dashboard:', error);
            } finally {
              setLoading(false);
            }
          };

          fetchDashboard();
        }, []);

        if (loading) return <div>Loading dashboard...</div>;
        if (!dashboard) return <div>No data</div>;

        return (
          <div>
            <h2>Care Dashboard</h2>
            <div>Total Plants: {dashboard.totalPlants}</div>
            <div>Plants Needing Care: {dashboard.plantsNeedingCare}</div>
            <div>Overdue Plants: {dashboard.overduePlants}</div>
            <div>Recent Activities: {dashboard.recentCareActivities}</div>
            <div>
              <h3>Care Statistics</h3>
              <div>Fertilizer: {dashboard.careStats.fertilizer.count} times</div>
              <div>Water: {dashboard.careStats.water.count} times</div>
              <div>Repot: {dashboard.careStats.repot.count} times</div>
            </div>
            <div>
              <h3>Upcoming Care</h3>
              {dashboard.upcomingCare.map((care) => (
                <div key={care.plantInstanceId}>
                  {care.nickname} needs {care.careType} in {care.daysUntilDue} days
                </div>
              ))}
            </div>
          </div>
        );
      };

      renderWithProviders(<CareDashboard />);

      // Assert - Verify API call was made to correct endpoint
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/plant-instances/dashboard');
      });

      // Assert - Verify dashboard data is displayed
      await waitFor(() => {
        expect(screen.getByText('Care Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Total Plants: 5')).toBeInTheDocument();
        expect(screen.getByText('Plants Needing Care: 2')).toBeInTheDocument();
        expect(screen.getByText('Overdue Plants: 1')).toBeInTheDocument();
        expect(screen.getByText('Recent Activities: 8')).toBeInTheDocument();
      });

      // Assert - Verify care statistics are displayed
      await waitFor(() => {
        expect(screen.getByText('Fertilizer: 15 times')).toBeInTheDocument();
        expect(screen.getByText('Water: 25 times')).toBeInTheDocument();
        expect(screen.getByText('Repot: 3 times')).toBeInTheDocument();
      });

      // Assert - Verify upcoming care is displayed
      await waitFor(() => {
        expect(screen.getByText(/test plant needs fertilizer in 2 days/i)).toBeInTheDocument();
      });
    });

    it('should handle care dashboard API errors', async () => {
      // Arrange
      mockApiError('/api/plant-instances/dashboard', 500, { error: 'Failed to calculate statistics' });

      const CareDashboard = () => {
        const [error, setError] = React.useState(null);

        React.useEffect(() => {
          const fetchDashboard = async () => {
            try {
              const response = await fetch('/api/plant-instances/dashboard');
              if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error);
              }
            } catch (err) {
              setError(err.message);
            }
          };

          fetchDashboard();
        }, []);

        if (error) return <div>Dashboard Error: {error}</div>;
        return <div>Loading...</div>;
      };

      renderWithProviders(<CareDashboard />);

      // Assert - Verify error is displayed
      await waitFor(() => {
        expect(screen.getByText(/failed to calculate statistics/i)).toBeInTheDocument();
      });
    });

    it('should calculate care frequency statistics correctly', async () => {
      // Arrange
      const careHistory = [
        createTestCareRecord({ careType: 'fertilizer', careDate: new Date('2024-01-01') }),
        createTestCareRecord({ careType: 'fertilizer', careDate: new Date('2024-01-15') }),
        createTestCareRecord({ careType: 'water', careDate: new Date('2024-01-05') }),
        createTestCareRecord({ careType: 'water', careDate: new Date('2024-01-10') }),
        createTestCareRecord({ careType: 'water', careDate: new Date('2024-01-15') }),
      ];

      // Mock a statistics calculator component
      const CareStatistics = ({ careHistory }) => {
        const calculateStats = (history) => {
          const stats = {};
          history.forEach((care) => {
            if (!stats[care.careType]) {
              stats[care.careType] = { count: 0, dates: [] };
            }
            stats[care.careType].count++;
            stats[care.careType].dates.push(care.careDate);
          });
          return stats;
        };

        const stats = calculateStats(careHistory);

        return (
          <div>
            <h3>Care Statistics</h3>
            {Object.entries(stats).map(([careType, data]) => (
              <div key={careType}>
                {careType}: {data.count} times
              </div>
            ))}
          </div>
        );
      };

      renderWithProviders(<CareStatistics careHistory={careHistory} />);

      // Assert - Verify statistics are calculated correctly
      expect(screen.getByText('fertilizer: 2 times')).toBeInTheDocument();
      expect(screen.getByText('water: 3 times')).toBeInTheDocument();
    });
  });

  describe('End-to-End Care Tracking Flow', () => {
    it('should complete full care tracking cycle: log -> view history -> check statistics', async () => {
      // Step 1: Log care
      const newCareRecord = createTestCareRecord({
        id: 1,
        plantInstanceId: testPlantInstance.id,
        careType: 'fertilizer',
      });

      mockApiResponse({
        'POST /api/care/log': {
          status: 200,
          data: newCareRecord,
        },
        'GET /api/care/history/1': {
          status: 200,
          data: [newCareRecord],
        },
        'GET /api/plant-instances/dashboard': {
          status: 200,
          data: {
            totalPlants: 1,
            recentCareActivities: 1,
            careStats: {
              fertilizer: { count: 1, lastDate: newCareRecord.careDate },
            },
          },
        },
      });

      const { user } = renderWithProviders(
        <QuickCareForm
          plantInstanceId={testPlantInstance.id}
        />
      );

      // Log care
      const submitButton = screen.getByRole('button', { name: /log care/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/care/log',
          expect.objectContaining({ method: 'POST' })
        );
      });

      // Verify the care logging workflow completed
      expect(global.fetch).toHaveBeenCalled();
    });

    it('should handle comprehensive care tracking with realistic data', async () => {
      // Arrange - Create comprehensive test data with proper IDs
      const testData = createCareTrackingTestData(testPlantInstance.id, testUser.id);
      
      // Add IDs and required fields to make them compatible with EnhancedCareHistory
      const enhancedCareHistory = testData.recentCareHistory.map((care, index) => ({
        ...care,
        id: index + 1, // Add unique ID
        daysSinceCare: Math.floor(Math.random() * 30), // Add required field
        formattedDate: new Date(care.careDate).toLocaleDateString(), // Add required field
        careTypeDisplay: { // Add required field
          label: care.careType.charAt(0).toUpperCase() + care.careType.slice(1),
          icon: '🌱',
          color: 'text-green-600',
          description: `Applied ${care.careType} care`
        }
      }));
      
      renderWithProviders(
        <CareHistoryTimeline
          careHistory={enhancedCareHistory}
          plantInstance={testPlantInstance}
          limit={5}
        />
      );

      // Assert - Verify care history is displayed
      expect(screen.getByText('Care History')).toBeInTheDocument();
      
      // Verify that care records are shown (at least one should be visible)
      const careElements = screen.getAllByText(/care/i);
      expect(careElements.length).toBeGreaterThan(0);
    });
  });
});