import ButtonShowcase from '@/components/test/ButtonShowcase';
import { notFound } from 'next/navigation';

export default function TestButtonsPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-mint-50 to-white p-4">
      <div className="container mx-auto max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Design System - Button Components
          </h1>
          <p className="text-gray-600">
            Comprehensive button system with variants, sizes, states, and mobile optimization.
          </p>
        </div>
        
        <ButtonShowcase />
      </div>
    </div>
  );
}