'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { useState } from 'react';

interface NavigationItem {
  id: string;
  label: string;
  icon: string;
  href: string;
  badge?: number;
}

interface BottomNavigationProps {
  careNotificationCount?: number;
}

export default function BottomNavigation({ careNotificationCount = 0 }: BottomNavigationProps) {
  const pathname = usePathname();
  const { triggerHaptic } = useHapticFeedback();
  const [pressedItem, setPressedItem] = useState<string | null>(null);

  const navigationItems: NavigationItem[] = [
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
      label: 'Propagations',
      icon: '🌿',
      href: '/dashboard/propagations',
    },
    {
      id: 'handbook',
      label: 'Handbook',
      icon: '📖',
      href: '/dashboard/handbook',
    },
  ];

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

  return (
    <nav className="bottom-nav">
      <div className="bottom-nav-container">
        {navigationItems.map((item) => (
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
                >
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </div>
            <span className="bottom-nav-label">
              {item.label}
            </span>
          </Link>
        ))}
      </div>
    </nav>
  );
}