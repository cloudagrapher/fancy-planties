'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { virtualScrolling } from '@/lib/utils/performance';

interface VirtualScrollListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
  overscan?: number;
  onScroll?: (scrollTop: number) => void;
}

export function VirtualScrollList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  className = '',
  overscan = 5,
  onScroll,
}: VirtualScrollListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const scrollElementRef = useRef<HTMLDivElement>(null);

  // Calculate visible items
  const { startIndex, endIndex, visibleCount } = useMemo(() => {
    return virtualScrolling.calculateVisibleItems(
      scrollTop,
      containerHeight,
      itemHeight,
      items.length,
      overscan
    );
  }, [scrollTop, containerHeight, itemHeight, items.length, overscan]);

  // Create debounced scroll handler
  const debouncedScrollHandler = useMemo(() => {
    return virtualScrolling.createScrollHandler((newScrollTop) => {
      setScrollTop(newScrollTop);
      onScroll?.(newScrollTop);
    });
  }, [onScroll]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    debouncedScrollHandler(target.scrollTop);
  }, [debouncedScrollHandler]);

  // Calculate total height and offset
  const totalHeight = items.length * itemHeight;
  const offsetY = startIndex * itemHeight;

  // Get visible items
  const visibleItems = items.slice(startIndex, endIndex + 1);

  return (
    <div
      ref={scrollElementRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
          }}
        >
          {visibleItems.map((item, index) => (
            <div
              key={startIndex + index}
              style={{ height: itemHeight }}
              className="flex-shrink-0"
            >
              {renderItem(item, startIndex + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface VirtualGridProps<T> {
  items: T[];
  itemWidth: number;
  itemHeight: number;
  containerWidth: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
  gap?: number;
  overscan?: number;
}

export function VirtualGrid<T>({
  items,
  itemWidth,
  itemHeight,
  containerWidth,
  containerHeight,
  renderItem,
  className = '',
  gap = 16,
  overscan = 5,
}: VirtualGridProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);

  // Calculate grid dimensions
  const columnsPerRow = Math.floor((containerWidth + gap) / (itemWidth + gap));
  const totalRows = Math.ceil(items.length / columnsPerRow);
  const rowHeight = itemHeight + gap;

  // Calculate visible rows
  const { startIndex: startRow, endIndex: endRow } = useMemo(() => {
    return virtualScrolling.calculateVisibleItems(
      scrollTop,
      containerHeight,
      rowHeight,
      totalRows,
      overscan
    );
  }, [scrollTop, containerHeight, rowHeight, totalRows, overscan]);

  // Create debounced scroll handler
  const debouncedScrollHandler = useMemo(() => {
    return virtualScrolling.createScrollHandler(setScrollTop);
  }, []);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    debouncedScrollHandler(target.scrollTop);
  }, [debouncedScrollHandler]);

  // Calculate visible items
  const startItemIndex = startRow * columnsPerRow;
  const endItemIndex = Math.min((endRow + 1) * columnsPerRow - 1, items.length - 1);
  const visibleItems = items.slice(startItemIndex, endItemIndex + 1);

  // Calculate total height and offset
  const totalHeight = totalRows * rowHeight;
  const offsetY = startRow * rowHeight;

  return (
    <div
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            display: 'grid',
            gridTemplateColumns: `repeat(${columnsPerRow}, ${itemWidth}px)`,
            gap: `${gap}px`,
            justifyContent: 'center',
          }}
        >
          {visibleItems.map((item, index) => (
            <div key={startItemIndex + index}>
              {renderItem(item, startItemIndex + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Hook for virtual scrolling
export function useVirtualScroll<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
  overscan: number = 5
) {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleRange = useMemo(() => {
    return virtualScrolling.calculateVisibleItems(
      scrollTop,
      containerHeight,
      itemHeight,
      items.length,
      overscan
    );
  }, [scrollTop, containerHeight, itemHeight, items.length, overscan]);

  const scrollHandler = useMemo(() => {
    return virtualScrolling.createScrollHandler(setScrollTop);
  }, []);

  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.startIndex, visibleRange.endIndex + 1);
  }, [items, visibleRange.startIndex, visibleRange.endIndex]);

  return {
    visibleItems,
    visibleRange,
    scrollHandler,
    totalHeight: items.length * itemHeight,
    offsetY: visibleRange.startIndex * itemHeight,
  };
}