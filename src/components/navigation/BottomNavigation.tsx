'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { useState, useEffect } from 'react';

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
  const [isCurator, setIsCurator] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [pendingApprovals, setPendingApprovals] = useState(0);

  // Check curator status on mount
  useEffect(() => {
    const checkCuratorStatus = async () => {
      try {
        const response = await fetch('/api/auth/curator-status');
        if (response.ok) {
          const data = await response.json();
          setIsCurator(data.isCurator);
          
          // If user is curator, fetch pending approval count
          if (data.isCurator) {
            const pendingResponse = await fetch('/api/admin/pending-count');
            if (pendingResponse.ok) {
              const pendingData = await pendingResponse.json();
              setPendingApprovals(pendingData.count || 0);
            }
          }
        }
      } catch (error) {
        console.error('Failed to check curator status:', error);
      }
    };

    checkCuratorStatus();
  }, []);
  
  // Refresh pending count every 30 seconds — only runs when user is a curator
  useEffect(() => {
    if (!isCurator) return;
    
    const interval = setInterval(() => {
      fetch('/api/admin/pending-count')
        .then(response => response.ok ? response.json() : null)
        .then(data => {
          if (data) {
            setPendingApprovals(data.count || 0);
          }
        })
        .catch(error => console.error('Failed to refresh pending count:', error));
    }, 30000);

    return () => clearInterval(interval);
  }, [isCurator]);

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
