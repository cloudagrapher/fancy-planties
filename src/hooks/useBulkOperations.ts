'use client';

import { useState, useCallback } from 'react';

export interface BulkOperationProgress<T = any> {
  total: number;
  completed: number;
  failed: number;
  errors: Array<{ id: T; error: string }>;
  isRunning: boolean;
}

export interface UseBulkOperationsReturn<T> {
  selectedItems: Set<T>;
  selectItem: (id: T) => void;
  selectAll: (items: T[]) => void;
  clearSelection: () => void;
  isSelected: (id: T) => boolean;
  selectedCount: number;
  progress: BulkOperationProgress<T> | null;
  executeBulkOperation: (
    operation: (ids: T[]) => Promise<{ success: boolean; errors?: Array<{ id: T; error: string }> }>
  ) => Promise<void>;
}

export function useBulkOperations<T = number>(): UseBulkOperationsReturn<T> {
  const [selectedItems, setSelectedItems] = useState<Set<T>>(new Set());
  const [progress, setProgress] = useState<BulkOperationProgress<T> | null>(null);

  const selectItem = useCallback((id: T) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const selectAll = useCallback((items: T[]) => {
    setSelectedItems(new Set(items));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedItems(new Set());
  }, []);

  const isSelected = useCallback((id: T) => {
    return selectedItems.has(id);
  }, [selectedItems]);

  const executeBulkOperation = useCallback(async (
    operation: (ids: T[]) => Promise<{ success: boolean; errors?: Array<{ id: T; error: string }> }>
  ) => {
    const ids = Array.from(selectedItems);
    if (ids.length === 0) return;

    setProgress({
      total: ids.length,
      completed: 0,
      failed: 0,
      errors: [],
      isRunning: true,
    });

    try {
      const result = await operation(ids);
      
      setProgress(prev => prev ? {
        ...prev,
        completed: prev.total - (result.errors?.length || 0),
        failed: result.errors?.length || 0,
        errors: result.errors?.map(e => ({ id: e.id, error: e.error })) || [],
        isRunning: false,
      } : null);

      // Clear selection if operation was successful
      if (result.success) {
        setSelectedItems(new Set());
      }
    } catch (error) {
      setProgress(prev => prev ? {
        ...prev,
        failed: prev.total,
        errors: ids.map(id => ({ id, error: 'Operation failed' })),
        isRunning: false,
      } : null);
    }
  }, [selectedItems]);

  return {
    selectedItems,
    selectItem,
    selectAll,
    clearSelection,
    isSelected,
    selectedCount: selectedItems.size,
    progress,
    executeBulkOperation,
  };
}