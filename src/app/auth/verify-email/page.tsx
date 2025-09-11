import { requireAuthSession } from '@/lib/auth/server';
import { redirect } from 'next/navigation';
import EmailVerificationClient from './EmailVerificationClient';

export default async function VerifyEmailPage() {
  const { user } = await requireAuthSession('/auth/signin');
  
  // If user is already verified, redirect to dashboard
  if (user.isEmailVerified) {
    redirect('/dashboard');
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Verify your email
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            We've sent a verification code to{' '}
            <span className="font-medium text-indigo-600">{user.email}</span>
          </p>
        </div>
        
        <EmailVerificationClient email={user.email} />
      </div>
    </div>
  );
}