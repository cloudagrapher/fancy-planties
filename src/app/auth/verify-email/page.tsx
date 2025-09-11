import { requireAuthSession } from '@/lib/auth/server';
import { redirect } from 'next/navigation';
import EmailVerificationClient from './EmailVerificationClient';

export const metadata = {
  title: 'Verify Your Email - Fancy Planties',
  description: 'Verify your email address to complete your account setup',
};

export default async function VerifyEmailPage() {
  const { user } = await requireAuthSession('/auth/signin');
  
  // If user is already verified, redirect to dashboard
  if (user.isEmailVerified) {
    redirect('/dashboard');
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8" 
         style={{ background: 'linear-gradient(135deg, var(--color-mint-50) 0%, var(--color-salmon-50) 100%)' }}>
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-mint-200 flex-center mx-auto mb-6">
            <svg
              className="w-10 h-10 text-mint-700"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">
            Verify Your Email
          </h1>
          <p className="text-neutral-600 mb-2">
            We've sent a verification code to
          </p>
          <p className="font-semibold text-mint-700 text-lg">
            {user.email}
          </p>
          <p className="text-sm text-neutral-500 mt-2">
            Check your inbox and enter the 6-digit code below
          </p>
        </div>
        
        <EmailVerificationClient email={user.email} />
        
        <div className="text-center">
          <p className="text-xs text-neutral-400">
            This helps us keep your account secure and ensures you receive important updates about your plants.
          </p>
        </div>
      </div>
    </div>
  );
}