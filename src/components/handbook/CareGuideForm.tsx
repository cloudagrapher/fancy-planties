'use client';

import { useState } from 'react';
import { Save, Leaf, FlaskConical, Droplets, Sun, Thermometer, Wind, Info, FileText, Mountain, RotateCcw, Sprout, MessageCircle, TreeDeciduous } from 'lucide-react';
import S3ImageUpload from '@/components/shared/S3ImageUpload';
import Modal from '@/components/shared/Modal';

interface CareGuideFormData {
  taxonomyLevel: 'family' | 'genus' | 'species' | 'cultivar';
  family: string;
  genus: string;
  species: string;
  cultivar: string;
  commonName: string;
  title: string;
  description: string;
  s3ImageKeys: string[];
  watering: {
    frequency: string;
    tips: string;
  };
  fertilizing: {
    frequency: string;
    type: string;
    schedule: string;
    tips: string;
  };
  lighting: {
    requirements: string;
    intensity: string;
    tips: string;
  };
  temperature: {
    range: string;
    tips: string;
  };
  humidity: {
    requirements: string;
    tips: string;
  };
  soil: {
    type: string;
    recipe: string;
    tips: string;
  };
  repotting: {
    frequency: string;
    tips: string;
  };
  propagation: {
    methods: string;
    tips: string;
  };
  rootStructure: {
    type: string;
    growthHabits: string;
    tips: string;
  };
  generalTips: string;
  isPublic: boolean;
}

