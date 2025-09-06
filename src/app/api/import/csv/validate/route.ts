import { NextRequest, NextResponse } from 'next/server';
import { validateRequest } from '@/lib/auth/server';
import { CSVImportService, type ImportType } from '@/lib/services/csv-import-service';
import { z } from 'zod';

const csvImportService = new CSVImportService();

// POST /api/import/csv/validate - Validate CSV content
export async function POST(request: NextRequest) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    // Validate request body
    const requestSchema = z.object({
      content: z.string().min(1, 'CSV content is required'),
      importType: z.enum(['plant_taxonomy', 'plant_instances', 'propagations']),
    });

    const { content, importType } = requestSchema.parse(body);

    // Validate CSV content
    const validation = await csvImportService.validateCSVContent(
      content,
      importType as ImportType
    );

    return NextResponse.json(validation);

  } catch (error) {
    console.error('CSV validation error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to validate CSV' },
      { status: 500 }
    );
  }
}