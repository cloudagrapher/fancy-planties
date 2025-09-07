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
      id: 'dashboard',
      label: 'Dashboard',
      icon: '🏠',
      href: '/dashboard',
    },
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
    <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 px-4 py-2 z-50 safe-area-pb">
      <div className="max-w-md mx-auto">
        <div className="flex justify-around items-center">
          {navigationItems.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className={`
                relative flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-200
                min-h-[60px] min-w-[60px] touch-manipulation
                ${isActive(item.href)
                  ? 'text-primary-600 bg-primary-100 scale-105'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }
                ${pressedItem === item.id ? 'scale-95 bg-gray-100' : ''}
              `}
              onTouchStart={() => handleNavPress(item.id)}
              onMouseDown={() => handleNavPress(item.id)}
            >
              <div className="relative">
                <span className={`text-2xl mb-1 block transition-transform ${isActive(item.href) ? 'scale-110' : ''}`}>
                  {item.icon}
                </span>
                {item.badge && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium animate-pulse">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
              <span className={`text-xs font-medium transition-all ${isActive(item.href) ? 'font-semibold' : ''}`}>
                {item.label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}