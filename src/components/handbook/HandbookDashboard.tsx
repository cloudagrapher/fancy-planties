'use client';

import { useState } from 'react';
import { 
  BookOpen, 
  Plus, 
  Search, 
  Filter, 
  Leaf, 
  Tag,
  Globe,
  Lock,
  ChevronRight,
  FlaskConical,
  Droplets,
  Sun,
  Thermometer,
  Scissors,
  RefreshCw
} from 'lucide-react';
import type { CareGuide } from '@/lib/db/schema';
import CareGuideForm from './CareGuideForm';

interface HandbookDashboardProps {
  careGuides: CareGuide[];
  userId: number;
}

const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`rounded-2xl shadow-sm border border-slate-200/70 bg-white/70 backdrop-blur p-4 ${className}`}>
    {children}
  </div>
);

const Button = ({ 
  children, 
  onClick, 
  className = "", 
  variant = "primary" 
}: { 
  children: React.ReactNode; 
  onClick?: () => void; 
  className?: string; 
  variant?: "primary" | "ghost" | "outline";
}) => (
  <button
    onClick={onClick}
    className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold shadow-sm transition border ${
      variant === "primary"
        ? "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-500"
        : variant === "ghost"
        ? "bg-white/70 border-slate-200/70 hover:bg-white text-slate-700"
        : "bg-white border-slate-200/70 text-slate-700 hover:bg-slate-50"
    } ${className}`}
  >
    {children}
  </button>
);

const Chip = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${className}`}>
    {children}
  </span>
);

const SectionHeader = ({ 
  icon: Icon, 
  title, 
  actions 
}: { 
  icon: React.ElementType; 
  title: string; 
  actions?: React.ReactNode; 
}) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2">
      <Icon className="h-5 w-5 text-slate-500" />
      <h3 className="text-sm font-semibold text-slate-700 tracking-wide">{title}</h3>
    </div>
    <div className="flex items-center gap-2">{actions}</div>
  </div>
);

const CareGuideCard = ({ guide }: { guide: CareGuide }) => {
  const getTaxonomyDisplay = (guide: CareGuide) => {
    switch (guide.taxonomyLevel) {
      case 'family':
        return guide.family || 'Family';
      case 'genus':
        return `${guide.family} ${guide.genus}` || 'Genus';
      case 'species':
        return `${guide.genus} ${guide.species}` || 'Species';
      case 'cultivar':
        return `${guide.species} '${guide.cultivar}'` || 'Cultivar';
      default:
        return 'Unknown';
    }
  };

  const getTaxonomyIcon = (level: string) => {
    switch (level) {
      case 'family': return '🌳';
      case 'genus': return '🌿';
      case 'species': return '🌱';
      case 'cultivar': return '🏷️';
      default: return '📖';
    }
  };

  const getCareCategories = (guide: CareGuide) => {
    const categories = [];
    if (guide.watering) categories.push({ icon: Droplets, label: 'Watering', color: 'text-blue-600' });
    if (guide.fertilizing) categories.push({ icon: FlaskConical, label: 'Fertilizing', color: 'text-amber-600' });
    if (guide.lighting) categories.push({ icon: Sun, label: 'Lighting', color: 'text-yellow-600' });
    if (guide.temperature) categories.push({ icon: Thermometer, label: 'Temperature', color: 'text-red-600' });
    if (guide.pruning) categories.push({ icon: Scissors, label: 'Pruning', color: 'text-green-600' });
    if (guide.repotting) categories.push({ icon: RefreshCw, label: 'Repotting', color: 'text-purple-600' });
    return categories;
  };

  return (
    <Card className="p-0 overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{getTaxonomyIcon(guide.taxonomyLevel)}</span>
              <h4 className="text-sm font-semibold text-slate-800">{guide.title}</h4>
              {guide.isPublic ? (
                <Globe className="h-3 w-3 text-emerald-600" />
              ) : (
                <Lock className="h-3 w-3 text-slate-400" />
              )}
            </div>
            <p className="text-xs text-slate-500 font-medium">
              {getTaxonomyDisplay(guide)}
              {guide.commonName && ` • ${guide.commonName}`}
            </p>
            {guide.description && (
              <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                {guide.description}
              </p>
            )}
          </div>
          <Button variant="ghost" className="!px-2 !py-1 shrink-0">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Care Categories */}
        <div className="flex flex-wrap gap-1">
          {getCareCategories(guide).slice(0, 4).map(({ icon: Icon, label, color }) => (
            <Chip key={label} className="bg-slate-50 text-slate-600 ring-slate-200">
              <Icon className={`h-2.5 w-2.5 mr-0.5 ${color}`} />
              {label}
            </Chip>
          ))}
          {getCareCategories(guide).length > 4 && (
            <Chip className="bg-slate-50 text-slate-600 ring-slate-200">
              +{getCareCategories(guide).length - 4} more
            </Chip>
          )}
        </div>

        {/* Tags */}
        {guide.tags && guide.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {guide.tags.slice(0, 3).map((tag) => (
              <Chip key={tag} className="bg-emerald-50 text-emerald-700 ring-emerald-200">
                <Tag className="h-2.5 w-2.5 mr-0.5" />
                {tag}
              </Chip>
            ))}
            {guide.tags.length > 3 && (
              <Chip className="bg-slate-50 text-slate-600 ring-slate-200">
                +{guide.tags.length - 3} more
              </Chip>
            )}
          </div>
        )}

        {/* Metadata */}
        <div className="text-xs text-slate-500 flex items-center justify-between pt-2 border-t border-slate-200/50">
          <span>
            {guide.taxonomyLevel.charAt(0).toUpperCase() + guide.taxonomyLevel.slice(1)} level
          </span>
          <span>
            {new Date(guide.updatedAt).toLocaleDateString()}
          </span>
        </div>
      </div>
    </Card>
  );
};

