'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface LogoutButtonProps {
  className?: string;
  children?: React.ReactNode;
}

export default function LogoutButton({ 
  className = "text-red-600 hover:text-red-700 transition-colors",
  children = "Sign Out"
}: LogoutButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/auth/signout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        // Redirect to sign in page
        router.push('/auth/signin');
        router.refresh();
      } else {
        console.error('Logout failed');
        // Still redirect on failure to ensure user is logged out client-side
        router.push('/auth/signin');
        router.refresh();
      }
    } catch (error) {
      console.error('Logout error:', error);
      // Still redirect on error to ensure user is logged out client-side
      router.push('/auth/signin');
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={isLoading}
      className={className}
    >
      {isLoading ? 'Signing out...' : children}
    </button>
  );
}