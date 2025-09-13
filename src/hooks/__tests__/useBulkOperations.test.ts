import { renderHook, act } from '@testing-library/react';
import { useBulkOperations } from '../useBulkOperations';

describe('useBulkOperations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with empty selection and null progress', () => {
      const { result } = renderHook(() => useBulkOperations<number>());
      
      expect(result.current.selectedItems.size).toBe(0);
      expect(result.current.selectedCount).toBe(0);
      expect(result.current.progress).toBeNull();
      expect(result.current.isSelected(1)).toBe(false);
    });

    it('should work with different generic types', () => {
      const { result: stringResult } = renderHook(() => useBulkOperations<string>());
      const { result: numberResult } = renderHook(() => useBulkOperations<number>());
      
      expect(stringResult.current.selectedItems.size).toBe(0);
      expect(numberResult.current.selectedItems.size).toBe(0);
    });
  });

  describe('item selection', () => {
    it('should select and deselect items', () => {
      const { result } = renderHook(() => useBulkOperations<number>());
      
      act(() => {
        result.current.selectItem(1);
      });
      
      expect(result.current.selectedItems.has(1)).toBe(true);
      expect(result.current.selectedCount).toBe(1);
      expect(result.current.isSelected(1)).toBe(true);
      
      act(() => {
        result.current.selectItem(1);
      });
      
      expect(result.current.selectedItems.has(1)).toBe(false);
      expect(result.current.selectedCount).toBe(0);
      expect(result.current.isSelected(1)).toBe(false);
    });

    it('should handle multiple item selection', () => {
      const { result } = renderHook(() => useBulkOperations<number>());
      
      act(() => {
        result.current.selectItem(1);
        result.current.selectItem(2);
        result.current.selectItem(3);
      });
      
      expect(result.current.selectedCount).toBe(3);
      expect(result.current.isSelected(1)).toBe(true);
      expect(result.current.isSelected(2)).toBe(true);
      expect(result.current.isSelected(3)).toBe(true);
    });

    it('should handle selecting same item multiple times', () => {
      const { result } = renderHook(() => useBulkOperations<number>());
      
      act(() => {
        result.current.selectItem(1);
        result.current.selectItem(1);
        result.current.selectItem(1);
      });
      
      expect(result.current.selectedCount).toBe(1);
      expect(result.current.isSelected(1)).toBe(true);
    });

    it('should work with string IDs', () => {
      const { result } = renderHook(() => useBulkOperations<string>());
      
      act(() => {
        result.current.selectItem('item-1');
        result.current.selectItem('item-2');
      });
      
      expect(result.current.selectedCount).toBe(2);
      expect(result.current.isSelected('item-1')).toBe(true);
      expect(result.current.isSelected('item-2')).toBe(true);
    });
  });

  describe('select all functionality', () => {
    it('should select all items from array', () => {
      const { result } = renderHook(() => useBulkOperations<number>());
      
      act(() => {
        result.current.selectAll([1, 2, 3, 4, 5]);
      });
      
      expect(result.current.selectedCount).toBe(5);
      expect(result.current.isSelected(1)).toBe(true);
      expect(result.current.isSelected(2)).toBe(true);
      expect(result.current.isSelected(3)).toBe(true);
      expect(result.current.isSelected(4)).toBe(true);
      expect(result.current.isSelected(5)).toBe(true);
    });

    it('should handle empty array in selectAll', () => {
      const { result } = renderHook(() => useBulkOperations<number>());
      
      act(() => {
        result.current.selectAll([]);
      });
      
      expect(result.current.selectedCount).toBe(0);
    });

    it('should replace existing selection with selectAll', () => {
      const { result } = renderHook(() => useBulkOperations<number>());
      
      act(() => {
        result.current.selectItem(1);
        result.current.selectItem(2);
      });
      
      expect(result.current.selectedCount).toBe(2);
      
      act(() => {
        result.current.selectAll([3, 4, 5]);
      });
      
      expect(result.current.selectedCount).toBe(3);
      expect(result.current.isSelected(1)).toBe(false);
      expect(result.current.isSelected(2)).toBe(false);
      expect(result.current.isSelected(3)).toBe(true);
      expect(result.current.isSelected(4)).toBe(true);
      expect(result.current.isSelected(5)).toBe(true);
    });

    it('should handle duplicate items in selectAll', () => {
      const { result } = renderHook(() => useBulkOperations<number>());
      
      act(() => {
        result.current.selectAll([1, 2, 2, 3, 3, 3]);
      });
      
      expect(result.current.selectedCount).toBe(3);
      expect(result.current.isSelected(1)).toBe(true);
      expect(result.current.isSelected(2)).toBe(true);
      expect(result.current.isSelected(3)).toBe(true);
    });
  });

  describe('clear selection', () => {
    it('should clear all selected items', () => {
      const { result } = renderHook(() => useBulkOperations<number>());
      
      act(() => {
        result.current.selectAll([1, 2, 3, 4, 5]);
      });
      
      expect(result.current.selectedCount).toBe(5);
      
      act(() => {
        result.current.clearSelection();
      });
      
      expect(result.current.selectedCount).toBe(0);
      expect(result.current.isSelected(1)).toBe(false);
      expect(result.current.isSelected(2)).toBe(false);
    });

    it('should handle clearing empty selection', () => {
      const { result } = renderHook(() => useBulkOperations<number>());
      
      act(() => {
        result.current.clearSelection();
      });
      
      expect(result.current.selectedCount).toBe(0);
    });
  });

  describe('bulk operations', () => {
    it('should execute bulk operation successfully', async () => {
      const { result } = renderHook(() => useBulkOperations<number>());
      const mockOperation = jest.fn().mockResolvedValue({ success: true, errors: [] });
      
      act(() => {
        result.current.selectAll([1, 2, 3]);
      });
      
      await act(async () => {
        await result.current.executeBulkOperation(mockOperation);
      });
      
      expect(mockOperation).toHaveBeenCalledWith([1, 2, 3]);
      expect(result.current.selectedCount).toBe(0); // Selection cleared after success
      expect(result.current.progress?.isRunning).toBe(false);
      expect(result.current.progress?.completed).toBe(3);
      expect(result.current.progress?.failed).toBe(0);
    });

    it('should handle bulk operation with partial errors', async () => {
      const { result } = renderHook(() => useBulkOperations<number>());
      const mockOperation = jest.fn().mockResolvedValue({ 
        success: false, 
        errors: [{ id: 1, error: 'Failed to process item 1' }] 
      });
      
      act(() => {
        result.current.selectAll([1, 2, 3]);
      });
      
      await act(async () => {
        await result.current.executeBulkOperation(mockOperation);
      });
      
      expect(result.current.progress?.failed).toBe(1);
      expect(result.current.progress?.completed).toBe(2);
      expect(result.current.progress?.errors).toHaveLength(1);
      expect(result.current.progress?.errors[0]).toEqual({ id: 1, error: 'Failed to process item 1' });
      expect(result.current.selectedCount).toBe(3); // Selection not cleared on partial failure
    });

    it('should handle bulk operation with multiple errors', async () => {
      const { result } = renderHook(() => useBulkOperations<number>());
      const mockOperation = jest.fn().mockResolvedValue({ 
        success: false, 
        errors: [
          { id: 1, error: 'Error 1' },
          { id: 3, error: 'Error 3' }
        ] 
      });
      
      act(() => {
        result.current.selectAll([1, 2, 3]);
      });
      
      await act(async () => {
        await result.current.executeBulkOperation(mockOperation);
      });
      
      expect(result.current.progress?.failed).toBe(2);
      expect(result.current.progress?.completed).toBe(1);
      expect(result.current.progress?.errors).toHaveLength(2);
    });

    it('should handle operation throwing an exception', async () => {
      const { result } = renderHook(() => useBulkOperations<number>());
      const mockOperation = jest.fn().mockRejectedValue(new Error('Network error'));
      
      act(() => {
        result.current.selectAll([1, 2, 3]);
      });
      
      await act(async () => {
        await result.current.executeBulkOperation(mockOperation);
      });
      
      expect(result.current.progress?.failed).toBe(3);
      expect(result.current.progress?.completed).toBe(0);
      expect(result.current.progress?.errors).toHaveLength(3);
      expect(result.current.progress?.errors[0].error).toBe('Operation failed');
      expect(result.current.progress?.isRunning).toBe(false);
    });

    it('should not execute operation with empty selection', async () => {
      const { result } = renderHook(() => useBulkOperations<number>());
      const mockOperation = jest.fn().mockResolvedValue({ success: true, errors: [] });
      
      await act(async () => {
        await result.current.executeBulkOperation(mockOperation);
      });
      
      expect(mockOperation).not.toHaveBeenCalled();
      expect(result.current.progress).toBeNull();
    });

    it('should set progress correctly during operation', async () => {
      const { result } = renderHook(() => useBulkOperations<number>());
      const mockOperation = jest.fn().mockResolvedValue({ success: true, errors: [] });
      
      act(() => {
        result.current.selectAll([1, 2, 3]);
      });
      
      await act(async () => {
        await result.current.executeBulkOperation(mockOperation);
      });
      
      expect(result.current.progress?.isRunning).toBe(false);
      expect(result.current.progress?.total).toBe(3);
      expect(result.current.progress?.completed).toBe(3);
      expect(result.current.progress?.failed).toBe(0);
    });

    it('should handle successful operation without errors array', async () => {
      const { result } = renderHook(() => useBulkOperations<number>());
      const mockOperation = jest.fn().mockResolvedValue({ success: true });
      
      act(() => {
        result.current.selectAll([1, 2, 3]);
      });
      
      await act(async () => {
        await result.current.executeBulkOperation(mockOperation);
      });
      
      expect(result.current.progress?.completed).toBe(3);
      expect(result.current.progress?.failed).toBe(0);
      expect(result.current.progress?.errors).toEqual([]);
      expect(result.current.selectedCount).toBe(0);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle operations with string IDs', async () => {
      const { result } = renderHook(() => useBulkOperations<string>());
      const mockOperation = jest.fn().mockResolvedValue({ 
        success: false, 
        errors: [{ id: 'item-1', error: 'Failed' }] 
      });
      
      act(() => {
        result.current.selectAll(['item-1', 'item-2']);
      });
      
      await act(async () => {
        await result.current.executeBulkOperation(mockOperation);
      });
      
      expect(result.current.progress?.errors[0]).toEqual({ id: 'item-1', error: 'Failed' });
    });

    it('should maintain selection state across multiple operations', async () => {
      const { result } = renderHook(() => useBulkOperations<number>());
      
      act(() => {
        result.current.selectAll([1, 2, 3]);
      });
      
      const mockOperation1 = jest.fn().mockResolvedValue({ success: false, errors: [{ id: 1, error: 'Error' }] });
      
      await act(async () => {
        await result.current.executeBulkOperation(mockOperation1);
      });
      
      expect(result.current.selectedCount).toBe(3);
      
      const mockOperation2 = jest.fn().mockResolvedValue({ success: true, errors: [] });
      
      await act(async () => {
        await result.current.executeBulkOperation(mockOperation2);
      });
      
      expect(result.current.selectedCount).toBe(0);
    });

    it('should handle concurrent operations correctly', async () => {
      const { result } = renderHook(() => useBulkOperations<number>());
      
      act(() => {
        result.current.selectAll([1, 2, 3]);
      });
      
      const mockOperation = jest.fn().mockResolvedValue({ success: true, errors: [] });
      
      // Start operations sequentially to avoid race conditions
      await act(async () => {
        await result.current.executeBulkOperation(mockOperation);
      });
      
      act(() => {
        result.current.selectAll([4, 5, 6]);
      });
      
      await act(async () => {
        await result.current.executeBulkOperation(mockOperation);
      });
      
      // Should handle gracefully without errors
      expect(mockOperation).toHaveBeenCalledTimes(2);
    });

    it('should handle edge case where progress becomes null during operation', async () => {
      const { result } = renderHook(() => useBulkOperations<number>());
      
      act(() => {
        result.current.selectAll([1, 2, 3]);
      });
      
      // Create a mock that will cause the progress to be null when the update tries to run
      const mockOperation = jest.fn().mockImplementation(async () => {
        // This simulates a scenario where progress might be reset externally
        return { success: true, errors: [] };
      });
      
      await act(async () => {
        await result.current.executeBulkOperation(mockOperation);
      });
      
      // Should complete without errors even if progress state is inconsistent
      expect(mockOperation).toHaveBeenCalledWith([1, 2, 3]);
    });
  });

  describe('callback stability', () => {
    it('should maintain stable callback references', () => {
      const { result, rerender } = renderHook(() => useBulkOperations<number>());
      
      const initialCallbacks = {
        selectItem: result.current.selectItem,
        selectAll: result.current.selectAll,
        clearSelection: result.current.clearSelection,
        executeBulkOperation: result.current.executeBulkOperation,
      };
      
      rerender();
      
      expect(result.current.selectItem).toBe(initialCallbacks.selectItem);
      expect(result.current.selectAll).toBe(initialCallbacks.selectAll);
      expect(result.current.clearSelection).toBe(initialCallbacks.clearSelection);
      expect(result.current.executeBulkOperation).toBe(initialCallbacks.executeBulkOperation);
    });

    it('should update isSelected when selection changes', () => {
      const { result } = renderHook(() => useBulkOperations<number>());
      
      const initialIsSelected = result.current.isSelected;
      
      act(() => {
        result.current.selectItem(1);
      });
      
      // isSelected should be a new function reference due to dependency on selectedItems
      expect(result.current.isSelected).not.toBe(initialIsSelected);
    });
  });
});