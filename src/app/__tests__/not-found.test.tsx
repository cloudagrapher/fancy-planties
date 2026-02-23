import React from 'react';
import { render, screen } from '@testing-library/react';
import NotFound from '../not-found';

describe('Custom 404 page', () => {
  it('renders the custom not-found page with expected content', () => {
    render(<NotFound />);
    expect(screen.getByText('Page not found')).toBeInTheDocument();
    expect(screen.getByText(/hasn.t sprouted yet/)).toBeInTheDocument();
    const link = screen.getByRole('link', { name: /go to dashboard/i });
    expect(link).toHaveAttribute('href', '/dashboard');
  });

  it('is a default export (required by Next.js App Router)', () => {
    expect(typeof NotFound).toBe('function');
    expect(NotFound.name).toBe('NotFound');
  });
});