interface CareGuideFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CareGuideFormData) => void;
  userId: number;
  initialData?: Partial<CareGuideFormData>;
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
  variant = "primary",
  type = "button",
  disabled = false
}: { 
  children: React.ReactNode; 
  onClick?: () => void; 
  className?: string; 
  variant?: "primary" | "ghost" | "outline";
  type?: "button" | "submit";
  disabled?: boolean;
}) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled}
    className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold shadow-sm transition border disabled:opacity-50 disabled:cursor-not-allowed ${
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

const Input = ({ 
  label, 
  value, 
  onChange, 
  placeholder, 
  required = false,
  className = ""
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
}) => (
  <div className={className}>
    <label className="block text-sm font-medium text-slate-700 mb-1">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
    />
  </div>
);

const Select = ({
  label,
  value,
  onChange,
  options,
  required = false,
  className = ""
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  required?: boolean;
  className?: string;
}) => (
  <div className={className}>
    <label className="block text-sm font-medium text-slate-700 mb-1">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </div>
);

const TextArea = ({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
  className = ""
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
}) => (
  <div className={className}>
    <label className="block text-sm font-medium text-slate-700 mb-1">
      {label}
    </label>
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
    />
  </div>
);

export default function CareGuideForm({ isOpen, onClose, onSubmit, userId, initialData }: CareGuideFormProps) {
  const getInitialFormData = (): CareGuideFormData => {
    const defaults: CareGuideFormData = {
      taxonomyLevel: 'species',
      family: '',
      genus: '',
      species: '',
      cultivar: '',
      commonName: '',
      title: '',
      description: '',
      s3ImageKeys: [],
      watering: {
        frequency: '',
        tips: ''
      },
      fertilizing: {
        frequency: '',
        type: '',
        schedule: '',
        tips: ''
      },
      lighting: {
        requirements: '',
        intensity: '',
        tips: ''
      },
      temperature: {
        range: '',
        tips: ''
      },
      humidity: {
        requirements: '',
        tips: ''
      },
      soil: {
        type: '',
        recipe: '',
        tips: ''
      },
      repotting: {
        frequency: '',
        tips: ''
      },
      propagation: {
        methods: '',
        tips: ''
      },
      rootStructure: {
        type: '',
        growthHabits: '',
        tips: ''
      },
      generalTips: '',
      isPublic: false
    };

    if (initialData) {
      return {
        ...defaults,
        ...initialData,
        watering: { ...defaults.watering, ...initialData.watering },
        fertilizing: { ...defaults.fertilizing, ...initialData.fertilizing },
        lighting: { ...defaults.lighting, ...initialData.lighting },
        temperature: { ...defaults.temperature, ...initialData.temperature },
        humidity: { ...defaults.humidity, ...initialData.humidity },
        soil: { ...defaults.soil, ...initialData.soil },
        repotting: { ...defaults.repotting, ...initialData.repotting },
        propagation: { ...defaults.propagation, ...initialData.propagation },
        rootStructure: { ...defaults.rootStructure, ...initialData.rootStructure },
      };
    }

    return defaults;
  };

  const [formData, setFormData] = useState<CareGuideFormData>(getInitialFormData());

  const [activeTab, setActiveTab] = useState<'basic' | 'care'>('basic');

  const updateFormData = (path: string, value: string | boolean | string[]) => {
    setFormData(prev => {
      const keys = path.split('.');
      if (keys.length === 1) {
        return { ...prev, [keys[0]]: value };
      } else if (keys.length === 2) {
        const parentKey = keys[0] as keyof CareGuideFormData;
        const parent = prev[parentKey];
        return {
          ...prev,
          [keys[0]]: {
            ...(typeof parent === 'object' && parent !== null && !Array.isArray(parent) ? parent : {}),
            [keys[1]]: value
          }
        };
      }
      return prev;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    onClose();
  };

  const taxonomyOptions = [
    { value: 'family', label: 'Family Level' },
    { value: 'genus', label: 'Genus Level' },
    { value: 'species', label: 'Species Level' },
    { value: 'cultivar', label: 'Cultivar Level' }
  ];

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Care Guide' : 'Create Care Guide'}
      size="large"
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <button
            type="submit"
            form="care-guide-form"
            disabled={!formData.title || !formData.family}
            className="btn btn--primary flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {initialData ? 'Update Guide' : 'Create Guide'}
          </button>
        </div>
      }
    >
          <form id="care-guide-form" onSubmit={handleSubmit}>
            <div className="space-y-4">

                {/* Tabs */}
                <div className="flex gap-2 mb-6">
                  <button
                    type="button"
                    onClick={() => setActiveTab('basic')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                      activeTab === 'basic'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Basic Info
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('care')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                      activeTab === 'care'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Care Details
                  </button>
                </div>
            {activeTab === 'basic' && (
              <div className="space-y-6">
                {/* Taxonomy Section */}
                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Leaf className="h-4 w-4 text-emerald-600" />
                    <h3 className="font-medium text-slate-800">Plant Taxonomy</h3>
                  </div>
                  <div className="space-y-3">
                    <Select
                      label="Taxonomy Level"
                      value={formData.taxonomyLevel}
                      onChange={(value) => updateFormData('taxonomyLevel', value)}
                      options={taxonomyOptions}
                      required
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        label="Family"
                        value={formData.family}
                        onChange={(value) => updateFormData('family', value)}
                        placeholder="e.g., Araceae"
                        required
                      />
                      <Input
                        label="Genus"
                        value={formData.genus}
                        onChange={(value) => updateFormData('genus', value)}
                        placeholder="e.g., Monstera"
                        required={['genus', 'species', 'cultivar'].includes(formData.taxonomyLevel)}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        label="Species"
                        value={formData.species}
                        onChange={(value) => updateFormData('species', value)}
                        placeholder="e.g., deliciosa"
                        required={['species', 'cultivar'].includes(formData.taxonomyLevel)}
                      />
                      <Input
                        label="Cultivar"
                        value={formData.cultivar}
                        onChange={(value) => updateFormData('cultivar', value)}
                        placeholder="e.g., 'Thai Constellation'"
                        required={formData.taxonomyLevel === 'cultivar'}
                      />
                    </div>

                    <Input
                      label="Common Name"
                      value={formData.commonName}
                      onChange={(value) => updateFormData('commonName', value)}
                      placeholder="e.g., Swiss Cheese Plant"
                    />
                  </div>
                </Card>

                {/* Guide Information Section */}
                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="h-4 w-4 text-slate-600" />
                    <h3 className="font-medium text-slate-800">Guide Information</h3>
                  </div>
                  <div className="space-y-3">
                    <Input
                      label="Guide Title"
                      value={formData.title}
                      onChange={(value) => updateFormData('title', value)}
                      placeholder="e.g., Complete Monstera Care Guide"
                      required
                    />

                    <TextArea
                      label="General Description"
                      value={formData.description}
                      onChange={(value) => updateFormData('description', value)}
                      placeholder="Provide a comprehensive overview of this plant's care requirements and characteristics..."
                      rows={5}
                    />

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="isPublic"
                        checked={formData.isPublic}
                        onChange={(e) => updateFormData('isPublic', e.target.checked)}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <label htmlFor="isPublic" className="text-sm text-slate-700">
                        Make this guide public for others to see
                      </label>
                    </div>
                  </div>
                </Card>

                {/* Photos Section - S3 Image Storage Integration */}
                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Info className="h-4 w-4 text-slate-600" />
                    <h3 className="font-medium text-slate-800">Photos</h3>
                  </div>
                  {/* 
                    S3ImageUpload Component:
                    - Uploads images directly to AWS S3 for efficient storage
                    - Stores S3 object keys in the s3ImageKeys array instead of Base64 data
                    - Uses temporary entityId for new guides (replaced with actual ID on save)
                    - Supports up to 6 images per care guide
                  */}
                  <S3ImageUpload
                    userId={userId.toString()}
                    entityType="care_guide"
                    entityId={`temp-${Date.now()}`}
                    onUploadComplete={(s3Keys) => updateFormData('s3ImageKeys', s3Keys)}
                    maxImages={6}
                    className="mt-3"
                  />
                </Card>
              </div>
            )}

            {activeTab === 'care' && (
              <div className="space-y-6">
                {/* Root Structure & Growth Habits Section */}
                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <TreeDeciduous className="h-4 w-4 text-amber-700" />
                    <h3 className="font-medium text-slate-800">Root Structure & Growth Habits</h3>
                  </div>
                  <div className="space-y-3">
                    <Input
                      label="Root Type"
                      value={formData.rootStructure.type}
                      onChange={(value) => updateFormData('rootStructure.type', value)}
                      placeholder="e.g., Fibrous, Tuberous, Aerial roots"
                    />
                    <TextArea
                      label="Growth Habits"
                      value={formData.rootStructure.growthHabits}
                      onChange={(value) => updateFormData('rootStructure.growthHabits', value)}
                      placeholder="e.g., Climbing vine, Trailing, Compact rosette, Upright growth..."
                      rows={2}
                    />
                    <TextArea
                      label="Tips"
                      value={formData.rootStructure.tips}
                      onChange={(value) => updateFormData('rootStructure.tips', value)}
                      placeholder="Tips for managing root growth and plant structure..."
                      rows={2}
                    />
                  </div>
                </Card>

                {/* Watering Section - Simplified (method field removed) */}
                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Droplets className="h-4 w-4 text-blue-600" />
                    <h3 className="font-medium text-slate-800">Watering</h3>
                  </div>
                  <div className="space-y-3">
                    {/* 
                      Note: The 'method' field has been removed from the watering section
                      to simplify the form and focus on essential watering information
                    */}
                    <Input
                      label="Frequency"
                      value={formData.watering.frequency}
                      onChange={(value) => updateFormData('watering.frequency', value)}
                      placeholder="e.g., Weekly, When soil is dry"
                    />
                    <TextArea
                      label="Tips"
                      value={formData.watering.tips}
                      onChange={(value) => updateFormData('watering.tips', value)}
                      placeholder="Additional watering tips..."
                      rows={2}
                    />
                  </div>
                </Card>

                {/* Fertilizing Section */}
                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <FlaskConical className="h-4 w-4 text-amber-600" />
                    <h3 className="font-medium text-slate-800">Fertilizing</h3>
                  </div>
                  <div className="space-y-3">
                    <Input
                      label="Frequency"
                      value={formData.fertilizing.frequency}
                      onChange={(value) => updateFormData('fertilizing.frequency', value)}
                      placeholder="e.g., Monthly, Bi-weekly"
                    />
                    <Input
                      label="Type"
                      value={formData.fertilizing.type}
                      onChange={(value) => updateFormData('fertilizing.type', value)}
                      placeholder="e.g., Liquid fertilizer, Slow-release"
                    />
                    <Input
                      label="Schedule"
                      value={formData.fertilizing.schedule}
                      onChange={(value) => updateFormData('fertilizing.schedule', value)}
                      placeholder="e.g., Spring to Fall, Year-round"
                    />
                    <TextArea
                      label="Tips"
                      value={formData.fertilizing.tips}
                      onChange={(value) => updateFormData('fertilizing.tips', value)}
                      placeholder="Fertilizing tips and recommendations..."
                      rows={2}
                    />
                  </div>
                </Card>

                {/* Lighting Section */}
                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Sun className="h-4 w-4 text-yellow-600" />
                    <h3 className="font-medium text-slate-800">Lighting</h3>
                  </div>
                  <div className="space-y-3">
                    <Input
                      label="Requirements"
                      value={formData.lighting.requirements}
                      onChange={(value) => updateFormData('lighting.requirements', value)}
                      placeholder="e.g., Bright indirect light"
                    />
                    <Input
                      label="Intensity"
                      value={formData.lighting.intensity}
                      onChange={(value) => updateFormData('lighting.intensity', value)}
                      placeholder="e.g., Medium to high"
                    />
                    <TextArea
                      label="Tips"
                      value={formData.lighting.tips}
                      onChange={(value) => updateFormData('lighting.tips', value)}
                      placeholder="Lighting tips and placement suggestions..."
                      rows={2}
                    />
                  </div>
                </Card>

                {/* Temperature Section */}
                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Thermometer className="h-4 w-4 text-red-600" />
                    <h3 className="font-medium text-slate-800">Temperature</h3>
                  </div>
                  <div className="space-y-3">
                    <Input
                      label="Range"
                      value={formData.temperature.range}
                      onChange={(value) => updateFormData('temperature.range', value)}
                      placeholder="e.g., 65-80°F (18-27°C)"
                    />
                    <TextArea
                      label="Tips"
                      value={formData.temperature.tips}
                      onChange={(value) => updateFormData('temperature.tips', value)}
                      placeholder="Temperature management tips..."
                      rows={2}
                    />
                  </div>
                </Card>

                {/* Humidity Section */}
                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Wind className="h-4 w-4 text-cyan-600" />
                    <h3 className="font-medium text-slate-800">Humidity</h3>
                  </div>
                  <div className="space-y-3">
                    <Input
                      label="Requirements"
                      value={formData.humidity.requirements}
                      onChange={(value) => updateFormData('humidity.requirements', value)}
                      placeholder="e.g., 40-60%, High humidity"
                    />
                    <TextArea
                      label="Tips"
                      value={formData.humidity.tips}
                      onChange={(value) => updateFormData('humidity.tips', value)}
                      placeholder="Humidity management tips..."
                      rows={2}
                    />
                  </div>
                </Card>

                {/* Soil Section */}
                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Mountain className="h-4 w-4 text-amber-800" />
                    <h3 className="font-medium text-slate-800">Soil</h3>
                  </div>
                  <div className="space-y-3">
                    <Input
                      label="Soil Type"
                      value={formData.soil.type}
                      onChange={(value) => updateFormData('soil.type', value)}
                      placeholder="e.g., Well-draining potting mix"
                    />
                    <Input
                      label="Recipe"
                      value={formData.soil.recipe}
                      onChange={(value) => updateFormData('soil.recipe', value)}
                      placeholder="e.g., 1 part peat, 1 part perlite, 1 part bark"
                    />
                    <TextArea
                      label="Tips"
                      value={formData.soil.tips}
                      onChange={(value) => updateFormData('soil.tips', value)}
                      placeholder="Soil preparation and maintenance tips..."
                      rows={2}
                    />
                  </div>
                </Card>

                {/* Repotting Section */}
                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <RotateCcw className="h-4 w-4 text-purple-600" />
                    <h3 className="font-medium text-slate-800">Repotting</h3>
                  </div>
                  <div className="space-y-3">
                    <Input
                      label="Frequency"
                      value={formData.repotting.frequency}
                      onChange={(value) => updateFormData('repotting.frequency', value)}
                      placeholder="e.g., Every 2-3 years, When root bound"
                    />
                    <TextArea
                      label="Tips"
                      value={formData.repotting.tips}
                      onChange={(value) => updateFormData('repotting.tips', value)}
                      placeholder="Repotting tips and best practices..."
                      rows={2}
                    />
                  </div>
                </Card>

                {/* Propagation Section */}
                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Sprout className="h-4 w-4 text-green-600" />
                    <h3 className="font-medium text-slate-800">Propagation</h3>
                  </div>
                  <div className="space-y-3">
                    <Input
                      label="Method(s)"
                      value={formData.propagation.methods}
                      onChange={(value) => updateFormData('propagation.methods', value)}
                      placeholder="e.g., Stem cuttings, Node cuttings, Division"
                    />
                    <TextArea
                      label="Tips"
                      value={formData.propagation.tips}
                      onChange={(value) => updateFormData('propagation.tips', value)}
                      placeholder="Propagation tips and success strategies..."
                      rows={2}
                    />
                  </div>
                </Card>

                {/* General Tips Section */}
                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <MessageCircle className="h-4 w-4 text-slate-600" />
                    <h3 className="font-medium text-slate-800">General Tips</h3>
                  </div>
                  <div className="space-y-3">
                    <TextArea
                      label="General Tips"
                      value={formData.generalTips}
                      onChange={(value) => updateFormData('generalTips', value)}
                      placeholder="Additional general care tips and advice..."
                      rows={3}
                    />
                  </div>
                </Card>
              </div>
            )}
            </div>
          </form>
    </Modal>
  );
}