'use client';

import { useState, useCallback } from 'react';
import type { PlantSuggestion } from '@/lib/validation/plant-schemas';

interface UsePlantSelectionOptions {
  initialPlant?: PlantSuggestion | null;
  onSelectionChange?: (plant: PlantSuggestion | null) => void;
}

interface UsePlantSelectionReturn {
  selectedPlant: PlantSuggestion | null;
  selectPlant: (plant: PlantSuggestion | null) => void;
  clearSelection: () => void;
  isSelected: (plantId: number) => boolean;
}

export function usePlantSelection({
  initialPlant = null,
  onSelectionChange,
}: UsePlantSelectionOptions = {}): UsePlantSelectionReturn {
  const [selectedPlant, setSelectedPlant] = useState<PlantSuggestion | null>(initialPlant);

  const selectPlant = useCallback((plant: PlantSuggestion | null) => {
    setSelectedPlant(plant);
    onSelectionChange?.(plant);
  }, [onSelectionChange]);

  const clearSelection = useCallback(() => {
    selectPlant(null);
  }, [selectPlant]);

  const isSelected = useCallback((plantId: number) => {
    return selectedPlant?.id === plantId;
  }, [selectedPlant]);

  return {
    selectedPlant,
    selectPlant,
    clearSelection,
    isSelected,
  };
}

// Hook for managing multiple plant selections
interface UseMultiplePlantSelectionOptions {
  initialPlants?: PlantSuggestion[];
  maxSelections?: number;
  onSelectionChange?: (plants: PlantSuggestion[]) => void;
}

interface UseMultiplePlantSelectionReturn {
  selectedPlants: PlantSuggestion[];
  selectPlant: (plant: PlantSuggestion) => void;
  deselectPlant: (plantId: number) => void;
  togglePlant: (plant: PlantSuggestion) => void;
  clearSelections: () => void;
  isSelected: (plantId: number) => boolean;
  canSelectMore: boolean;
  selectionCount: number;
}

export function useMultiplePlantSelection({
  initialPlants = [],
  maxSelections,
  onSelectionChange,
}: UseMultiplePlantSelectionOptions = {}): UseMultiplePlantSelectionReturn {
  const [selectedPlants, setSelectedPlants] = useState<PlantSuggestion[]>(initialPlants);

  const selectPlant = useCallback((plant: PlantSuggestion) => {
    setSelectedPlants(prev => {
      // Don't add if already selected
      if (prev.some(p => p.id === plant.id)) {
        return prev;
      }

      // Don't add if at max capacity
      if (maxSelections && prev.length >= maxSelections) {
        return prev;
      }

      const newSelection = [...prev, plant];
      onSelectionChange?.(newSelection);
      return newSelection;
    });
  }, [maxSelections, onSelectionChange]);

  const deselectPlant = useCallback((plantId: number) => {
    setSelectedPlants(prev => {
      const newSelection = prev.filter(p => p.id !== plantId);
      onSelectionChange?.(newSelection);
      return newSelection;
    });
  }, [onSelectionChange]);

  const togglePlant = useCallback((plant: PlantSuggestion) => {
    setSelectedPlants(prev => {
      const isCurrentlySelected = prev.some(p => p.id === plant.id);
      
      if (isCurrentlySelected) {
        const newSelection = prev.filter(p => p.id !== plant.id);
        onSelectionChange?.(newSelection);
        return newSelection;
      } else {
        // Don't add if at max capacity
        if (maxSelections && prev.length >= maxSelections) {
          return prev;
        }

        const newSelection = [...prev, plant];
        onSelectionChange?.(newSelection);
        return newSelection;
      }
    });
  }, [maxSelections, onSelectionChange]);

  const clearSelections = useCallback(() => {
    setSelectedPlants([]);
    onSelectionChange?.([]);
  }, [onSelectionChange]);

  const isSelected = useCallback((plantId: number) => {
    return selectedPlants.some(p => p.id === plantId);
  }, [selectedPlants]);

  const canSelectMore = !maxSelections || selectedPlants.length < maxSelections;
  const selectionCount = selectedPlants.length;

  return {
    selectedPlants,
    selectPlant,
    deselectPlant,
    togglePlant,
    clearSelections,
    isSelected,
    canSelectMore,
    selectionCount,
  };
}