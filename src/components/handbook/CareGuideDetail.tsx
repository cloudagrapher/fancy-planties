'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { X, Edit, Trash2, Leaf, Droplets, FlaskConical, Sun, Thermometer, Wind, Mountain, RotateCcw, Sprout, Scissors, Lightbulb, TreeDeciduous, ChevronLeft, ChevronRight } from 'lucide-react';
import type { CareGuide } from '@/lib/db/schema';
import S3Image from '@/components/shared/S3Image';

export interface CareGuideDetailProps {
  guide: CareGuide;
  userId: number;
  onClose: () => void;
  onEdit: () => void;
  onDelete?: (guideId: number) => void;
}

const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`rounded-2xl shadow-sm border ${className}`} style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
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
  variant?: "primary" | "ghost";
}) => (
  <button
    onClick={onClick}
    className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold shadow-sm transition border ${
      variant === "primary"
        ? "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-500"
        : "bg-white/70 border-slate-200/70 hover:bg-white text-slate-700"
    } ${className}`}
  >
    {children}
  </button>
);

// Blog-style section component for a more editorial feel
const BlogSection = ({ 
  icon: Icon, 
  title, 
  children, 
  iconColor = "text-emerald-600" 
}: { 
  icon: React.ElementType; 
  title: string; 
  children: React.ReactNode;
  iconColor?: string;
}) => (
  <div className="mb-8">
    <div className="flex items-center gap-3 mb-4">
      <div className={`p-2 rounded-xl bg-slate-50 ${iconColor}`}>
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
    </div>
    <div className="prose prose-slate prose-sm max-w-none">
      {children}
    </div>
  </div>
);

/**
 * Inline lightbox for viewing care guide images at full size.
 * Supports swipe/arrow key navigation between images.
 */
function ImageLightbox({
  images,
  initialIndex,
  guideTitle,
  onClose,
}: {
  images: string[];
  initialIndex: number;
  guideTitle: string;
  onClose: () => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const lightboxRef = useRef<HTMLDivElement>(null);

  const goNext = useCallback(() => {
    setCurrentIndex((i) => (i + 1) % images.length);
  }, [images.length]);

  const goPrev = useCallback(() => {
    setCurrentIndex((i) => (i - 1 + images.length) % images.length);
  }, [images.length]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
      else if (e.key === 'ArrowRight') goNext();
      else if (e.key === 'ArrowLeft') goPrev();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose, goNext, goPrev]);

  // Focus the lightbox container on mount for keyboard navigation
  useEffect(() => {
    lightboxRef.current?.focus();
  }, []);

  return (
    <div
      ref={lightboxRef}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Image viewer for ${guideTitle}`}
      tabIndex={-1}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        aria-label="Close image viewer"
      >
        <X className="h-6 w-6 text-white" />
      </button>

      {/* Navigation arrows */}
      {images.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); goPrev(); }}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            aria-label="Previous image"
          >
            <ChevronLeft className="h-6 w-6 text-white" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); goNext(); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            aria-label="Next image"
          >
            <ChevronRight className="h-6 w-6 text-white" />
          </button>
        </>
      )}

      {/* Image */}
      <div
        className="relative w-full h-full max-w-5xl max-h-[85vh] mx-8 my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <S3Image
          s3Key={images[currentIndex]}
          alt={`${guideTitle} - Image ${currentIndex + 1} of ${images.length}`}
          fill
          className="object-contain"
          thumbnailSize="original"
          sizes="90vw"
        />
      </div>

      {/* Counter */}
      {images.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/80 text-sm font-medium bg-black/40 px-3 py-1 rounded-full">
          {currentIndex + 1} / {images.length}
        </div>
      )}
    </div>
  );
}

/**
 * Helper: collect all focusable elements inside a container.
 */
function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
    )
  );
}

