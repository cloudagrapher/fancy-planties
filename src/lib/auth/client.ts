// Client-safe auth utilities
export interface User {
  id: number;
  email: string;
  name: string;
  isCurator: boolean;
  isEmailVerified: boolean;
}

export interface Session {
  id: string;
  userId: number;
  expiresAt: Date;
}

// Session security helpers (client-safe)
export function getSessionSecurityInfo(request: Request) {
  const userAgent = request.headers.get('user-agent') || 'Unknown';
  const ip = request.headers.get('x-forwarded-for') || 
            request.headers.get('x-real-ip') || 
            'Unknown';
  
  return {
    userAgent,
    ip,
    timestamp: new Date().toISOString(),
  };
}

// Session activity tracking (for future security features)
export interface SessionActivity {
  sessionId: string;
  userId: number;
  action: string;
  ip: string;
  userAgent: string;
  timestamp: Date;
}

// Auth state types for client components
export interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

// Client-side auth API calls
export async function signInClient(email: string, password: string): Promise<{ user: User; session: Session }> {
  const response = await fetch('/api/auth/signin', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || 'Sign in failed');
  }

  return response.json();
}

export async function signUpClient(email: string, password: string, name: string): Promise<{ user: User; session: Session }> {
  const response = await fetch('/api/auth/signup', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password, name }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || 'Sign up failed');
  }

  return response.json();
}

export async function signOutClient(): Promise<void> {
  const response = await fetch('/api/auth/signout', {
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error('Sign out failed');
  }
}

export async function getCurrentUser(): Promise<{ user: User; session: Session } | null> {
  try {
    const response = await fetch('/api/user/me');
    
    if (!response.ok) {
      return null;
    }

    return response.json();
  } catch (error) {
    console.error('Failed to get current user:', error);
    return null;
  }
}

// Curator status utilities for client components
export async function checkCuratorStatus(): Promise<{ isCurator: boolean; isAuthenticated: boolean; isVerified: boolean }> {
  try {
    const response = await fetch('/api/auth/curator-status');
    
    if (!response.ok) {
      return { isCurator: false, isAuthenticated: false, isVerified: false };
    }

    return response.json();
  } catch (error) {
    console.error('Failed to check curator status:', error);
    return { isCurator: false, isAuthenticated: false, isVerified: false };
  }
}

// Helper to check if user object has curator privileges
export function isUserCurator(user: User | null): boolean {
  return !!(user && user.isCurator);
}