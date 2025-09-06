import { redirectIfAuthenticated } from '@/lib/auth/server';
import SignInForm from '@/components/auth/SignInForm';

export default async function SignInPage() {
  // Redirect if already authenticated
  await redirectIfAuthenticated();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-50 px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back to Fancy Planties
          </h1>
          <p className="text-gray-600">
            Sign in to continue managing your plant collection
          </p>
        </div>
        
        <div className="bg-white rounded-2xl shadow-soft p-8">
          <SignInForm />
        </div>
        
        <div className="text-center">
          <p className="text-sm text-gray-600">
            Don&apos;t have an account?{' '}
            <a 
              href="/auth/signup" 
              className="font-medium text-primary-600 hover:text-primary-500 transition-colors"
            >
              Sign up here
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}