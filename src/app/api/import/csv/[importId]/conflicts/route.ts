import { NextRequest, NextResponse } from 'next/server';
import { validateRequest } from '@/lib/auth/server';
import { CSVImportService } from '@/lib/services/csv-import-service';
import { z } from 'zod';

const csvImportService = new CSVImportService();

// GET /api/import/csv/[importId]/conflicts - Get suggested conflict resolutions
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ importId: string }> }
) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const progress = csvImportService.getImportProgress(resolvedParams.importId);
    
    if (!progress) {
      return NextResponse.json({ error: 'Import not found' }, { status: 404 });
    }

    if (progress.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const suggestions = csvImportService.getSuggestedResolutions(resolvedParams.importId);
    
    return NextResponse.json({ 
      conflicts: progress.conflicts,
      suggestions 
    });

  } catch (error) {
    console.error('Get conflicts error:', error);
    return NextResponse.json(
      { error: 'Failed to get conflicts' },
      { status: 500 }
    );
  }
}

// POST /api/import/csv/[importId]/conflicts - Resolve conflicts
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ importId: string }> }
) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const progress = csvImportService.getImportProgress(resolvedParams.importId);
    
    if (!progress) {
      return NextResponse.json({ error: 'Import not found' }, { status: 404 });
    }

    if (progress.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    
    // Validate request body
    const requestSchema = z.object({
      resolutions: z.array(z.object({
        conflictId: z.string(),
        action: z.enum(['skip', 'merge', 'create_new', 'manual_review']),
        data: z.any().optional(),
      })),
    });

    const { resolutions } = requestSchema.parse(body);

    // Resolve conflicts
    const summary = await csvImportService.resolveConflicts(resolvedParams.importId, resolutions);
    
    return NextResponse.json({ summary });

  } catch (error) {
    console.error('Resolve conflicts error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to resolve conflicts' },
      { status: 500 }
    );
  }
}