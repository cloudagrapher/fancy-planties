import React from 'react';
import { render, screen } from '@testing-library/react';
import { renderWithProviders } from '@/test-utils/helpers/render-helpers';
import PropagationCard from '../PropagationCard';

// Mock apiFetch
jest.mock('@/lib/api-client', () => ({
  apiFetch: jest.fn(),
}));

const basePropagation = {
  id: 1,
  userId: 1,
  plantId: 1,
  parentInstanceId: null,
  method: 'cutting' as const,
  status: 'started' as const,
  startedAt: '2026-01-01',
  rootedAt: null,
  readyAt: null,
  plantedAt: null,
  nickname: 'Test Prop',
  notes: null,
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
  plant: {
    id: 1,
    genus: 'Monstera',
    species: 'deliciosa',
    commonName: 'Monstera',
    family: 'Araceae',
    nativeRegion: null,
    careLevel: 'easy' as const,
    lightRequirement: 'bright_indirect' as const,
    wateringFrequency: 'weekly' as const,
    description: null,
    imageUrl: null,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
};

const statusLabels = [
  { status: 'started', label: 'Started' },
  { status: 'rooting', label: 'Rooting' },
  { status: 'ready', label: 'Ready' },
  { status: 'planted', label: 'Planted' },
] as const;

describe('PropagationCard status badge', () => {
  statusLabels.forEach(({ status, label }) => {
    it(`does not duplicate text for "${status}" status`, () => {
      const propagation = { ...basePropagation, status };
      renderWithProviders(
        <PropagationCard propagation={propagation} onUpdate={jest.fn()} />
      );

      // Find all elements containing this label text
      const badges = screen.getAllByText(label);
      
      // Ensure there's no duplicated/concatenated text like "StartedStart"
      const badgeTexts = badges.map(el => el.textContent);
      badgeTexts.forEach(text => {
        expect(text).toBe(label);
      });

      // The abbreviated forms should NOT appear anywhere
      const abbreviations: Record<string, string> = {
        Started: 'Start',
        Rooting: 'Root',
        Planted: 'Plant',
      };
      const abbrev = abbreviations[label];
      if (abbrev && abbrev !== label) {
        // Make sure no element has the concatenated text
        const allText = document.body.textContent || '';
        expect(allText).not.toContain(`${label}${abbrev}`);
      }
    });
  });
});
