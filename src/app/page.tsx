export default function Home() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-foreground">
            🌱 Fancy Planties
          </h1>
          <p className="text-text-secondary">
            Your beautiful plant collection tracker
          </p>
        </div>
        
        <div className="bg-surface border border-border rounded-2xl p-6 space-y-4">
          <h2 className="text-xl font-semibold text-foreground">
            Project Foundation Complete! ✅
          </h2>
          
          <div className="space-y-2 text-sm text-text-secondary">
            <div className="flex items-center justify-between">
              <span>Next.js 15 + TypeScript + App Router</span>
              <span className="text-success">✓</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Tailwind CSS v4 + Fancy Planties Theme</span>
              <span className="text-success">✓</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Docker Compose + PostgreSQL 16</span>
              <span className="text-success">✓</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Drizzle ORM + Schema</span>
              <span className="text-success">✓</span>
            </div>
            <div className="flex items-center justify-between">
              <span>PWA Manifest + Service Worker</span>
              <span className="text-success">✓</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Database Connection (Port 5433)</span>
              <span className="text-success">✓</span>
            </div>
          </div>
          
          <div className="text-xs text-text-muted pt-2 border-t border-border">
            Ready for task 2: Database Schema and Core Infrastructure
          </div>
        </div>
        
        <div className="flex gap-3">
          <div className="flex-1 bg-primary/20 border border-primary/30 rounded-xl p-3">
            <div className="text-primary-700 font-medium text-sm">Ready for Development</div>
          </div>
        </div>
      </div>
    </div>
  );
}