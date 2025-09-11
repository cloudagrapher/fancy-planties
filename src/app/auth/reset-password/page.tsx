import { redirectIfAuthenticated } from '@/lib/auth/server';
import { redirect } from 'next/navigation';
import ResetPasswordForm from '@/components/auth/ResetPasswordForm';

export const metadata = {
  title: 'Reset Password - Fancy Planties',
  description: 'Set a new password for your Fancy Planties account',
};

interface PageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function ResetPasswordPage({ searchParams }: PageProps) {
  // Redirect if already authenticated
  await redirectIfAuthenticated();
  
  const params = await searchParams;
  const token = params.token;

  if (!token) {
    redirect('/auth/forgot-password');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-50 px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Set New Password
          </h1>
          <p className="text-gray-600">
            Enter your new password below
          </p>
        </div>
        
        <div className="bg-white rounded-2xl shadow-soft p-8">
          <ResetPasswordForm token={token} />
        </div>
        
        <div className="text-center">
          <p className="text-sm text-gray-600">
            Remember your password?{' '}
            <a 
              href="/auth/signin" 
              className="font-medium text-primary-600 hover:text-primary-500 transition-colors"
            >
              Sign in here
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}