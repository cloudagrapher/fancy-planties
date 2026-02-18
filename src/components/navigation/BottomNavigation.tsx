'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { useState } from 'react';

interface NavigationItem {
  id: string;
  label: string;
  icon: string;
  href: string;
  badge?: number;
  requiresCurator?: boolean;
}

interface BottomNavigationProps {
  careNotificationCount?: number;
}

export default function BottomNavigation({ careNotificationCount = 0 }: BottomNavigationProps) {
  const pathname = usePathname();
  const { triggerHaptic } = useHapticFeedback();
  const [pressedItem, setPressedItem] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Check curator status — shared cache with DashboardClient (same queryKey)
  const { data: curatorData } = useQuery({
    queryKey: ['curator-status'],
    queryFn: async () => {
      const response = await apiFetch('/api/auth/curator-status');
      if (!response.ok) return { isCurator: false };
      return response.json() as Promise<{ isCurator: boolean }>;
    },
    staleTime: 1000 * 60 * 30, // 30 minutes — curator status rarely changes
    gcTime: 1000 * 60 * 30,
    retry: 1,
  });

  const isCurator = curatorData?.isCurator ?? false;

  // Fetch pending approval count — only when user is a curator
  const { data: pendingData } = useQuery({
    queryKey: ['admin-pending-count'],
    queryFn: async () => {
      const response = await apiFetch('/api/admin/pending-count');
      if (!response.ok) return { count: 0 };
      return response.json() as Promise<{ count: number }>;
    },
    enabled: isCurator,
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 1000 * 30, // Poll every 30 seconds
    gcTime: 1000 * 60 * 5,
    retry: 1,
  });

  const pendingApprovals = pendingData?.count ?? 0;

  const allNavigationItems: NavigationItem[] = [
    {
      id: 'plants',
      label: 'Plants',
      icon: '🌱',
      href: '/dashboard/plants',
    },
    {
      id: 'care',
      label: 'Care',
      icon: '💧',
      href: '/dashboard/care',
      badge: careNotificationCount > 0 ? careNotificationCount : undefined,
    },
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: '🏠',
      href: '/dashboard',
    },
    {
      id: 'propagations',
      label: 'Propag.',
      icon: '🌿',
      href: '/dashboard/propagations',
    },
    {
      id: 'handbook',
      label: 'Handbook',
      icon: '📖',
      href: '/dashboard/handbook',
    },
    {
      id: 'admin',
      label: 'Admin',
      icon: '⚙️',
      href: '/admin',
      requiresCurator: true,
      badge: pendingApprovals > 0 ? pendingApprovals : undefined,
    },
  ];

  // Filter items based on curator status and create primary/overflow items
  const visibleItems = allNavigationItems.filter(item => 
    !item.requiresCurator || isCurator
  );

  // Show first 4 items directly, rest in burger menu
  const primaryItems = visibleItems.slice(0, 4);
  const overflowItems = visibleItems.slice(4);

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(href);
  };

  const handleNavPress = (itemId: string) => {
    triggerHaptic('selection');
    setPressedItem(itemId);
    setTimeout(() => setPressedItem(null), 150);
  };

  const toggleMenu = () => {
    triggerHaptic('selection');
    setIsMenuOpen(!isMenuOpen);
  };

  const renderNavItem = (item: NavigationItem) => (
    <Link
      key={item.id}
      href={item.href}
      className={`
        bottom-nav-item
        ${isActive(item.href) ? 'bottom-nav-item--active' : 'bottom-nav-item--inactive'}
        ${pressedItem === item.id ? 'bottom-nav-item--pressed' : ''}
      `}
      onTouchStart={() => handleNavPress(item.id)}
      onMouseDown={() => handleNavPress(item.id)}
      onClick={() => setIsMenuOpen(false)}
      aria-label={`Navigate to ${item.label}${item.badge ? ` (${item.badge} notifications)` : ''}`}
      title={`Navigate to ${item.label}${item.badge ? ` (${item.badge} notifications)` : ''}`}
    >
      <div className="relative">
        <span className="bottom-nav-icon" aria-hidden="true">
          {item.icon}
        </span>
        {item.badge && (
          <span 
            className="bottom-nav-badge"
            role="status"
            aria-label={`${item.badge} notifications`}
            suppressHydrationWarning
          >
            {item.badge > 99 ? '99+' : item.badge}
          </span>
        )}
      </div>
      <span className="bottom-nav-label">
        {item.label}
      </span>
    </Link>
  );

  return (
    <nav className="bottom-nav">
      <div className="bottom-nav-container">
        {primaryItems.map((item) => renderNavItem(item))}
        
        {overflowItems.length > 0 && (
          <div className="bottom-nav-burger">
            <button
              className={`
                bottom-nav-item bottom-nav-burger-button
                ${isMenuOpen ? 'bottom-nav-item--active' : 'bottom-nav-item--inactive'}
              `}
              onClick={toggleMenu}
              aria-label="More navigation options"
              aria-expanded={isMenuOpen}
            >
              <span className="bottom-nav-icon">☰</span>
              <span className="bottom-nav-label">More</span>
            </button>
            
            {isMenuOpen && (
              <div className="bottom-nav-overflow-menu">
                {overflowItems.map((item) => renderNavItem(item))}
              </div>
            )}
          </div>
        )}
      </div>
      
      {isMenuOpen && (
        <div 
          className="bottom-nav-overlay"
          onClick={() => setIsMenuOpen(false)}
          aria-hidden="true"
        />
      )}
    </nav>
  );
}
