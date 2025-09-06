'use client';

import { createContext, useContext } from 'react';
import type { User } from '@/lib/auth';

interface UserContextType {
  user: User | null;
}

const UserContext = createContext<UserContextType>({ user: null });

interface UserProviderProps {
  user: User | null;
  children: React.ReactNode;
}

export function UserProvider({ user, children }: UserProviderProps) {
  return (
    <UserContext.Provider value={{ user }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}