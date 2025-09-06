import { redirect } from 'next/navigation';
import { getAuthSession } from '@/lib/auth/server';

export default async function Home() {
  const { user } = await getAuthSession();
  
  // Redirect based on authentication status
  if (user) {
    redirect('/dashboard');
  } else {
    redirect('/auth/signin');
  }
}