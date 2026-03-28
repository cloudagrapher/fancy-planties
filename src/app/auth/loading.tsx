export default function AuthLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-50 px-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-white rounded-2xl shadow-lg p-8 space-y-6 animate-pulse">
          <div className="mx-auto w-16 h-16 bg-gray-200 rounded-full" />
          <div className="h-6 bg-gray-200 rounded w-1/2 mx-auto" />
          <div className="space-y-3">
            <div className="h-10 bg-gray-200 rounded-lg" />
            <div className="h-10 bg-gray-200 rounded-lg" />
          </div>
          <div className="h-10 bg-gray-200 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
