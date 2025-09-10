// Care Tracking Integration Tests
// Tests complete care record creation, history viewing, and statistics workflows

import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders, userInteractions } from '@/test-utils';
import { mockApiResponse, mockApiError, resetApiMocks } from '@/test-utils/helpers/api-helpers';
import { createAuthenticatedTestUser } from '@/test-utils/factories/user-factory';
import { createTestPlantInstance } from '@/test-utils/factories/plant-factory';
import { createTestCareRecord } from '@/test-utils/factories/care-factory';
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
  let testSession;
  let testPlantInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    resetApiMocks();

    // Create authenticated test user
    const authData = createAuthenticatedTestUser();
    testUser = authData.user;
    testSession = authData.session;

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

      // Act - Set future date
      const dateField = screen.getByLabelText(/care date/i);
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const futureDateString = futureDate.toISOString().split('T')[0];
      
      await user.clear(dateField);
      await user.type(dateField, futureDateString);

      // Submit form
      const submitButton = screen.getByRole('button', { name: /log care/i });
      await user.click(submitButton);

      // Assert - Verify error message is displayed
      await waitFor(() => {
        expect(screen.getByText(/care date cannot be in the future/i)).toBeInTheDocument();
      });
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

    it('should handle offline care logging with queue', async () => {
      // Arrange - Mock offline state
      const mockAddPendingCareEntry = jest.fn(() => 'pending-123');
      const mockRegisterBackgroundSync = jest.fn();

      jest.doMock('@/hooks/useOffline', () => ({
        useOffline: () => ({
          isOnline: false,
          addPendingCareEntry: mockAddPendingCareEntry,
        }),
      }));

      jest.doMock('@/lib/utils/service-worker', () => ({
        useServiceWorker: () => ({
          registerBackgroundSync: mockRegisterBackgroundSync,
        }),
      }));

      const { user } = renderWithProviders(
        <QuickCareForm
          plantInstanceId={testPlantInstance.id}
        />
      );

      // Assert - Verify offline indicator is shown
      expect(screen.getByText(/offline mode/i)).toBeInTheDocument();

      // Act - Submit care form while offline
      const submitButton = screen.getByRole('button', { name: /queue for sync/i });
      await user.click(submitButton);

      // Assert - Verify offline handling
      await waitFor(() => {
        expect(mockAddPendingCareEntry).toHaveBeenCalled();
        expect(mockRegisterBackgroundSync).toHaveBeenCalled();
      });

      // Assert - Verify no API call was made
      expect(global.fetch).not.toHaveBeenCalled();
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
        createTestCareRecord({
          id: 1,
          careType: 'fertilizer',
          careDate: new Date('2024-01-15'),
          notes: 'Applied liquid fertilizer',
          formattedDate: 'Jan 15, 2024',
          daysSinceCare: 5,
        }),
        createTestCareRecord({
          id: 2,
          careType: 'water',
          careDate: new Date('2024-01-10'),
          notes: 'Watered thoroughly',
          formattedDate: 'Jan 10, 2024',
          daysSinceCare: 10,
        }),
        createTestCareRecord({
          id: 3,
          careType: 'repot',
          careDate: new Date('2024-01-01'),
          potSize: '6 inch',
          soilType: 'Potting mix',
          formattedDate: 'Jan 1, 2024',
          daysSinceCare: 19,
        }),
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

    it('should limit displayed care history when limit is specified', async () => {
      // Arrange
      const careHistory = Array.from({ length: 15 }, (_, index) =>
        createTestCareRecord({
          id: index + 1,
          careType: 'water',
          formattedDate: `Day ${index + 1}`,
          daysSinceCare: index + 1,
        })
      );

      renderWithProviders(
        <CareHistoryTimeline
          careHistory={careHistory}
          plantInstance={testPlantInstance}
          limit={5}
        />
      );

      // Assert - Verify only limited items are shown
      expect(screen.getByText('Day 1')).toBeInTheDocument();
      expect(screen.getByText('Day 5')).toBeInTheDocument();
      expect(screen.queryByText('Day 6')).not.toBeInTheDocument();

      // Assert - Verify limit indicator is shown
      expect(screen.getByText(/showing 5 of 15 care events/i)).toBeInTheDocument();
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
        'GET /api/care/dashboard': {
          status: 200,
          data: dashboardData,
        },
      });

      // Mock a dashboard component
      const CareDashboard = () => {
        const [dashboard, setDashboard] = React.useState(null);
        const [loading, setLoading] = React.useState(true);

        React.useEffect(() => {
          const fetchDashboard = async () => {
            try {
              const response = await fetch('/api/care/dashboard');
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

      // Assert - Verify API call was made
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/care/dashboard');
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
      mockApiError('/api/care/dashboard', 500, { error: 'Failed to calculate statistics' });

      const CareDashboard = () => {
        const [error, setError] = React.useState(null);

        React.useEffect(() => {
          const fetchDashboard = async () => {
            try {
              const response = await fetch('/api/care/dashboard');
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
      });

      const { user, rerender } = renderWithProviders(
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

      // Reset mocks for history step
      jest.clearAllMocks();

      // Step 2: View care history
      mockApiResponse({
        'GET /api/care/history/1': {
          status: 200,
          data: [newCareRecord],
        },
      });

      const CareHistoryContainer = () => {
        const [history, setHistory] = React.useState([]);

        React.useEffect(() => {
          const fetchHistory = async () => {
            const response = await fetch(`/api/care/history/${testPlantInstance.id}`);
            const data = await response.json();
            setHistory(data);
          };
          fetchHistory();
        }, []);

        return (
          <CareHistoryTimeline
            careHistory={history}
            plantInstance={testPlantInstance}
          />
        );
      };

      rerender(<CareHistoryContainer />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(`/api/care/history/${testPlantInstance.id}`);
      });

      // Reset mocks for dashboard step
      jest.clearAllMocks();

      // Step 3: Check dashboard statistics
      mockApiResponse({
        'GET /api/care/dashboard': {
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

      const CareDashboard = () => {
        const [dashboard, setDashboard] = React.useState(null);

        React.useEffect(() => {
          const fetchDashboard = async () => {
            const response = await fetch('/api/care/dashboard');
            const data = await response.json();
            setDashboard(data);
          };
          fetchDashboard();
        }, []);

        if (!dashboard) return <div>Loading...</div>;

        return (
          <div>
            <div>Recent Activities: {dashboard.recentCareActivities}</div>
            <div>Fertilizer Count: {dashboard.careStats.fertilizer.count}</div>
          </div>
        );
      };

      rerender(<CareDashboard />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/care/dashboard');
      });

      await waitFor(() => {
        expect(screen.getByText('Recent Activities: 1')).toBeInTheDocument();
        expect(screen.getByText('Fertilizer Count: 1')).toBeInTheDocument();
      });
    });

    it('should handle care tracking with multiple plants and care types', async () => {
      // Arrange
      const multiPlantCareHistory = [
        createTestCareRecord({
          id: 1,
          plantInstanceId: 1,
          careType: 'fertilizer',
          plantInstance: { nickname: 'Plant 1' },
        }),
        createTestCareRecord({
          id: 2,
          plantInstanceId: 2,
          careType: 'water',
          plantInstance: { nickname: 'Plant 2' },
        }),
      ];

      renderWithProviders(
        <CareHistoryTimeline
          careHistory={multiPlantCareHistory}
          plantInstance={testPlantInstance}
          showPlantName={true}
        />
      );

      // Assert - Verify multiple plants are shown
      expect(screen.getByText(/plant 1/i)).toBeInTheDocument();
      expect(screen.getByText(/plant 2/i)).toBeInTheDocument();
    });
  });
});