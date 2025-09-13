'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';

export interface VirtualScrollOptions {
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}

export interface VirtualScrollResult {
  startIndex: number;
  endIndex: number;
  visibleItems: number;
  totalHeight: number;
  offsetY: number;
}

export function useVirtualScroll(
  itemCount: number,
  options: VirtualScrollOptions
): VirtualScrollResult & {
  scrollElementProps: {
    style: React.CSSProperties;
    onScroll: (e: React.UIEvent<HTMLElement>) => void;
  };
} {
  const { itemHeight, containerHeight, overscan = 5 } = options;
  const [scrollTop, setScrollTop] = useState(0);

  const handleScroll = useCallback((e: React.UIEvent<HTMLElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const result = useMemo(() => {
    const visibleItems = Math.ceil(containerHeight / itemHeight);
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      itemCount - 1,
      startIndex + visibleItems + overscan * 2
    );
    const totalHeight = itemCount * itemHeight;
    const offsetY = startIndex * itemHeight;

    return {
      startIndex,
      endIndex,
      visibleItems,
      totalHeight,
      offsetY,
    };
  }, [scrollTop, itemCount, itemHeight, containerHeight, overscan]);

  const scrollElementProps = useMemo(
    () => ({
      style: {
        height: containerHeight,
        overflow: 'auto' as const,
      },
      onScroll: handleScroll,
    }),
    [containerHeight, handleScroll]
  );

  return {
    ...result,
    scrollElementProps,
  };
}

export interface VirtualTableRowProps {
  index: number;
  style: React.CSSProperties;
  children: React.ReactNode;
}

export function VirtualTableRow({ index, style, children }: VirtualTableRowProps) {
  const rowStyle: React.CSSProperties = {
    ...style,
    position: 'absolute',
    left: 0,
    right: 0,
  };

  return (
    <div style={rowStyle} data-index={index}>
      {children}
    </div>
  );
}