'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

interface AdminNavigationItem {
  id: string;
  label: string;
  icon: string;
  href: string;
  badge?: number;
}

export default function AdminNavigation() {
  const pathname = usePathname();
  const [pendingApprovals, setPendingApprovals] = useState(0);

  // Fetch pending approval count
  useEffect(() => {
    const fetchPendingCount = async () => {
      try {
        const response = await fetch('/api/admin/pending-count');
        if (response.ok) {
          const data = await response.json();
          setPendingApprovals(data.count || 0);
        }
      } catch (error) {
        console.error('Failed to fetch pending approvals:', error);
      }
    };

    fetchPendingCount();
    // Refresh count every 30 seconds
    const interval = setInterval(fetchPendingCount, 30000);
    return () => clearInterval(interval);
  }, []);

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