export default function CareGuideDetail({ guide, userId, onClose, onEdit, onDelete }: CareGuideDetailProps) {
  const isOwner = guide.userId === userId;
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  // Store the element that was focused before the modal opened
  useEffect(() => {
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
  }, []);

  // Close on Escape key, lock body scroll, manage focus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      // Focus trapping: keep Tab/Shift+Tab within the modal
      if (e.key === 'Tab' && modalRef.current) {
        const focusable = getFocusableElements(modalRef.current);
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    // Prevent background scroll while modal is open
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Focus the close button on mount
    requestAnimationFrame(() => {
      closeButtonRef.current?.focus();
    });

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prevOverflow;
      // Return focus to the previously focused element
      previouslyFocusedRef.current?.focus();
    };
  }, [onClose]);

  /**
   * Builds a formatted taxonomy string from the care guide's taxonomy fields
   */
  const getTaxonomyDisplay = () => {
    const parts = [];
    if (guide.family) parts.push(guide.family);
    if (guide.genus) parts.push(guide.genus);
    if (guide.species) parts.push(guide.species);
    if (guide.cultivar) parts.push(`'${guide.cultivar}'`);
    return parts.join(' ');
  };

  // Extract TLDR data from existing guide sections (memoized — depends only on guide prop)
  const tldr = useMemo(() => {
    const firstLine = guide.generalTips?.split('\n')[0] || null;
    const tips = firstLine
      ? (firstLine.length > 120 ? firstLine.slice(0, 120) + '…' : firstLine)
      : null;
    return {
      light: guide.lighting?.requirements || guide.lighting?.intensity || null,
      water: guide.watering?.frequency || null,
      fertilizer: guide.fertilizing?.frequency || guide.fertilizing?.type || null,
      soil: guide.soil?.type || null,
      roots: guide.rootStructure?.type || guide.rootStructure?.growthHabits || null,
      temperature: guide.temperature?.range || null,
      humidity: guide.humidity?.requirements || null,
      tips,
    };
  }, [guide]);

  const hasTLDR = tldr.light || tldr.water || tldr.fertilizer || tldr.soil || tldr.roots || tldr.temperature || tldr.humidity || tldr.tips;

  const dialogTitleId = `care-guide-title-${guide.id}`;

  return (
    <>
      <div
        className="modal-overlay"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby={dialogTitleId}
      >
        <div
          ref={modalRef}
          className="relative w-full max-w-4xl h-[90vh] flex flex-col mx-4"
          onClick={(e) => e.stopPropagation()}
        >
          <Card className="h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 pb-4 border-b border-slate-200/50 flex-shrink-0 gap-2">
              <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                <Leaf className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-600 flex-shrink-0" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <h2 id={dialogTitleId} className="text-base sm:text-xl font-semibold text-slate-800 truncate">
                    {guide.title}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600 truncate">{getTaxonomyDisplay()}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                {isOwner && (
                  <>
                    <Button variant="ghost" onClick={onEdit} className="!px-2 !py-2 sm:!px-3.5 sm:!py-2.5">
                      <Edit className="h-4 w-4" aria-hidden="true" />
                      <span className="hidden sm:inline">Edit</span>
                    </Button>
                    {onDelete && (
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="inline-flex items-center gap-1.5 rounded-xl px-2 py-2 sm:px-3 sm:py-2.5 text-sm font-medium transition border bg-white/70 border-red-200/70 hover:bg-red-50 text-red-600"
                        title="Delete care guide"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                        <span className="hidden sm:inline">Delete</span>
                      </button>
                    )}
                  </>
                )}
                <button
                  ref={closeButtonRef}
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                  aria-label="Close care guide"
                >
                  <X className="h-5 w-5 text-slate-500" />
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
              <article className="max-w-3xl mx-auto">
                {/* Taxonomy and Common Name */}
                <div className="mb-6 pb-6 border-b border-slate-200/50">
                  <div className="flex flex-wrap gap-2 text-sm text-slate-600">
                    {guide.family && (
                      <span className="px-2.5 py-1 bg-slate-100 rounded-full">
                        <span className="text-slate-500">Family:</span> <span className="font-medium text-slate-700">{guide.family}</span>
                      </span>
                    )}
                    {guide.genus && (
                      <span className="px-2.5 py-1 bg-slate-100 rounded-full">
                        <span className="text-slate-500">Genus:</span> <span className="font-medium text-slate-700">{guide.genus}</span>
                      </span>
                    )}
                    {guide.species && (
                      <span className="px-2.5 py-1 bg-slate-100 rounded-full">
                        <span className="text-slate-500">Species:</span> <span className="font-medium text-slate-700">{guide.species}</span>
                      </span>
                    )}
                    {guide.cultivar && (
                      <span className="px-2.5 py-1 bg-emerald-50 rounded-full">
                        <span className="text-emerald-600">Cultivar:</span> <span className="font-medium text-emerald-700">&apos;{guide.cultivar}&apos;</span>
                      </span>
                    )}
                    {guide.commonName && (
                      <span className="px-2.5 py-1 bg-amber-50 rounded-full">
                        <span className="text-amber-600">Common Name:</span> <span className="font-medium text-amber-700">{guide.commonName}</span>
                      </span>
                    )}
                  </div>
                  {/* Tags */}
                  {guide.tags && guide.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {guide.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* General Description */}
                {guide.description && (
                  <div className="mb-8">
                    <p className="text-base text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {guide.description}
                    </p>
                  </div>
                )}

                {/* TLDR Quick Reference Section */}
                {hasTLDR && (
                  <div className="mb-8 p-5 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border border-emerald-100">
                    <h3 className="text-sm font-semibold text-emerald-800 uppercase tracking-wider mb-4">Quick Reference</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {tldr.light && (
                        <div className="flex items-start gap-2.5">
                          <Sun className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" aria-hidden="true" />
                          <div>
                            <span className="text-xs font-medium text-slate-500 uppercase">Light</span>
                            <p className="text-sm text-slate-700">{tldr.light}</p>
                          </div>
                        </div>
                      )}
                      {tldr.water && (
                        <div className="flex items-start gap-2.5">
                          <Droplets className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" aria-hidden="true" />
                          <div>
                            <span className="text-xs font-medium text-slate-500 uppercase">Water</span>
                            <p className="text-sm text-slate-700">{tldr.water}</p>
                          </div>
                        </div>
                      )}
                      {tldr.fertilizer && (
                        <div className="flex items-start gap-2.5">
                          <FlaskConical className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" aria-hidden="true" />
                          <div>
                            <span className="text-xs font-medium text-slate-500 uppercase">Fertilizer</span>
                            <p className="text-sm text-slate-700">{tldr.fertilizer}</p>
                          </div>
                        </div>
                      )}
                      {tldr.soil && (
                        <div className="flex items-start gap-2.5">
                          <Mountain className="h-4 w-4 text-amber-700 mt-0.5 flex-shrink-0" aria-hidden="true" />
                          <div>
                            <span className="text-xs font-medium text-slate-500 uppercase">Soil</span>
                            <p className="text-sm text-slate-700">{tldr.soil}</p>
                          </div>
                        </div>
                      )}
                      {tldr.roots && (
                        <div className="flex items-start gap-2.5">
                          <TreeDeciduous className="h-4 w-4 text-amber-700 mt-0.5 flex-shrink-0" aria-hidden="true" />
                          <div>
                            <span className="text-xs font-medium text-slate-500 uppercase">Roots</span>
                            <p className="text-sm text-slate-700">{tldr.roots}</p>
                          </div>
                        </div>
                      )}
                      {tldr.temperature && (
                        <div className="flex items-start gap-2.5">
                          <Thermometer className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" aria-hidden="true" />
                          <div>
                            <span className="text-xs font-medium text-slate-500 uppercase">Temperature</span>
                            <p className="text-sm text-slate-700">{tldr.temperature}</p>
                          </div>
                        </div>
                      )}
                      {tldr.humidity && (
                        <div className="flex items-start gap-2.5">
                          <Wind className="h-4 w-4 text-cyan-500 mt-0.5 flex-shrink-0" aria-hidden="true" />
                          <div>
                            <span className="text-xs font-medium text-slate-500 uppercase">Humidity</span>
                            <p className="text-sm text-slate-700">{tldr.humidity}</p>
                          </div>
                        </div>
                      )}
                      {tldr.tips && (
                        <div className="flex items-start gap-2.5 sm:col-span-2 md:col-span-3">
                          <Lightbulb className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" aria-hidden="true" />
                          <div>
                            <span className="text-xs font-medium text-slate-500 uppercase">Pro Tip</span>
                            <p className="text-sm text-slate-700">{tldr.tips}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Image Gallery - S3 Integration with Lightbox */}
                {guide.s3ImageKeys && guide.s3ImageKeys.length > 0 && (
                  <div className="mb-8">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {guide.s3ImageKeys.map((s3Key, index) => (
                        <button
                          key={s3Key}
                          onClick={() => setLightboxIndex(index)}
                          className="aspect-square relative overflow-hidden rounded-xl shadow-sm cursor-pointer group focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2"
                          aria-label={`View ${guide.title} image ${index + 1} of ${guide.s3ImageKeys!.length} full size`}
                        >
                          <S3Image
                            s3Key={s3Key}
                            alt={`${guide.title} - Image ${index + 1}`}
                            fill
                            className="object-cover transition-transform duration-200 group-hover:scale-105"
                            thumbnailSize="medium"
                            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                          />
                          {/* Hover overlay */}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                            <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-sm font-medium bg-black/40 px-2 py-1 rounded-lg">
                              View
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Care Instructions - Blog Style */}
                <div className="space-y-2">
                  <h2 className="text-xl font-bold text-slate-800 mb-6 pb-2 border-b border-slate-200">Care Guide</h2>

                  {/* Root Structure & Growth Habits */}
                  {guide.rootStructure && (guide.rootStructure.type || guide.rootStructure.growthHabits || guide.rootStructure.tips) && (
                    <BlogSection icon={TreeDeciduous} title="Root Structure & Growth Habits" iconColor="text-amber-700">
                      {guide.rootStructure.type && (
                        <p className="text-slate-700 mb-3 whitespace-pre-wrap">
                          <strong className="text-slate-800">Root Type:</strong> {guide.rootStructure.type}
                        </p>
                      )}
                      {guide.rootStructure.growthHabits && (
                        <p className="text-slate-700 mb-3 whitespace-pre-wrap">
                          <strong className="text-slate-800">Growth Habits:</strong> {guide.rootStructure.growthHabits}
                        </p>
                      )}
                      {guide.rootStructure.tips && (
                        <p className="text-slate-600 italic whitespace-pre-wrap">{guide.rootStructure.tips}</p>
                      )}
                    </BlogSection>
                  )}

                  {/* Watering */}
                  {guide.watering && (guide.watering.frequency || guide.watering.tips) && (
                    <BlogSection icon={Droplets} title="Watering" iconColor="text-blue-600">
                      {guide.watering.frequency && (
                        <p className="text-slate-700 mb-3 whitespace-pre-wrap">
                          <strong className="text-slate-800">Frequency:</strong> {guide.watering.frequency}
                        </p>
                      )}
                      {guide.watering.tips && (
                        <p className="text-slate-600 whitespace-pre-wrap">{guide.watering.tips}</p>
                      )}
                    </BlogSection>
                  )}

                  {/* Fertilizing */}
                  {guide.fertilizing && (guide.fertilizing.frequency || guide.fertilizing.type || guide.fertilizing.schedule || guide.fertilizing.tips) && (
                    <BlogSection icon={FlaskConical} title="Fertilizing" iconColor="text-amber-600">
                      <div className="space-y-2 text-slate-700">
                        {guide.fertilizing.frequency && (
                          <p className="whitespace-pre-wrap"><strong className="text-slate-800">Frequency:</strong> {guide.fertilizing.frequency}</p>
                        )}
                        {guide.fertilizing.type && (
                          <p className="whitespace-pre-wrap"><strong className="text-slate-800">Type:</strong> {guide.fertilizing.type}</p>
                        )}
                        {guide.fertilizing.schedule && (
                          <p className="whitespace-pre-wrap"><strong className="text-slate-800">Schedule:</strong> {guide.fertilizing.schedule}</p>
                        )}
                      </div>
                      {guide.fertilizing.tips && (
                        <p className="text-slate-600 mt-3 whitespace-pre-wrap">{guide.fertilizing.tips}</p>
                      )}
                    </BlogSection>
                  )}

                  {/* Lighting */}
                  {guide.lighting && (guide.lighting.requirements || guide.lighting.intensity || guide.lighting.tips) && (
                    <BlogSection icon={Sun} title="Lighting" iconColor="text-yellow-600">
                      <div className="space-y-2 text-slate-700">
                        {guide.lighting.requirements && (
                          <p className="whitespace-pre-wrap"><strong className="text-slate-800">Requirements:</strong> {guide.lighting.requirements}</p>
                        )}
                        {guide.lighting.intensity && (
                          <p className="whitespace-pre-wrap"><strong className="text-slate-800">Intensity:</strong> {guide.lighting.intensity}</p>
                        )}
                      </div>
                      {guide.lighting.tips && (
                        <p className="text-slate-600 mt-3 whitespace-pre-wrap">{guide.lighting.tips}</p>
                      )}
                    </BlogSection>
                  )}

                  {/* Temperature */}
                  {guide.temperature && (guide.temperature.range || guide.temperature.tips) && (
                    <BlogSection icon={Thermometer} title="Temperature" iconColor="text-red-600">
                      {guide.temperature.range && (
                        <p className="text-slate-700 mb-3 whitespace-pre-wrap">
                          <strong className="text-slate-800">Ideal Range:</strong> {guide.temperature.range}
                        </p>
                      )}
                      {guide.temperature.tips && (
                        <p className="text-slate-600 whitespace-pre-wrap">{guide.temperature.tips}</p>
                      )}
                    </BlogSection>
                  )}

                  {/* Humidity */}
                  {guide.humidity && (guide.humidity.requirements || guide.humidity.tips) && (
                    <BlogSection icon={Wind} title="Humidity" iconColor="text-cyan-600">
                      {guide.humidity.requirements && (
                        <p className="text-slate-700 mb-3 whitespace-pre-wrap">
                          <strong className="text-slate-800">Requirements:</strong> {guide.humidity.requirements}
                        </p>
                      )}
                      {guide.humidity.tips && (
                        <p className="text-slate-600 whitespace-pre-wrap">{guide.humidity.tips}</p>
                      )}
                    </BlogSection>
                  )}

                  {/* Soil */}
                  {guide.soil && (guide.soil.type || guide.soil.recipe || guide.soil.tips) && (
                    <BlogSection icon={Mountain} title="Soil" iconColor="text-amber-800">
                      <div className="space-y-2 text-slate-700">
                        {guide.soil.type && (
                          <p className="whitespace-pre-wrap"><strong className="text-slate-800">Type:</strong> {guide.soil.type}</p>
                        )}
                        {guide.soil.recipe && (
                          <p className="whitespace-pre-wrap"><strong className="text-slate-800">Recipe:</strong> {guide.soil.recipe}</p>
                        )}
                      </div>
                      {guide.soil.tips && (
                        <p className="text-slate-600 mt-3 whitespace-pre-wrap">{guide.soil.tips}</p>
                      )}
                    </BlogSection>
                  )}

                  {/* Repotting */}
                  {guide.repotting && (guide.repotting.frequency || guide.repotting.tips) && (
                    <BlogSection icon={RotateCcw} title="Repotting" iconColor="text-purple-600">
                      {guide.repotting.frequency && (
                        <p className="text-slate-700 mb-3 whitespace-pre-wrap">
                          <strong className="text-slate-800">Frequency:</strong> {guide.repotting.frequency}
                        </p>
                      )}
                      {guide.repotting.tips && (
                        <p className="text-slate-600 whitespace-pre-wrap">{guide.repotting.tips}</p>
                      )}
                    </BlogSection>
                  )}

                  {/* Pruning */}
                  {guide.pruning && (guide.pruning.frequency || guide.pruning.method || guide.pruning.season || guide.pruning.tips) && (
                    <BlogSection icon={Scissors} title="Pruning" iconColor="text-green-600">
                      <div className="space-y-2 text-slate-700">
                        {guide.pruning.frequency && (
                          <p className="whitespace-pre-wrap"><strong className="text-slate-800">Frequency:</strong> {guide.pruning.frequency}</p>
                        )}
                        {guide.pruning.method && (
                          <p className="whitespace-pre-wrap"><strong className="text-slate-800">Method:</strong> {guide.pruning.method}</p>
                        )}
                        {guide.pruning.season && (
                          <p className="whitespace-pre-wrap"><strong className="text-slate-800">Best Season:</strong> {guide.pruning.season}</p>
                        )}
                      </div>
                      {guide.pruning.tips && (
                        <p className="text-slate-600 mt-3 whitespace-pre-wrap">{guide.pruning.tips}</p>
                      )}
                    </BlogSection>
                  )}

                  {/* Propagation */}
                  {guide.propagation && (guide.propagation.methods || guide.propagation.tips) && (
                    <BlogSection icon={Sprout} title="Propagation" iconColor="text-green-600">
                      {guide.propagation.methods && (
                        <p className="text-slate-700 mb-3 whitespace-pre-wrap">
                          <strong className="text-slate-800">Methods:</strong> {guide.propagation.methods}
                        </p>
                      )}
                      {guide.propagation.tips && (
                        <p className="text-slate-600 whitespace-pre-wrap">{guide.propagation.tips}</p>
                      )}
                    </BlogSection>
                  )}
                </div>

                {/* Good to Know (renamed from General Tips) */}
                {guide.generalTips && (
                  <div className="mt-8 p-5 bg-gradient-to-br from-slate-50 to-zinc-50 rounded-2xl border border-slate-200">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 rounded-xl bg-white shadow-sm">
                        <Lightbulb className="h-5 w-5 text-amber-500" aria-hidden="true" />
                      </div>
                      <h3 className="text-lg font-semibold text-slate-800">Good to Know</h3>
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {guide.generalTips}
                    </p>
                  </div>
                )}
              </article>
            </div>

            {/* Delete Confirmation Dialog */}
            {showDeleteConfirm && onDelete && (
              <div className="flex-shrink-0 border-t border-slate-200/50 p-4 bg-red-50/50" role="alert">
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-red-800">
                      Delete &ldquo;{guide.title}&rdquo;?
                    </p>
                    <p className="text-xs text-red-600 mt-0.5">
                      This action cannot be undone.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        onDelete(guide.id);
                        setShowDeleteConfirm(false);
                      }}
                      className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 border border-red-600 rounded-lg hover:bg-red-700 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Image Lightbox */}
      {lightboxIndex !== null && guide.s3ImageKeys && (
        <ImageLightbox
          images={guide.s3ImageKeys}
          initialIndex={lightboxIndex}
          guideTitle={guide.title}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </>
  );
}
