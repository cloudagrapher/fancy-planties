'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { virtualScrolling } from '@/lib/utils/performance';

interface VirtualScrollTableProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number, isVisible: boolean) => React.ReactNode;
  className?: string;
  overscan?: number;
}

export function VirtualScrollTable<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  className = '',
  overscan = 5,
}: VirtualScrollTableProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const scrollElementRef = useRef<HTMLDivElement>(null);

  const { startIndex, endIndex, visibleCount } = virtualScrolling.calculateVisibleItems(
    scrollTop,
    containerHeight,
    itemHeight,
    items.length,
    overscan
  );

  const handleScroll = useCallback(
    virtualScrolling.createScrollHandler((scrollTop: number) => {
      setScrollTop(scrollTop);
    }),
    []
  );

  useEffect(() => {
    const scrollElement = scrollElementRef.current;
    if (!scrollElement) return;

    const onScroll = () => {
      handleScroll(scrollElement.scrollTop);
    };

    scrollElement.addEventListener('scroll', onScroll, { passive: true });
    return () => scrollElement.removeEventListener('scroll', onScroll);
  }, [handleScroll]);

  const totalHeight = items.length * itemHeight;
  const offsetY = startIndex * itemHeight;

  return (
    <div
      ref={scrollElementRef}
      className={`virtual-scroll-container ${className}`}
      style={{
        height: containerHeight,
        overflow: 'auto',
        position: 'relative'
      }}
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
          {items.slice(startIndex, endIndex + 1).map((item, index) => {
            const actualIndex = startIndex + index;
            return (
              <div
                key={actualIndex}
                style={{ height: itemHeight }}
                className="virtual-scroll-item"
              >
                {renderItem(item, actualIndex, true)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface VirtualTableRowProps {
  children: React.ReactNode;
  height: number;
  className?: string;
}

export function VirtualTableRow({ children, height, className = '' }: VirtualTableRowProps) {
  return (
    <tr
      className={`virtual-table-row ${className}`}
      style={{ height }}
    >
      {children}
    </tr>
  );
}