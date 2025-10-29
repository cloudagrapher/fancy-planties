'use client';

import { X, Edit, Leaf, Droplets, FlaskConical, Sun, Thermometer, Wind, Mountain, RotateCcw, Sprout, MessageCircle } from 'lucide-react';
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

export default function CareGuideDetail({ guide, userId, onClose, onEdit }: CareGuideDetailProps) {
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
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="space-y-6">
              {/* Taxonomy and Common Name */}
              <Card className="p-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Leaf className="h-4 w-4 text-emerald-600" />
                    <h3 className="font-medium text-slate-800">Taxonomy</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {guide.family && (
                      <div>
                        <span className="text-slate-500">Family:</span>
                        <span className="ml-2 text-slate-800 font-medium">{guide.family}</span>
                      </div>
                    )}
                    {guide.genus && (
                      <div>
                        <span className="text-slate-500">Genus:</span>
                        <span className="ml-2 text-slate-800 font-medium">{guide.genus}</span>
                      </div>
                    )}
                    {guide.species && (
                      <div>
                        <span className="text-slate-500">Species:</span>
                        <span className="ml-2 text-slate-800 font-medium">{guide.species}</span>
                      </div>
                    )}
                    {guide.cultivar && (
                      <div>
                        <span className="text-slate-500">Cultivar:</span>
                        <span className="ml-2 text-slate-800 font-medium">'{guide.cultivar}'</span>
                      </div>
                    )}
                    {guide.commonName && (
                      <div className="col-span-2">
                        <span className="text-slate-500">Common Name:</span>
                        <span className="ml-2 text-slate-800 font-medium">{guide.commonName}</span>
                      </div>
                    )}
                  </div>
                </div>
              </Card>

              {/* General Description */}
              {guide.description && (
                <Card className="p-4">
                  <div className="space-y-2">
                    <h3 className="font-medium text-slate-800">Description</h3>
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {guide.description}
                    </p>
                  </div>
                </Card>
              )}

              {/* Image Gallery - S3 Integration */}
              {/* 
                Images are stored in AWS S3 and retrieved using pre-signed URLs
                - s3ImageKeys contains array of S3 object keys
                - S3Image component handles fetching and displaying images
                - Images are displayed in a responsive grid layout
              */}
              {guide.s3ImageKeys && guide.s3ImageKeys.length > 0 && (
                <Card className="p-4">
                  <div className="space-y-3">
                    <h3 className="font-medium text-slate-800">Photos</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {guide.s3ImageKeys.map((s3Key, index) => (
                        <div key={s3Key} className="aspect-square relative overflow-hidden rounded-lg">
                          <S3Image
                            s3Key={s3Key}
                            userId={userId.toString()}
                            alt={`${guide.title} - Image ${index + 1}`}
                            width={300}
                            height={300}
                            className="object-cover w-full h-full"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              )}

              {/* Care Categories */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-800">Care Instructions</h3>

                {/* Watering */}
                {guide.watering && (
                  <Card className="p-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Droplets className="h-4 w-4 text-blue-600" />
                        <h4 className="font-medium text-slate-800">Watering</h4>
                      </div>
                      <div className="space-y-1 text-sm">
                        {guide.watering.frequency && (
                          <div>
                            <span className="text-slate-500">Frequency:</span>
                            <span className="ml-2 text-slate-700">{guide.watering.frequency}</span>
                          </div>
                        )}
                        {guide.watering.tips && (
                          <div>
                            <span className="text-slate-500">Tips:</span>
                            <p className="mt-1 text-slate-700">{guide.watering.tips}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                )}

                {/* Fertilizing */}
                {guide.fertilizing && (
                  <Card className="p-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <FlaskConical className="h-4 w-4 text-amber-600" />
                        <h4 className="font-medium text-slate-800">Fertilizing</h4>
                      </div>
                      <div className="space-y-1 text-sm">
                        {guide.fertilizing.frequency && (
                          <div>
                            <span className="text-slate-500">Frequency:</span>
                            <span className="ml-2 text-slate-700">{guide.fertilizing.frequency}</span>
                          </div>
                        )}
                        {guide.fertilizing.type && (
                          <div>
                            <span className="text-slate-500">Type:</span>
                            <span className="ml-2 text-slate-700">{guide.fertilizing.type}</span>
                          </div>
                        )}
                        {guide.fertilizing.schedule && (
                          <div>
                            <span className="text-slate-500">Schedule:</span>
                            <span className="ml-2 text-slate-700">{guide.fertilizing.schedule}</span>
                          </div>
                        )}
                        {guide.fertilizing.tips && (
                          <div>
                            <span className="text-slate-500">Tips:</span>
                            <p className="mt-1 text-slate-700">{guide.fertilizing.tips}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                )}

                {/* Lighting */}
                {guide.lighting && (
                  <Card className="p-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Sun className="h-4 w-4 text-yellow-600" />
                        <h4 className="font-medium text-slate-800">Lighting</h4>
                      </div>
                      <div className="space-y-1 text-sm">
                        {guide.lighting.requirements && (
                          <div>
                            <span className="text-slate-500">Requirements:</span>
                            <span className="ml-2 text-slate-700">{guide.lighting.requirements}</span>
                          </div>
                        )}
                        {guide.lighting.intensity && (
                          <div>
                            <span className="text-slate-500">Intensity:</span>
                            <span className="ml-2 text-slate-700">{guide.lighting.intensity}</span>
                          </div>
                        )}
                        {guide.lighting.tips && (
                          <div>
                            <span className="text-slate-500">Tips:</span>
                            <p className="mt-1 text-slate-700">{guide.lighting.tips}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                )}

                {/* Temperature */}
                {guide.temperature && (
                  <Card className="p-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Thermometer className="h-4 w-4 text-red-600" />
                        <h4 className="font-medium text-slate-800">Temperature</h4>
                      </div>
                      <div className="space-y-1 text-sm">
                        {guide.temperature.range && (
                          <div>
                            <span className="text-slate-500">Range:</span>
                            <span className="ml-2 text-slate-700">{guide.temperature.range}</span>
                          </div>
                        )}
                        {guide.temperature.tips && (
                          <div>
                            <span className="text-slate-500">Tips:</span>
                            <p className="mt-1 text-slate-700">{guide.temperature.tips}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                )}

                {/* Humidity */}
                {guide.humidity && (
                  <Card className="p-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Wind className="h-4 w-4 text-cyan-600" />
                        <h4 className="font-medium text-slate-800">Humidity</h4>
                      </div>
                      <div className="space-y-1 text-sm">
                        {guide.humidity.requirements && (
                          <div>
                            <span className="text-slate-500">Requirements:</span>
                            <span className="ml-2 text-slate-700">{guide.humidity.requirements}</span>
                          </div>
                        )}
                        {guide.humidity.tips && (
                          <div>
                            <span className="text-slate-500">Tips:</span>
                            <p className="mt-1 text-slate-700">{guide.humidity.tips}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                )}

                {/* Soil */}
                {guide.soil && (
                  <Card className="p-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Mountain className="h-4 w-4 text-amber-800" />
                        <h4 className="font-medium text-slate-800">Soil</h4>
                      </div>
                      <div className="space-y-1 text-sm">
                        {guide.soil.type && (
                          <div>
                            <span className="text-slate-500">Type:</span>
                            <span className="ml-2 text-slate-700">{guide.soil.type}</span>
                          </div>
                        )}
                        {guide.soil.recipe && (
                          <div>
                            <span className="text-slate-500">Recipe:</span>
                            <span className="ml-2 text-slate-700">{guide.soil.recipe}</span>
                          </div>
                        )}
                        {guide.soil.tips && (
                          <div>
                            <span className="text-slate-500">Tips:</span>
                            <p className="mt-1 text-slate-700">{guide.soil.tips}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                )}

                {/* Repotting */}
                {guide.repotting && (
                  <Card className="p-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <RotateCcw className="h-4 w-4 text-purple-600" />
                        <h4 className="font-medium text-slate-800">Repotting</h4>
                      </div>
                      <div className="space-y-1 text-sm">
                        {guide.repotting.frequency && (
                          <div>
                            <span className="text-slate-500">Frequency:</span>
                            <span className="ml-2 text-slate-700">{guide.repotting.frequency}</span>
                          </div>
                        )}
                        {guide.repotting.tips && (
                          <div>
                            <span className="text-slate-500">Tips:</span>
                            <p className="mt-1 text-slate-700">{guide.repotting.tips}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                )}

                {/* Propagation */}
                {guide.propagation && (
                  <Card className="p-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Sprout className="h-4 w-4 text-green-600" />
                        <h4 className="font-medium text-slate-800">Propagation</h4>
                      </div>
                      <div className="space-y-1 text-sm">
                        {guide.propagation.methods && (
                          <div>
                            <span className="text-slate-500">Methods:</span>
                            <span className="ml-2 text-slate-700">{guide.propagation.methods}</span>
                          </div>
                        )}
                        {guide.propagation.tips && (
                          <div>
                            <span className="text-slate-500">Tips:</span>
                            <p className="mt-1 text-slate-700">{guide.propagation.tips}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                )}
              </div>

              {/* General Tips */}
              {guide.generalTips && (
                <Card className="p-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="h-4 w-4 text-slate-600" />
                      <h4 className="font-medium text-slate-800">General Tips</h4>
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {guide.generalTips}
                    </p>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
