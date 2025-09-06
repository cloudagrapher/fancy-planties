'use client';


import Link from 'next/link';
import { usePathname } from 'next/navigation';

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
  ];

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(href);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 z-50">
      <div className="max-w-md mx-auto">
        <div className="flex justify-around items-center">
          {navigationItems.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className={`
                relative flex flex-col items-center justify-center p-2 rounded-lg transition-colors
                ${isActive(item.href)
                  ? 'text-primary-600 bg-primary-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }
              `}
            >
              <div className="relative">
                <span className="text-xl mb-1 block">{item.icon}</span>
                {item.badge && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}