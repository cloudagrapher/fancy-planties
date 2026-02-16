'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';

interface AdminNavigationItem {
  id: string;
  label: string;
  icon: string;
  href: string;
  badge?: number;
}

export default function AdminNavigation() {
  const pathname = usePathname();

  // Fetch pending approval count — shared cache with BottomNavigation (same queryKey)
  const { data: pendingData } = useQuery({
    queryKey: ['admin-pending-count'],
    queryFn: async () => {
      const response = await apiFetch('/api/admin/pending-count');
      if (!response.ok) return { count: 0 };
      return response.json() as Promise<{ count: number }>;
    },
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 30,
  });

  const pendingApprovals = pendingData?.count ?? 0;

  const navigationItems: AdminNavigationItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: '📊',
      href: '/admin',
    },
    {
      id: 'users',
      label: 'Users',
      icon: '👥',
      href: '/admin/users',
    },
    {
      id: 'plants',
      label: 'Plants',
      icon: '🌱',
      href: '/admin/plants',
    },
    {
      id: 'pending',
      label: 'Pending',
      icon: '⏳',
      href: '/admin/plants/pending',
      badge: pendingApprovals > 0 ? pendingApprovals : undefined,
    },
    {
      id: 'taxonomy',
      label: 'Taxonomy',
      icon: '🔬',
      href: '/admin/taxonomy',
    },
    {
      id: 'audit',
      label: 'Audit',
      icon: '📋',
      href: '/admin/audit',
    },
  ];

  const isActive = (href: string) => {
    if (href === '/admin') {
      return pathname === '/admin';
    }
    return pathname.startsWith(href);
  };

  return (
    <nav className="admin-nav">
      <div className="admin-nav-header">
        <h2>Admin Panel</h2>
        <Link href="/dashboard" className="admin-nav-back">
          ← Back to App
        </Link>
      </div>
      
      <div className="admin-nav-items">
        {navigationItems.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className={`
              admin-nav-item
              ${isActive(item.href) ? 'admin-nav-item--active' : ''}
            `}
          >
            <span className="admin-nav-icon">{item.icon}</span>
            <span className="admin-nav-label">{item.label}</span>
            {item.badge && (
              <span className="admin-nav-badge">
                {item.badge > 99 ? '99+' : item.badge}
              </span>
            )}
          </Link>
        ))}
      </div>
    </nav>
  );
}