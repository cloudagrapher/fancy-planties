'use client';

import React, { useState, useMemo, lazy, Suspense } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  BookOpen, 
  Plus, 
  Search, 
  Filter, 
  Tag,
  Globe,
  Lock,
  ChevronRight,
  FlaskConical,
  Droplets,
  Sun,
  Thermometer,
  Scissors,
  RefreshCw,
  TreeDeciduous
} from 'lucide-react';
import type { CareGuide } from '@/lib/db/schema';
import type { CareGuideFormData } from './CareGuideForm';
import S3Image from '@/components/shared/S3Image';
import { useToast } from '@/hooks/useToast';
import { usePersistedViewMode } from '@/hooks/usePersistedViewMode';
import ToastContainer from '@/components/shared/ToastContainer';

// Lazy load heavy modal components — only needed when user opens a form/detail view
const CareGuideForm = lazy(() => import('./CareGuideForm'));
const CareGuideDetail = lazy(() => import('./CareGuideDetail'));
import { apiFetch, ApiError } from '@/lib/api-client';

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

// Module-level helpers — pure functions, no need to recreate per render
const getTaxonomyIcon = (level: string) => {
  switch (level) {
    case 'family': return '🌳';
    case 'genus': return '🌿';
    case 'species': return '🌱';
    case 'cultivar': return '🏷️';
    default: return '📖';
  }
};

const getTaxonomyLevelLabel = (level: string) => {
  switch (level) {
    case 'family': return 'Family';
    case 'genus': return 'Genus';
    case 'species': return 'Species';
    case 'cultivar': return 'Cultivar';
    default: return 'Guide';
  }
};

const CareGuideCard = ({ guide, onClick }: { guide: CareGuide; onClick: () => void }) => {
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

  const getCareCategories = (guide: CareGuide) => {
    const categories = [];
    if (guide.watering) categories.push({ icon: Droplets, label: 'Watering', color: 'text-blue-600' });
    if (guide.fertilizing) categories.push({ icon: FlaskConical, label: 'Fertilizing', color: 'text-amber-600' });
    if (guide.lighting) categories.push({ icon: Sun, label: 'Lighting', color: 'text-yellow-600' });
    if (guide.temperature) categories.push({ icon: Thermometer, label: 'Temperature', color: 'text-red-600' });
    if (guide.pruning) categories.push({ icon: Scissors, label: 'Pruning', color: 'text-green-600' });
    if (guide.repotting) categories.push({ icon: RefreshCw, label: 'Repotting', color: 'text-purple-600' });
    // Show root structure badge when any root/growth data is present
    if (guide.rootStructure && (guide.rootStructure.type || guide.rootStructure.growthHabits || guide.rootStructure.tips)) {
      categories.push({ icon: TreeDeciduous, label: 'Root & Growth', color: 'text-amber-700' });
    }
    return categories;
  };

  return (
    <div role="button" tabIndex={0} onClick={onClick} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.(); } }} className="cursor-pointer">
      <Card className="p-0 overflow-hidden hover:shadow-lg transition-all hover:scale-[1.02]">
        {/* Thumbnail Image */}
        {guide.s3ImageKeys && guide.s3ImageKeys.length > 0 && (
          <div className="aspect-video relative overflow-hidden bg-slate-100" suppressHydrationWarning>
            <S3Image
              s3Key={guide.s3ImageKeys[0]}
              alt={guide.title}
              fill
              className="object-cover"
              thumbnailSize="large"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          </div>
        )}
        
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

        {/* At-a-glance care snippets — blog-like preview of the key facts */}
        {(() => {
          const snippets: { icon: React.ElementType; color: string; text: string }[] = [];
          if (guide.lighting?.requirements || guide.lighting?.intensity) {
            snippets.push({ icon: Sun, color: 'text-yellow-500', text: guide.lighting.requirements || guide.lighting.intensity! });
          }
          if (guide.watering?.frequency) {
            snippets.push({ icon: Droplets, color: 'text-blue-500', text: guide.watering.frequency });
          }
          if (guide.fertilizing?.frequency) {
            snippets.push({ icon: FlaskConical, color: 'text-amber-500', text: guide.fertilizing.frequency });
          }
          if (snippets.length === 0) return null;
          return (
            <div className="space-y-1 pt-1">
              {snippets.slice(0, 2).map(({ icon: Icon, color, text }) => (
                <div key={text} className="flex items-center gap-1.5 text-xs text-slate-600">
                  <Icon className={`h-3 w-3 flex-shrink-0 ${color}`} />
                  <span className="truncate">{text}</span>
                </div>
              ))}
            </div>
          );
        })()}

        {/* Care Categories */}
        {(() => {
          const categories = getCareCategories(guide);
          return (
            <div className="flex flex-wrap gap-1">
              {categories.slice(0, 4).map(({ icon: Icon, label, color }) => (
                <Chip key={label} className="bg-slate-50 text-slate-600 ring-slate-200">
                  <Icon className={`h-2.5 w-2.5 mr-0.5 ${color}`} />
                  {label}
                </Chip>
              ))}
              {categories.length > 4 && (
                <Chip className="bg-slate-50 text-slate-600 ring-slate-200">
                  +{categories.length - 4} more
                </Chip>
              )}
            </div>
          );
        })()}

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
            {getTaxonomyLevelLabel(guide.taxonomyLevel)} level
          </span>
          <span>
            {new Date(guide.updatedAt).toLocaleDateString()}
          </span>
        </div>
      </div>
      </Card>
    </div>
  );
};

