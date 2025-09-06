import { NextRequest, NextResponse } from 'next/server';
import { validateRequest } from '@/lib/auth';
import { CSVImportService, type ImportType } from '@/lib/services/csv-import-service';
import { csvFileSchema, csvImportConfigSchema } from '@/lib/validation/csv-schemas';
import { z } from 'zod';

const csvImportService = new CSVImportService();

// POST /api/import/csv - Start CSV import
export async function POST(request: NextRequest) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    // Validate request body
    const requestSchema = z.object({
      file: csvFileSchema,
      importType: z.enum(['plant_taxonomy', 'plant_instances', 'propagations']),
      config: csvImportConfigSchema.partial().optional(),
    });

    const { file, importType, config = {} } = requestSchema.parse(body);

    // Start import
    const result = await csvImportService.startImport(
      file,
      importType as ImportType,
      { ...config, userId: user.id }
    );

    return NextResponse.json(result);

  } catch (error) {
    console.error('CSV import error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to start import' },
      { status: 500 }
    );
  }
}

// GET /api/import/csv - Get user's imports
export async function GET(request: NextRequest) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const imports = csvImportService.getUserImports(user.id);
    return NextResponse.json({ imports });

  } catch (error) {
    console.error('Get imports error:', error);
    return NextResponse.json(
      { error: 'Failed to get imports' },
      { status: 500 }
    );
  }
}