export default function HandbookDashboard({ careGuides, userId }: HandbookDashboardProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const handleCreateGuide = async (formData: any) => {
    try {
      const response = await fetch('/api/care-guides', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create care guide');
      }

      const newCareGuide = await response.json();
      
      // Refresh the page to show the new guide
      window.location.reload();
      
    } catch (error) {
      console.error('Failed to create care guide:', error);
      alert(`Failed to create care guide: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Filter care guides
  const filteredGuides = careGuides.filter((guide) => {
    const matchesSearch = !searchQuery || 
      guide.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      guide.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      guide.commonName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      guide.family?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      guide.genus?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      guide.species?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesLevel = selectedLevel === 'all' || guide.taxonomyLevel === selectedLevel;
    
    return matchesSearch && matchesLevel;
  });

  // Statistics
  const stats = {
    total: careGuides.length,
    public: careGuides.filter(g => g.isPublic).length,
    private: careGuides.filter(g => !g.isPublic).length,
    byLevel: {
      family: careGuides.filter(g => g.taxonomyLevel === 'family').length,
      genus: careGuides.filter(g => g.taxonomyLevel === 'genus').length,
      species: careGuides.filter(g => g.taxonomyLevel === 'species').length,
      cultivar: careGuides.filter(g => g.taxonomyLevel === 'cultivar').length,
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-emerald-600" />
          <h1 className="text-2xl font-bold text-slate-800">Plant Care Handbook</h1>
        </div>
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="h-4 w-4" />
          New Guide
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-2xl font-bold text-emerald-600">{stats.total}</div>
          <div className="text-sm text-slate-600">Total Guides</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-blue-600">{stats.public}</div>
          <div className="text-sm text-slate-600">Public</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-amber-600">{stats.private}</div>
          <div className="text-sm text-slate-600">Private</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-slate-600">
            {Object.values(stats.byLevel).reduce((a, b) => Math.max(a, b), 0)}
          </div>
          <div className="text-sm text-slate-600">Most Common Level</div>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <div className="space-y-4">
          <SectionHeader 
            icon={Search} 
            title="Browse Care Guides"
            actions={
              <Button variant="ghost" onClick={() => setShowFilters(!showFilters)}>
                <Filter className="h-4 w-4" />
                Filters
              </Button>
            }
          />
          
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Search guides by name, plant, or content..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-100"
              />
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
            </div>
          </div>

          {showFilters && (
            <div className="pt-4 border-t border-slate-200/70">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedLevel('all')}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                    selectedLevel === 'all'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  All Levels
                </button>
                {['family', 'genus', 'species', 'cultivar'].map((level) => (
                  <button
                    key={level}
                    onClick={() => setSelectedLevel(level)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition capitalize ${
                      selectedLevel === level
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {level} ({stats.byLevel[level as keyof typeof stats.byLevel]})
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Care Guides Grid */}
      {filteredGuides.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredGuides.map((guide) => (
            <CareGuideCard key={guide.id} guide={guide} />
          ))}
        </div>
      ) : (
        <Card className="text-center py-12">
          <div className="text-6xl mb-4">📖</div>
          <h3 className="text-xl font-semibold text-slate-800 mb-2">
            {searchQuery || selectedLevel !== 'all' ? 'No Guides Found' : 'No Care Guides Yet'}
          </h3>
          <p className="text-slate-600 mb-6">
            {searchQuery || selectedLevel !== 'all' 
              ? 'Try adjusting your search or filters to find what you\'re looking for.'
              : 'Create your first care guide to start building your plant knowledge base.'
            }
          </p>
          {!searchQuery && selectedLevel === 'all' && (
            <Button onClick={() => setShowCreateForm(true)}>
              <Plus className="h-4 w-4" />
              Create Your First Guide
            </Button>
          )}
        </Card>
      )}

      {/* Care Guide Creation Form */}
      <CareGuideForm
        isOpen={showCreateForm}
        onClose={() => setShowCreateForm(false)}
        onSubmit={handleCreateGuide}
      />
    </div>
  );
}