export default function HandbookDashboard({ careGuides: initialCareGuides, userId }: HandbookDashboardProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedGuide, setSelectedGuide] = useState<CareGuide | null>(null);
  const [editingGuide, setEditingGuide] = useState<CareGuide | null>(null);
  const [viewMode, setViewMode] = usePersistedViewMode('handbook-view-mode');
  const queryClient = useQueryClient();
  const { toasts, showToast, dismissToast } = useToast();

  // Use React Query with server-rendered data as initial value — no full-page reload needed
  const { data: careGuides = initialCareGuides } = useQuery<CareGuide[]>({
    queryKey: ['care-guides', userId],
    queryFn: async () => {
      const response = await apiFetch('/api/care-guides');
      if (!response.ok) throw await ApiError.fromResponse(response, 'Failed to fetch care guides');
      return response.json();
    },
    initialData: initialCareGuides,
    staleTime: 1000 * 60,
  });

  const handleCreateGuide = async (formData: CareGuideFormData) => {
    try {
      const response = await apiFetch('/api/care-guides', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw await ApiError.fromResponse(response, 'Failed to create care guide');
      }

      // Invalidate query to refetch — no full-page reload
      await queryClient.invalidateQueries({ queryKey: ['care-guides', userId] });
      setShowCreateForm(false);
      showToast('Care guide created ✓', 'success');
    } catch (error) {
      console.error('Failed to create care guide:', error);
      showToast(`Failed to create care guide: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  };

  const handleUpdateGuide = async (formData: CareGuideFormData) => {
    if (!editingGuide) return;
    
    try {
      const response = await apiFetch(`/api/care-guides/${editingGuide.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw await ApiError.fromResponse(response, 'Failed to update care guide');
      }

      // Invalidate query to refetch — no full-page reload
      await queryClient.invalidateQueries({ queryKey: ['care-guides', userId] });
      setEditingGuide(null);
      showToast('Care guide updated ✓', 'success');
    } catch (error) {
      console.error('Failed to update care guide:', error);
      showToast(`Failed to update care guide: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  };

  const handleDeleteGuide = async (guideId: number) => {
    try {
      const response = await apiFetch(`/api/care-guides/${guideId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw await ApiError.fromResponse(response, 'Failed to delete care guide');
      }

      await queryClient.invalidateQueries({ queryKey: ['care-guides', userId] });
      setSelectedGuide(null);
      showToast('Care guide deleted ✓', 'success');
    } catch (error) {
      console.error('Failed to delete care guide:', error);
      showToast(`Failed to delete care guide: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  };

  const handleOpenDetail = (guide: CareGuide) => {
    setSelectedGuide(guide);
  };

  const handleCloseDetail = () => {
    setSelectedGuide(null);
  };

  const handleEditGuide = () => {
    if (selectedGuide) {
      setEditingGuide(selectedGuide);
      handleCloseDetail();
    }
  };

  const convertGuideToFormData = (guide: CareGuide) => {
    return {
      taxonomyLevel: guide.taxonomyLevel,
      family: guide.family || '',
      genus: guide.genus || '',
      species: guide.species || '',
      cultivar: guide.cultivar || '',
      commonName: guide.commonName || '',
      title: guide.title,
      description: guide.description || '',
      s3ImageKeys: guide.s3ImageKeys || [],
      watering: {
        frequency: guide.watering?.frequency || '',
        tips: guide.watering?.tips || ''
      },
      fertilizing: {
        frequency: guide.fertilizing?.frequency || '',
        type: guide.fertilizing?.type || '',
        schedule: guide.fertilizing?.schedule || '',
        tips: guide.fertilizing?.tips || ''
      },
      lighting: {
        requirements: guide.lighting?.requirements || '',
        intensity: guide.lighting?.intensity || '',
        tips: guide.lighting?.tips || ''
      },
      temperature: {
        range: guide.temperature?.range || '',
        tips: guide.temperature?.tips || ''
      },
      humidity: {
        requirements: guide.humidity?.requirements || '',
        tips: guide.humidity?.tips || ''
      },
      soil: {
        type: guide.soil?.type || '',
        recipe: guide.soil?.recipe || '',
        tips: guide.soil?.tips || ''
      },
      repotting: {
        frequency: guide.repotting?.frequency || '',
        tips: guide.repotting?.tips || ''
      },
      pruning: {
        frequency: guide.pruning?.frequency || '',
        method: guide.pruning?.method || '',
        season: guide.pruning?.season || '',
        tips: guide.pruning?.tips || ''
      },
      propagation: {
        methods: guide.propagation?.methods || '',
        tips: guide.propagation?.tips || ''
      },
      rootStructure: {
        type: guide.rootStructure?.type || '',
        growthHabits: guide.rootStructure?.growthHabits || '',
        tips: guide.rootStructure?.tips || ''
      },
      generalTips: guide.generalTips || '',
      tags: guide.tags || [],
      isPublic: guide.isPublic,
    };
  };

  // Filter care guides (memoized to avoid recalc on unrelated state changes)
  const filteredGuides = useMemo(() => careGuides.filter((guide) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery || 
      guide.title.toLowerCase().includes(query) ||
      guide.description?.toLowerCase().includes(query) ||
      guide.commonName?.toLowerCase().includes(query) ||
      guide.family?.toLowerCase().includes(query) ||
      guide.genus?.toLowerCase().includes(query) ||
      guide.species?.toLowerCase().includes(query) ||
      guide.cultivar?.toLowerCase().includes(query) ||
      (guide.tags && guide.tags.some(tag => tag.toLowerCase().includes(query)));
    
    const matchesLevel = selectedLevel === 'all' || guide.taxonomyLevel === selectedLevel;
    
    return matchesSearch && matchesLevel;
  }), [careGuides, searchQuery, selectedLevel]);

  // Statistics (memoized — only depends on the full careGuides list)
  const stats = useMemo(() => {
    const byLevel = {
      family: careGuides.filter(g => g.taxonomyLevel === 'family').length,
      genus: careGuides.filter(g => g.taxonomyLevel === 'genus').length,
      species: careGuides.filter(g => g.taxonomyLevel === 'species').length,
      cultivar: careGuides.filter(g => g.taxonomyLevel === 'cultivar').length,
    };
    const topLevel = (Object.entries(byLevel) as [string, number][]).reduce(
      (best, [level, count]) => count > best.count ? { level, count } : best,
      { level: 'none', count: 0 }
    );
    return {
      total: careGuides.length,
      public: careGuides.filter(g => g.isPublic).length,
      private: careGuides.filter(g => !g.isPublic).length,
      byLevel,
      topLevel,
    };
  }, [careGuides]);

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
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
            {stats.topLevel.count > 0 ? stats.topLevel.count : '—'}
          </div>
          <div className="text-sm text-slate-600">
            {stats.topLevel.count > 0
              ? `${stats.topLevel.level.charAt(0).toUpperCase() + stats.topLevel.level.slice(1)}-Level Guides`
              : 'No Guides Yet'}
          </div>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <div className="space-y-4">
          <SectionHeader 
            icon={Search} 
            title="Browse Care Guides"
            actions={
              <div className="flex items-center gap-2">
                <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      viewMode === 'grid'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="Grid view"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                    Grid
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      viewMode === 'list'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="List view"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                    List
                  </button>
                </div>
                <Button variant="ghost" onClick={() => setShowFilters(!showFilters)}>
                  <Filter className="h-4 w-4" />
                  Filters
                </Button>
              </div>
            }
          />
          
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <input
                type="text"
                id="handbook-search"
                aria-label="Search care guides by name, plant, or content"
                placeholder="Search guides by name, plant, or content..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-100"
              />
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" aria-hidden="true" />
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

      {/* Care Guides Grid / List */}
      {filteredGuides.length > 0 ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredGuides.map((guide) => (
              <CareGuideCard 
                key={guide.id} 
                guide={guide} 
                onClick={() => handleOpenDetail(guide)}
              />
            ))}
          </div>
        ) : (
          /* List View */
          <Card className="p-0 overflow-hidden divide-y divide-slate-100">
            {filteredGuides.map((guide) => {
              const careIcons = [];
              if (guide.watering) careIcons.push(<Droplets key="water" className="h-3.5 w-3.5 text-blue-400" aria-label="Watering" />);
              if (guide.fertilizing) careIcons.push(<FlaskConical key="fert" className="h-3.5 w-3.5 text-amber-400" aria-label="Fertilizing" />);
              if (guide.lighting) careIcons.push(<Sun key="light" className="h-3.5 w-3.5 text-yellow-400" aria-label="Lighting" />);
              if (guide.temperature) careIcons.push(<Thermometer key="temp" className="h-3.5 w-3.5 text-red-400" aria-label="Temperature" />);
              if (guide.pruning) careIcons.push(<Scissors key="prune" className="h-3.5 w-3.5 text-green-400" aria-label="Pruning" />);
              if (guide.repotting) careIcons.push(<RefreshCw key="repot" className="h-3.5 w-3.5 text-purple-400" aria-label="Repotting" />);
              if (guide.rootStructure?.type || guide.rootStructure?.growthHabits) careIcons.push(<TreeDeciduous key="root" className="h-3.5 w-3.5 text-amber-600" aria-label="Root & Growth" />);
              return (
                <div
                  key={guide.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleOpenDetail(guide)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleOpenDetail(guide); } }}
                  className="flex items-center gap-3 p-3 hover:bg-slate-50 cursor-pointer transition-colors"
                  aria-label={`Open care guide for ${guide.title}`}
                >
                  {/* Taxonomy icon or thumbnail */}
                  {guide.s3ImageKeys && guide.s3ImageKeys.length > 0 ? (
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg overflow-hidden bg-slate-100 relative">
                      <S3Image
                        s3Key={guide.s3ImageKeys[0]}
                        alt={guide.title}
                        fill
                        className="object-cover"
                        thumbnailSize="tiny"
                        sizes="40px"
                      />
                    </div>
                  ) : (
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-xl">
                      {getTaxonomyIcon(guide.taxonomyLevel)}
                    </div>
                  )}

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-sm font-semibold text-slate-800 truncate">{guide.title}</h4>
                      {guide.isPublic ? (
                        <Globe className="h-3 w-3 text-emerald-500 flex-shrink-0" />
                      ) : (
                        <Lock className="h-3 w-3 text-slate-400 flex-shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500 flex-shrink-0">
                        {getTaxonomyLevelLabel(guide.taxonomyLevel)}
                      </span>
                      {guide.commonName && (
                        <span className="text-xs text-slate-500 truncate">{guide.commonName}</span>
                      )}
                      {guide.commonName && guide.genus && <span className="text-xs text-slate-300">·</span>}
                      {guide.genus && (
                        <span className="text-xs text-slate-400 italic truncate">{guide.genus}{guide.species ? ` ${guide.species}` : ''}</span>
                      )}
                    </div>
                  </div>

                  {/* Care icons */}
                  <div className="flex-shrink-0 flex items-center gap-1">
                    {careIcons.slice(0, 5)}
                    {careIcons.length > 5 && (
                      <span className="text-xs text-slate-400">+{careIcons.length - 5}</span>
                    )}
                  </div>

                  {/* Tags */}
                  {guide.tags && guide.tags.length > 0 && (
                    <div className="hidden sm:flex flex-shrink-0 items-center gap-1">
                      {guide.tags.slice(0, 2).map(tag => (
                        <span key={tag} className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <ChevronRight className="flex-shrink-0 h-4 w-4 text-slate-300" />
                </div>
              );
            })}
          </Card>
        )
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

      {/* Care Guide Creation Form (lazy loaded) */}
      {showCreateForm && (
        <Suspense fallback={null}>
          <CareGuideForm
            isOpen={showCreateForm}
            onClose={() => setShowCreateForm(false)}
            onSubmit={handleCreateGuide}
            userId={userId}
          />
        </Suspense>
      )}

      {/* Care Guide Edit Form (lazy loaded) */}
      {editingGuide && (
        <Suspense fallback={null}>
          <CareGuideForm
            isOpen={true}
            onClose={() => setEditingGuide(null)}
            onSubmit={handleUpdateGuide}
            userId={userId}
            initialData={convertGuideToFormData(editingGuide)}
          />
        </Suspense>
      )}

      {/* Care Guide Detail Modal (lazy loaded) */}
      {selectedGuide && (
        <Suspense fallback={null}>
          <CareGuideDetail
            guide={selectedGuide}
            userId={userId}
            onClose={handleCloseDetail}
            onEdit={handleEditGuide}
            onDelete={handleDeleteGuide}
          />
        </Suspense>
      )}
    </div>
  );
}