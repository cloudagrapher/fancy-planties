import { redirect } from 'next/navigation';
import { requireAuthSession } from '@/lib/auth/session';

interface AuthGuardProps {
  children: React.ReactNode;
  redirectTo?: string;
}

export default async function AuthGuard({ 
  children, 
  redirectTo = '/auth/signin' 
}: AuthGuardProps) {
  try {
    await requireAuthSession();
    return <>{children}</>;
  } catch {
    // If authentication fails, redirect to sign in
    redirect(redirectTo);
  }
}