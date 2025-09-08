import { Suspense } from 'react';

// Mock plant data for testing
const mockPlants = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  displayName: `Plant ${i + 1}`,
  plant: {
    genus: 'Genus',
    species: 'species',
  },
  location: `Location ${i + 1}`,
  primaryImage: null,
  careStatus: 'healthy' as const,
  careUrgency: 'none' as const,
  daysUntilFertilizerDue: Math.floor(Math.random() * 30) - 15,
  daysSinceLastFertilized: Math.floor(Math.random() * 60),
  isActive: true,
}));

function TestGrid() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Grid Layout Test</h1>
      
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Default Grid (grid-plants)</h2>
        <div className="grid-plants">
          {mockPlants.map((plant) => (
            <div
              key={plant.id}
              className="plant-card w-full max-w-[160px] h-48"
            >
              <div className="plant-card-image h-24 bg-gradient-to-br from-green-100 to-blue-100 flex items-center justify-center">
                <span className="text-4xl">🌱</span>
              </div>
              <div className="plant-card-content">
                <h3 className="plant-card-title">{plant.displayName}</h3>
                <p className="plant-card-subtitle">{plant.plant.genus} {plant.plant.species}</p>
                <p className="text-xs text-gray-500">📍 {plant.location}</p>
                
                {/* Quick Actions - should appear on hover */}
                <div className="flex space-x-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="btn btn--sm btn--outline">
                    💧 Care
                  </button>
                  <button className="btn btn--sm btn--secondary">
                    ✏️ Edit
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Responsive Grid (grid-responsive)</h2>
        <div className="grid-responsive">
          {mockPlants.slice(0, 8).map((plant) => (
            <div
              key={plant.id}
              className="plant-card w-full max-w-[200px] h-56"
            >
              <div className="plant-card-image h-32 bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
                <span className="text-4xl">🌿</span>
              </div>
              <div className="plant-card-content">
                <h3 className="plant-card-title">{plant.displayName}</h3>
                <p className="plant-card-subtitle">{plant.plant.genus} {plant.plant.species}</p>
                <p className="text-xs text-gray-500">📍 {plant.location}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Small Cards Grid</h2>
        <div className="grid gap-3 grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8">
          {mockPlants.map((plant) => (
            <div
              key={plant.id}
              className="plant-card w-full max-w-[140px] h-40"
            >
              <div className="plant-card-image h-20 bg-gradient-to-br from-yellow-100 to-orange-100 flex items-center justify-center">
                <span className="text-2xl">🌺</span>
              </div>
              <div className="plant-card-content">
                <h3 className="text-sm font-semibold">{plant.displayName}</h3>
                <p className="text-xs text-gray-600">{plant.plant.genus}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="text-sm text-gray-600 mt-8">
        <p><strong>Test Instructions:</strong></p>
        <ul className="list-disc list-inside space-y-1">
          <li>Resize your browser window to test responsive behavior</li>
          <li>Hover over cards to see hover effects and quick action buttons</li>
          <li>Test in different browsers (Firefox, Safari, Chrome) for consistency</li>
          <li>Check that cards maintain consistent spacing and alignment</li>
        </ul>
      </div>
    </div>
  );
}

export default function TestGridPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TestGrid />
    </Suspense>
  );
}