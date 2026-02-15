import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { requireCuratorSession } from '@/lib/auth/server';
import { AdminPlantQueries, PlantWithDetails } from '@/lib/db/queries/admin-plants';
import { AuditLogger, AUDIT_ACTIONS } from '@/lib/services/audit-logger';
import { z } from 'zod';

const exportSchema = z.object({
  plantIds: z.array(z.number()).optional(),
  format: z.enum(['json', 'csv']).default('csv'),
  filters: z.object({
    search: z.string().optional(),
    family: z.string().optional(),
    genus: z.string().optional(),
    species: z.string().optional(),
    isVerified: z.boolean().optional(),
  }).optional(),
});

function convertToCSV(plants: PlantWithDetails[]): string {
  if (plants.length === 0) return '';

  const headers = [
    'ID',
    'Family',
    'Genus', 
    'Species',
    'Cultivar',
    'Common Name',
    'Verified',
    'Created By',
    'Instance Count',
    'Propagation Count',
    'Created At',
    'Updated At'
  ];

  const rows = plants.map(plant => [
    plant.id,
    plant.family,
    plant.genus,
    plant.species,
    plant.cultivar || '',
    plant.commonName,
    plant.isVerified ? 'Yes' : 'No',
    plant.createdByName || '',
    plant.instanceCount,
    plant.propagationCount,
    plant.createdAt.toISOString(),
    plant.updatedAt.toISOString()
  ]);

  return [headers, ...rows]
    .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
    .join('\n');
}

export async function POST(request: NextRequest) {
  try {
    const { user } = await requireCuratorSession();
    const body = await request.json();
    const { plantIds, format, filters } = exportSchema.parse(body);

    const plants = await AdminPlantQueries.exportPlants(plantIds, filters);

    // Log the export operation
    await AuditLogger.logSystemAction(
      AUDIT_ACTIONS.DATA_EXPORT,
      user.id,
      {
        entityType: 'plants',
        format,
        plantIds: plantIds || 'all',
        filters,
        exportedCount: plants.length,
      }
    );

    if (format === 'csv') {
      const csv = convertToCSV(plants);
      const filename = `plants-export-${new Date().toISOString().split('T')[0]}.csv`;
      
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    } else {
      const filename = `plants-export-${new Date().toISOString().split('T')[0]}.json`;
      
      return new NextResponse(JSON.stringify(plants, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }
  } catch (error) {
    console.error('Failed to export plants:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to export plants' },
      { status: 500 }
    );
  }
}