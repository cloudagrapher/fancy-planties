'use client';

import { useState } from 'react';
import { Download, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';

type ExportStatus = 'idle' | 'loading' | 'success' | 'error';

/**
 * Exports the user's plant collection + propagation data as a CSV download.
 * Fetches from existing APIs — no new backend endpoint needed.
 */
export default function ExportMyData() {
  const [status, setStatus] = useState<ExportStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleExport = async () => {
    try {
      setStatus('loading');
      setErrorMessage('');

      // Fetch all plant instances (high limit to get everything)
      const [plantsRes, propsRes] = await Promise.all([
        apiFetch('/api/plant-instances?limit=1000&offset=0'),
        apiFetch('/api/propagations'),
      ]);

      if (!plantsRes.ok || !propsRes.ok) {
        throw new Error('Failed to fetch your data');
      }

      const plantsData = await plantsRes.json();
      const propsData = await propsRes.json();

      // Normalise — API may return { plantInstances: [...] } or just [...]
      const plants = Array.isArray(plantsData)
        ? plantsData
        : plantsData.plantInstances ?? [];
      const propagations = Array.isArray(propsData) ? propsData : [];

      // ---------- Build Plants CSV ----------
      const plantHeaders = [
        'Nickname',
        'Family',
        'Genus',
        'Species',
        'Cultivar',
        'Common Name',
        'Location',
        'Active',
        'Fertilizer Schedule',
        'Last Fertilized',
        'Fertilizer Due',
        'Last Repot',
        'Created',
      ];

      const plantRows = plants.map((p: Record<string, unknown>) => {
        const plant = (p.plant ?? {}) as Record<string, unknown>;
        return [
          csvEscape(p.nickname as string),
          csvEscape(plant.family as string),
          csvEscape(plant.genus as string),
          csvEscape(plant.species as string),
          csvEscape(plant.cultivar as string),
          csvEscape(plant.commonName as string),
          csvEscape(p.location as string),
          p.isActive ? 'Yes' : 'No',
          csvEscape(p.fertilizerSchedule as string),
          formatDate(p.lastFertilized as string),
          formatDate(p.fertilizerDue as string),
          formatDate(p.lastRepot as string),
          formatDate(p.createdAt as string),
        ].join(',');
      });

      const plantsCsv = [plantHeaders.join(','), ...plantRows].join('\n');

      // ---------- Build Propagations CSV ----------
      const propHeaders = [
        'Nickname',
        'Family',
        'Genus',
        'Species',
        'Common Name',
        'Status',
        'Location',
        'Date Started',
        'Source Type',
        'External Source',
        'Notes',
      ];

      const propRows = propagations.map((pr: Record<string, unknown>) => {
        const plant = (pr.plant ?? {}) as Record<string, unknown>;
        return [
          csvEscape(pr.nickname as string),
          csvEscape(plant.family as string),
          csvEscape(plant.genus as string),
          csvEscape(plant.species as string),
          csvEscape(plant.commonName as string),
          csvEscape(pr.status as string),
          csvEscape(pr.location as string),
          formatDate(pr.dateStarted as string),
          csvEscape(pr.sourceType as string),
          csvEscape(pr.externalSource as string),
          csvEscape(pr.notes as string),
        ].join(',');
      });

      const propsCsv = [propHeaders.join(','), ...propRows].join('\n');

      // ---------- Download ----------
      const today = new Date().toISOString().slice(0, 10);

      downloadCsv(`fancy-planties-plants-${today}.csv`, plantsCsv);

      if (propagations.length > 0) {
        // Small delay so browser doesn't block the second download
        setTimeout(() => {
          downloadCsv(`fancy-planties-propagations-${today}.csv`, propsCsv);
        }, 250);
      }

      setStatus('success');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (err) {
      console.error('Export failed:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Export failed');
      setStatus('error');
      setTimeout(() => setStatus('idle'), 5000);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors">
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Download className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h4 className="font-medium text-neutral-900">Export My Data</h4>
          <p className="text-sm text-neutral-600">
            Download your plants &amp; propagations as CSV
          </p>
        </div>
      </div>
      <button
        onClick={handleExport}
        disabled={status === 'loading'}
        className="btn btn--sm btn--outline flex items-center gap-1.5 disabled:opacity-50"
      >
        {status === 'loading' && <Loader2 className="w-4 h-4 animate-spin" />}
        {status === 'success' && <CheckCircle className="w-4 h-4 text-green-600" />}
        {status === 'error' && <AlertCircle className="w-4 h-4 text-red-600" />}
        {status === 'idle' && <Download className="w-4 h-4" />}
        {status === 'loading'
          ? 'Exporting…'
          : status === 'success'
          ? 'Exported!'
          : status === 'error'
          ? 'Retry'
          : 'Export'}
      </button>
      {status === 'error' && errorMessage && (
        <p className="text-xs text-red-600 mt-1 sm:mt-0">{errorMessage}</p>
      )}
    </div>
  );
}

// ---- helpers ----

function csvEscape(value: unknown): string {
  if (value == null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function formatDate(value: unknown): string {
  if (!value) return '';
  const d = new Date(String(value));
  return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}

function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
