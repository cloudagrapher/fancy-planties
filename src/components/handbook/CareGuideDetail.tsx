'use client';

import { X, Edit, Leaf, Droplets, FlaskConical, Sun, Thermometer, Wind, Mountain, RotateCcw, Sprout, Lightbulb, TreeDeciduous } from 'lucide-react';
import type { CareGuide } from '@/lib/db/schema';
import S3Image from '@/components/shared/S3Image';

export interface CareGuideDetailProps {
  guide: CareGuide;
  userId: number;
  onClose: () => void;
  onEdit: () => void;
}

const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`rounded-2xl shadow-sm border border-slate-200/70 bg-white/70 backdrop-blur ${className}`}>
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

export default function CareGuideDetail({ guide, userId: _userId, onClose, onEdit }: CareGuideDetailProps) {
  /**
   * Builds a formatted taxonomy string from the care guide's taxonomy fields
   * Handles different taxonomy levels (family, genus, species, cultivar)
   * Example output: "Araceae Monstera deliciosa 'Thai Constellation'"
   */
  const getTaxonomyDisplay = () => {
    const parts = [];
    if (guide.family) parts.push(guide.family);
    if (guide.genus) parts.push(guide.genus);
    if (guide.species) parts.push(guide.species);
    if (guide.cultivar) parts.push(`'${guide.cultivar}'`);
    return parts.join(' ');
  };

  // Extract TLDR data from existing guide sections
  const getTLDRData = () => {
    return {
      light: guide.lighting?.requirements || guide.lighting?.intensity || null,
      water: guide.watering?.frequency || null,
      fertilizer: guide.fertilizing?.frequency || guide.fertilizing?.type || null,
      soil: guide.soil?.type || null,
      tips: guide.generalTips?.split('\n')[0] || null, // First line of general tips as quick tip
    };
  };

  const tldr = getTLDRData();
  const hasTLDR = tldr.light || tldr.water || tldr.fertilizer || tldr.soil || tldr.tips;

  return (
    <div className="modal-overlay">
      <div className="absolute inset-0 bg-slate-900/30" onClick={onClose} />
      <div className="relative w-full max-w-4xl h-[90vh] flex flex-col">
        <Card className="h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 pb-4 border-b border-slate-200/50 flex-shrink-0">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Leaf className="h-6 w-6 text-emerald-600 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-semibold text-slate-800 truncate">{guide.title}</h2>
                <p className="text-sm text-slate-600 truncate">{getTaxonomyDisplay()}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button variant="ghost" onClick={onEdit}>
                <Edit className="h-4 w-4" />
                Edit
              </Button>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-6 py-6">
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {tldr.light && (
                      <div className="flex items-start gap-2.5">
                        <Sun className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="text-xs font-medium text-slate-500 uppercase">Light</span>
                          <p className="text-sm text-slate-700">{tldr.light}</p>
                        </div>
                      </div>
                    )}
                    {tldr.water && (
                      <div className="flex items-start gap-2.5">
                        <Droplets className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="text-xs font-medium text-slate-500 uppercase">Water</span>
                          <p className="text-sm text-slate-700">{tldr.water}</p>
                        </div>
                      </div>
                    )}
                    {tldr.fertilizer && (
                      <div className="flex items-start gap-2.5">
                        <FlaskConical className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="text-xs font-medium text-slate-500 uppercase">Fertilizer</span>
                          <p className="text-sm text-slate-700">{tldr.fertilizer}</p>
                        </div>
                      </div>
                    )}
                    {tldr.soil && (
                      <div className="flex items-start gap-2.5">
                        <Mountain className="h-4 w-4 text-amber-700 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="text-xs font-medium text-slate-500 uppercase">Soil</span>
                          <p className="text-sm text-slate-700">{tldr.soil}</p>
                        </div>
                      </div>
                    )}
                    {tldr.tips && (
                      <div className="flex items-start gap-2.5 sm:col-span-2">
                        <Lightbulb className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="text-xs font-medium text-slate-500 uppercase">Pro Tip</span>
                          <p className="text-sm text-slate-700">{tldr.tips}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Image Gallery - S3 Integration */}
              {guide.s3ImageKeys && guide.s3ImageKeys.length > 0 && (
                <div className="mb-8">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {guide.s3ImageKeys.map((s3Key, index) => (
                      <div key={s3Key} className="aspect-square relative overflow-hidden rounded-xl shadow-sm">
                        <S3Image
                          s3Key={s3Key}
                          alt={`${guide.title} - Image ${index + 1}`}
                          width={300}
                          height={300}
                          className="object-cover w-full h-full"
                          thumbnailSize="medium"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Care Instructions - Blog Style */}
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-slate-800 mb-6 pb-2 border-b border-slate-200">Care Guide</h2>

                {/* Root Structure & Growth Habits - NEW SECTION */}
                {guide.rootStructure && (guide.rootStructure.type || guide.rootStructure.growthHabits || guide.rootStructure.tips) && (
                  <BlogSection icon={TreeDeciduous} title="Root Structure & Growth Habits" iconColor="text-amber-700">
                    {guide.rootStructure.type && (
                      <p className="text-slate-700 mb-3">
                        <strong className="text-slate-800">Root Type:</strong> {guide.rootStructure.type}
                      </p>
                    )}
                    {guide.rootStructure.growthHabits && (
                      <p className="text-slate-700 mb-3">
                        <strong className="text-slate-800">Growth Habits:</strong> {guide.rootStructure.growthHabits}
                      </p>
                    )}
                    {guide.rootStructure.tips && (
                      <p className="text-slate-600 italic">{guide.rootStructure.tips}</p>
                    )}
                  </BlogSection>
                )}

                {/* Watering */}
                {guide.watering && (guide.watering.frequency || guide.watering.tips) && (
                  <BlogSection icon={Droplets} title="Watering" iconColor="text-blue-600">
                    {guide.watering.frequency && (
                      <p className="text-slate-700 mb-3">
                        <strong className="text-slate-800">Frequency:</strong> {guide.watering.frequency}
                      </p>
                    )}
                    {guide.watering.tips && (
                      <p className="text-slate-600">{guide.watering.tips}</p>
                    )}
                  </BlogSection>
                )}

                {/* Fertilizing */}
                {guide.fertilizing && (guide.fertilizing.frequency || guide.fertilizing.type || guide.fertilizing.schedule || guide.fertilizing.tips) && (
                  <BlogSection icon={FlaskConical} title="Fertilizing" iconColor="text-amber-600">
                    <div className="space-y-2 text-slate-700">
                      {guide.fertilizing.frequency && (
                        <p><strong className="text-slate-800">Frequency:</strong> {guide.fertilizing.frequency}</p>
                      )}
                      {guide.fertilizing.type && (
                        <p><strong className="text-slate-800">Type:</strong> {guide.fertilizing.type}</p>
                      )}
                      {guide.fertilizing.schedule && (
                        <p><strong className="text-slate-800">Schedule:</strong> {guide.fertilizing.schedule}</p>
                      )}
                    </div>
                    {guide.fertilizing.tips && (
                      <p className="text-slate-600 mt-3">{guide.fertilizing.tips}</p>
                    )}
                  </BlogSection>
                )}

                {/* Lighting */}
                {guide.lighting && (guide.lighting.requirements || guide.lighting.intensity || guide.lighting.tips) && (
                  <BlogSection icon={Sun} title="Lighting" iconColor="text-yellow-600">
                    <div className="space-y-2 text-slate-700">
                      {guide.lighting.requirements && (
                        <p><strong className="text-slate-800">Requirements:</strong> {guide.lighting.requirements}</p>
                      )}
                      {guide.lighting.intensity && (
                        <p><strong className="text-slate-800">Intensity:</strong> {guide.lighting.intensity}</p>
                      )}
                    </div>
                    {guide.lighting.tips && (
                      <p className="text-slate-600 mt-3">{guide.lighting.tips}</p>
                    )}
                  </BlogSection>
                )}

                {/* Temperature */}
                {guide.temperature && (guide.temperature.range || guide.temperature.tips) && (
                  <BlogSection icon={Thermometer} title="Temperature" iconColor="text-red-600">
                    {guide.temperature.range && (
                      <p className="text-slate-700 mb-3">
                        <strong className="text-slate-800">Ideal Range:</strong> {guide.temperature.range}
                      </p>
                    )}
                    {guide.temperature.tips && (
                      <p className="text-slate-600">{guide.temperature.tips}</p>
                    )}
                  </BlogSection>
                )}

                {/* Humidity */}
                {guide.humidity && (guide.humidity.requirements || guide.humidity.tips) && (
                  <BlogSection icon={Wind} title="Humidity" iconColor="text-cyan-600">
                    {guide.humidity.requirements && (
                      <p className="text-slate-700 mb-3">
                        <strong className="text-slate-800">Requirements:</strong> {guide.humidity.requirements}
                      </p>
                    )}
                    {guide.humidity.tips && (
                      <p className="text-slate-600">{guide.humidity.tips}</p>
                    )}
                  </BlogSection>
                )}

                {/* Soil */}
                {guide.soil && (guide.soil.type || guide.soil.recipe || guide.soil.tips) && (
                  <BlogSection icon={Mountain} title="Soil" iconColor="text-amber-800">
                    <div className="space-y-2 text-slate-700">
                      {guide.soil.type && (
                        <p><strong className="text-slate-800">Type:</strong> {guide.soil.type}</p>
                      )}
                      {guide.soil.recipe && (
                        <p><strong className="text-slate-800">Recipe:</strong> {guide.soil.recipe}</p>
                      )}
                    </div>
                    {guide.soil.tips && (
                      <p className="text-slate-600 mt-3">{guide.soil.tips}</p>
                    )}
                  </BlogSection>
                )}

                {/* Repotting */}
                {guide.repotting && (guide.repotting.frequency || guide.repotting.tips) && (
                  <BlogSection icon={RotateCcw} title="Repotting" iconColor="text-purple-600">
                    {guide.repotting.frequency && (
                      <p className="text-slate-700 mb-3">
                        <strong className="text-slate-800">Frequency:</strong> {guide.repotting.frequency}
                      </p>
                    )}
                    {guide.repotting.tips && (
                      <p className="text-slate-600">{guide.repotting.tips}</p>
                    )}
                  </BlogSection>
                )}

                {/* Propagation */}
                {guide.propagation && (guide.propagation.methods || guide.propagation.tips) && (
                  <BlogSection icon={Sprout} title="Propagation" iconColor="text-green-600">
                    {guide.propagation.methods && (
                      <p className="text-slate-700 mb-3">
                        <strong className="text-slate-800">Methods:</strong> {guide.propagation.methods}
                      </p>
                    )}
                    {guide.propagation.tips && (
                      <p className="text-slate-600">{guide.propagation.tips}</p>
                    )}
                  </BlogSection>
                )}
              </div>

              {/* Good to Know (renamed from General Tips) */}
              {guide.generalTips && (
                <div className="mt-8 p-5 bg-gradient-to-br from-slate-50 to-zinc-50 rounded-2xl border border-slate-200">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-xl bg-white shadow-sm">
                      <Lightbulb className="h-5 w-5 text-amber-500" />
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
        </Card>
      </div>
    </div>
  );
}
