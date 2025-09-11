import { redirectIfAuthenticated } from '@/lib/auth/server';
import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm';

export const metadata = {
  title: 'Forgot Password - Fancy Planties',
  description: 'Reset your password for Fancy Planties',
};

export default async function ForgotPasswordPage() {
  // Redirect if already authenticated
  await redirectIfAuthenticated();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-50 px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Reset Your Password
          </h1>
          <p className="text-gray-600">
            Enter your email address and we'll send you a reset link
          </p>
        </div>
        
        <div className="bg-white rounded-2xl shadow-soft p-8">
          <ForgotPasswordForm />
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