import { NextRequest, NextResponse } from 'next/server';
import { validateRequest } from '@/lib/auth';
import { CSVImportService } from '@/lib/services/csv-import-service';

const csvImportService = new CSVImportService();

// GET /api/import/csv/[importId] - Get import progress
export async function GET(
  request: NextRequest,
  { params }: { params: { importId: string } }
) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const progress = csvImportService.getImportProgress(params.importId);
    
    if (!progress) {
      return NextResponse.json({ error: 'Import not found' }, { status: 404 });
    }

    if (progress.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ progress });

  } catch (error) {
    console.error('Get import progress error:', error);
    return NextResponse.json(
      { error: 'Failed to get import progress' },
      { status: 500 }
    );
  }
}

// DELETE /api/import/csv/[importId] - Cancel import
export async function DELETE(
  request: NextRequest,
  { params }: { params: { importId: string } }
) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const progress = csvImportService.getImportProgress(params.importId);
    
    if (!progress) {
      return NextResponse.json({ error: 'Import not found' }, { status: 404 });
    }

    if (progress.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const cancelled = csvImportService.cancelImport(params.importId);
    
    if (!cancelled) {
      return NextResponse.json(
        { error: 'Cannot cancel import in current state' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Cancel import error:', error);
    return NextResponse.json(
      { error: 'Failed to cancel import' },
      { status: 500 }
    );
  }
}