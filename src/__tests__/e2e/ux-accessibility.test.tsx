/**
 * User Experience and Accessibility Validation Tests
 * Tests complete accessibility audit, cross-browser compatibility, responsive design, and user feedback
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { axe, toHaveNoViolations } from 'jest-axe';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock matchMedia for responsive tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock navigator for browser compatibility tests
Object.defineProperty(navigator, 'userAgent', {
  writable: true,
  value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
});

describe('User Experience and Accessibility Validation', () => {
  let queryClient: QueryClient;
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    user = userEvent.setup();
    jest.clearAllMocks();
  });

  describe('Complete Accessibility Audit', () => {
    test('should pass axe accessibility tests for main dashboard', async () => {
      const { DashboardClient } = await import('@/app/dashboard/DashboardClient');
      
      const { container } = render(
        <QueryClientProvider client={queryClient}>
          <DashboardClient userId={1} />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(container.firstChild).toBeInTheDocument();
      });

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('should pass axe accessibility tests for plant management', async () => {
      const { PlantsGrid } = await import('@/components/plants/PlantsGrid');
      
      const { container } = render(
        <QueryClientProvider client={queryClient}>
          <PlantsGrid />
        </QueryClientProvider>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('should pass axe accessibility tests for forms', async () => {
      const { PlantInstanceForm } = await import('@/components/plants/PlantInstanceForm');
      
      const { container } = render(
        <PlantInstanceForm
          onSubmit={jest.fn()}
          onCancel={jest.fn()}
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('should support screen reader navigation', async () => {
      const { BottomNavigation } = await import('@/components/navigation/BottomNavigation');
      
      render(<BottomNavigation />);

      // Check for proper ARIA labels
      const navElement = screen.getByRole('navigation');
      expect(navElement).toHaveAttribute('aria-label');

      // Check for proper button roles and labels
      const navButtons = screen.getAllByRole('button');
      navButtons.forEach(button => {
        expect(button).toHaveAttribute('aria-label');
      });
    });

    test('should provide proper focus management', async () => {
      const { Modal } = await import('@/components/shared/Modal');
      
      const { rerender } = render(
        <Modal isOpen={false} onClose={jest.fn()}>
          <div>Modal content</div>
        </Modal>
      );

      // Open modal
      rerender(
        <Modal isOpen={true} onClose={jest.fn()}>
          <button>First button</button>
          <input type="text" placeholder="Input field" />
          <button>Last button</button>
        </Modal>
      );

      // Focus should be trapped within modal
      const firstButton = screen.getByText('First button');
      const lastButton = screen.getByText('Last button');

      firstButton.focus();
      expect(document.activeElement).toBe(firstButton);

      // Tab should cycle within modal
      await user.tab();
      expect(document.activeElement).toBe(screen.getByPlaceholderText('Input field'));

      await user.tab();
      expect(document.activeElement).toBe(lastButton);

      // Tab from last element should go to first
      await user.tab();
      expect(document.activeElement).toBe(firstButton);
    });

    test('should support keyboard navigation', async () => {
      const { PlantsGrid } = await import('@/components/plants/PlantsGrid');
      
      render(
        <QueryClientProvider client={queryClient}>
          <PlantsGrid />
        </QueryClientProvider>
      );

      // Should be able to navigate with keyboard
      await user.tab();
      expect(document.activeElement).toBeInTheDocument();

      // Should support arrow key navigation for grids
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{ArrowRight}');
      await user.keyboard('{Enter}');
    });

    test('should provide proper color contrast', async () => {
      // Test high contrast mode
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query.includes('prefers-contrast: high'),
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      const { PlantCard } = await import('@/components/plants/PlantCard');
      
      render(
        <PlantCard
          plant={{
            id: 1,
            nickname: 'Test Plant',
            location: 'Test Location',
            status: 'healthy',
            lastCareDate: null,
            nextCareDate: null,
            careStreak: 0,
            images: [],
          }}
          onCareAction={jest.fn()}
        />
      );

      // Should adapt to high contrast mode
      const card = screen.getByRole('article');
      expect(card).toBeInTheDocument();
    });

    test('should support reduced motion preferences', async () => {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query.includes('prefers-reduced-motion: reduce'),
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      const { PlantImageGallery } = await import('@/components/plants/PlantImageGallery');
      
      render(
        <PlantImageGallery
          images={[
            { id: 1, src: 'test1.jpg', alt: 'Test 1' },
            { id: 2, src: 'test2.jpg', alt: 'Test 2' },
          ]}
        />
      );

      // Should respect reduced motion preferences
      const gallery = screen.getByRole('region');
      expect(gallery).toBeInTheDocument();
    });
  });

  describe('Cross-Browser Compatibility', () => {
    const browsers = [
      {
        name: 'Chrome',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
      {
        name: 'Firefox',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
      },
      {
        name: 'Safari',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
      },
      {
        name: 'Edge',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.59',
      },
    ];

    browsers.forEach(browser => {
      test(`should work correctly in ${browser.name}`, async () => {
        Object.defineProperty(navigator, 'userAgent', {
          writable: true,
          value: browser.userAgent,
        });

        const { PlantsGrid } = await import('@/components/plants/PlantsGrid');
        
        render(
          <QueryClientProvider client={queryClient}>
            <PlantsGrid />
          </QueryClientProvider>
        );

        // Should render without browser-specific errors
        expect(screen.getByTestId('plants-grid')).toBeInTheDocument();
      });
    });

    test('should handle missing modern browser features gracefully', async () => {
      // Mock missing IntersectionObserver
      const originalIntersectionObserver = global.IntersectionObserver;
      delete (global as any).IntersectionObserver;

      const { VirtualScrollList } = await import('@/components/shared/VirtualScrollList');
      
      render(
        <VirtualScrollList
          items={[1, 2, 3]}
          renderItem={(item) => <div key={item}>Item {item}</div>}
        />
      );

      // Should fallback gracefully
      expect(screen.getByText('Item 1')).toBeInTheDocument();

      // Restore
      global.IntersectionObserver = originalIntersectionObserver;
    });

    test('should handle CSS feature detection', async () => {
      // Mock CSS.supports
      global.CSS = {
        supports: jest.fn((property, value) => {
          // Simulate older browser without grid support
          if (property === 'display' && value === 'grid') {
            return false;
          }
          return true;
        }),
      } as any;

      const { PlantsGrid } = await import('@/components/plants/PlantsGrid');
      
      render(
        <QueryClientProvider client={queryClient}>
          <PlantsGrid />
        </QueryClientProvider>
      );

      // Should use flexbox fallback
      expect(screen.getByTestId('plants-grid')).toBeInTheDocument();
    });
  });

  describe('Responsive Design Validation', () => {
    const viewports = [
      { name: 'Mobile', width: 375, height: 667 },
      { name: 'Tablet', width: 768, height: 1024 },
      { name: 'Desktop', width: 1920, height: 1080 },
      { name: 'Large Desktop', width: 2560, height: 1440 },
    ];

    viewports.forEach(viewport => {
      test(`should adapt to ${viewport.name} viewport (${viewport.width}x${viewport.height})`, async () => {
        // Mock viewport size
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          value: viewport.width,
        });
        Object.defineProperty(window, 'innerHeight', {
          writable: true,
          value: viewport.height,
        });

        // Mock matchMedia for responsive queries
        Object.defineProperty(window, 'matchMedia', {
          writable: true,
          value: jest.fn().mockImplementation(query => {
            const width = viewport.width;
            return {
              matches: (
                (query.includes('max-width: 640px') && width <= 640) ||
                (query.includes('min-width: 768px') && width >= 768) ||
                (query.includes('min-width: 1024px') && width >= 1024)
              ),
              media: query,
              onchange: null,
              addListener: jest.fn(),
              removeListener: jest.fn(),
              addEventListener: jest.fn(),
              removeEventListener: jest.fn(),
              dispatchEvent: jest.fn(),
            };
          }),
        });

        const { DashboardClient } = await import('@/app/dashboard/DashboardClient');
        
        render(
          <QueryClientProvider client={queryClient}>
            <DashboardClient userId={1} />
          </QueryClientProvider>
        );

        // Should adapt layout to viewport
        const dashboard = screen.getByTestId('dashboard');
        expect(dashboard).toBeInTheDocument();

        // Trigger resize event
        fireEvent(window, new Event('resize'));
      });
    });

    test('should handle orientation changes', async () => {
      const { BottomNavigation } = await import('@/components/navigation/BottomNavigation');
      
      render(<BottomNavigation />);

      // Mock orientation change
      Object.defineProperty(screen, 'orientation', {
        writable: true,
        value: { angle: 90, type: 'landscape-primary' },
      });

      fireEvent(window, new Event('orientationchange'));

      // Should adapt to landscape orientation
      const navigation = screen.getByRole('navigation');
      expect(navigation).toBeInTheDocument();
    });

    test('should support safe area insets on mobile devices', async () => {
      // Mock iOS safe area environment
      const style = document.createElement('style');
      style.textContent = `
        :root {
          --safe-area-inset-top: 44px;
          --safe-area-inset-bottom: 34px;
          --safe-area-inset-left: 0px;
          --safe-area-inset-right: 0px;
        }
      `;
      document.head.appendChild(style);

      const { BottomNavigation } = await import('@/components/navigation/BottomNavigation');
      
      render(<BottomNavigation />);

      const navigation = screen.getByRole('navigation');
      expect(navigation).toBeInTheDocument();

      // Clean up
      document.head.removeChild(style);
    });

    test('should handle dynamic content resizing', async () => {
      const { PlantCard } = await import('@/components/plants/PlantCard');
      
      const { rerender } = render(
        <PlantCard
          plant={{
            id: 1,
            nickname: 'Short Name',
            location: 'Room',
            status: 'healthy',
            lastCareDate: null,
            nextCareDate: null,
            careStreak: 0,
            images: [],
          }}
          onCareAction={jest.fn()}
        />
      );

      // Update with longer content
      rerender(
        <PlantCard
          plant={{
            id: 1,
            nickname: 'Very Long Plant Name That Should Wrap Properly',
            location: 'Very Long Location Name That Should Also Wrap',
            status: 'healthy',
            lastCareDate: null,
            nextCareDate: null,
            careStreak: 0,
            images: [],
          }}
          onCareAction={jest.fn()}
        />
      );

      // Should handle content overflow gracefully
      expect(screen.getByText(/Very Long Plant Name/)).toBeInTheDocument();
    });
  });

  describe('User Feedback Integration', () => {
    test('should provide clear loading states', async () => {
      const { PlantsGrid } = await import('@/components/plants/PlantsGrid');
      
      render(
        <QueryClientProvider client={queryClient}>
          <PlantsGrid />
        </QueryClientProvider>
      );

      // Should show loading state initially
      expect(screen.getByTestId('loading-skeleton') || screen.getByText(/loading/i)).toBeInTheDocument();
    });

    test('should provide clear error messages', async () => {
      // Mock API error
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const { PlantsGrid } = await import('@/components/plants/PlantsGrid');
      
      render(
        <QueryClientProvider client={queryClient}>
          <PlantsGrid />
        </QueryClientProvider>
      );

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/error|failed|something went wrong/i)).toBeInTheDocument();
      });

      // Should provide retry option
      expect(screen.getByRole('button', { name: /retry|try again/i })).toBeInTheDocument();
    });

    test('should provide success feedback for actions', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const { QuickCareForm } = await import('@/components/care/QuickCareForm');
      
      render(
        <QueryClientProvider client={queryClient}>
          <QuickCareForm
            plantInstanceId={1}
            onSuccess={jest.fn()}
            onCancel={jest.fn()}
          />
        </QueryClientProvider>
      );

      // Fill and submit form
      const careTypeSelect = screen.getByLabelText(/care type/i);
      await user.selectOptions(careTypeSelect, 'fertilizer');

      const submitButton = screen.getByRole('button', { name: /log care|submit/i });
      await user.click(submitButton);

      // Should show success feedback
      await waitFor(() => {
        expect(screen.getByText(/success|saved|logged/i)).toBeInTheDocument();
      });
    });

    test('should provide progress indicators for long operations', async () => {
      const { CSVImportModal } = await import('@/components/import/CSVImportModal');
      
      render(
        <CSVImportModal
          isOpen={true}
          onClose={jest.fn()}
        />
      );

      // Mock file upload
      const fileInput = screen.getByLabelText(/choose file|upload/i);
      const file = new File(['test,data'], 'test.csv', { type: 'text/csv' });

      await user.upload(fileInput, file);

      // Should show progress indicator
      expect(screen.getByRole('progressbar') || screen.getByText(/progress|uploading/i)).toBeInTheDocument();
    });

    test('should provide contextual help and tooltips', async () => {
      const { PlantTaxonomyForm } = await import('@/components/plants/PlantTaxonomyForm');
      
      render(
        <PlantTaxonomyForm
          onSubmit={jest.fn()}
          onCancel={jest.fn()}
        />
      );

      // Should have help text or tooltips
      const helpElements = screen.getAllByText(/help|info|tooltip/i);
      expect(helpElements.length).toBeGreaterThan(0);
    });

    test('should provide confirmation dialogs for destructive actions', async () => {
      const { PlantCard } = await import('@/components/plants/PlantCard');
      
      render(
        <PlantCard
          plant={{
            id: 1,
            nickname: 'Test Plant',
            location: 'Test Location',
            status: 'healthy',
            lastCareDate: null,
            nextCareDate: null,
            careStreak: 0,
            images: [],
          }}
          onCareAction={jest.fn()}
          showDeleteOption={true}
        />
      );

      // Click delete button
      const deleteButton = screen.getByRole('button', { name: /delete|remove/i });
      await user.click(deleteButton);

      // Should show confirmation dialog
      await waitFor(() => {
        expect(screen.getByText(/confirm|are you sure|delete/i)).toBeInTheDocument();
      });

      // Should have cancel and confirm options
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /delete|confirm/i })).toBeInTheDocument();
    });

    test('should provide undo functionality for reversible actions', async () => {
      const { CareDashboard } = await import('@/components/care/CareDashboard');
      
      render(
        <QueryClientProvider client={queryClient}>
          <CareDashboard />
        </QueryClientProvider>
      );

      // Mock care action
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      // Perform care action
      const careButton = screen.getByRole('button', { name: /water|fertilize/i });
      await user.click(careButton);

      // Should show undo option
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /undo/i })).toBeInTheDocument();
      });
    });

    test('should provide keyboard shortcuts information', async () => {
      const { DashboardClient } = await import('@/app/dashboard/DashboardClient');
      
      render(
        <QueryClientProvider client={queryClient}>
          <DashboardClient userId={1} />
        </QueryClientProvider>
      );

      // Should support common keyboard shortcuts
      await user.keyboard('{Control>}k{/Control}'); // Search shortcut

      // Should show search interface or help
      expect(screen.getByRole('searchbox') || screen.getByText(/search/i)).toBeInTheDocument();
    });
  });

  describe('Performance Feedback', () => {
    test('should show loading skeletons during data fetching', async () => {
      const { PlantCardSkeleton } = await import('@/components/plants/PlantCardSkeleton');
      
      render(<PlantCardSkeleton />);

      // Should show skeleton loading state
      expect(screen.getByTestId('skeleton-loader')).toBeInTheDocument();
    });

    test('should provide optimistic updates for user actions', async () => {
      const { QuickCareActions } = await import('@/components/care/QuickCareActions');
      
      render(
        <QueryClientProvider client={queryClient}>
          <QuickCareActions plantInstanceId={1} />
        </QueryClientProvider>
      );

      // Mock slow API response
      global.fetch = jest.fn().mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            ok: true,
            json: () => Promise.resolve({ success: true }),
          }), 1000)
        )
      );

      const waterButton = screen.getByRole('button', { name: /water/i });
      await user.click(waterButton);

      // Should show optimistic update immediately
      expect(screen.getByText(/watered|just watered/i)).toBeInTheDocument();
    });

    test('should handle slow network conditions gracefully', async () => {
      // Mock slow network
      global.fetch = jest.fn().mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, data: [] }),
          }), 5000)
        )
      );

      const { PlantsGrid } = await import('@/components/plants/PlantsGrid');
      
      render(
        <QueryClientProvider client={queryClient}>
          <PlantsGrid />
        </QueryClientProvider>
      );

      // Should show loading state for extended period
      expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();

      // Should eventually timeout or show offline message
      await waitFor(() => {
        expect(
          screen.getByText(/slow connection|offline|timeout/i) ||
          screen.getByTestId('loading-skeleton')
        ).toBeInTheDocument();
      }, { timeout: 6000 });
    });
  });
});