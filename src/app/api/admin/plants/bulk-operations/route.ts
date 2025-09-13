import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { requireCuratorSession } from '@/lib/auth/server';
import { AdminPlantQueries } from '@/lib/db/queries/admin-plants';
import { AuditLogger, AUDIT_ACTIONS } from '@/lib/services/audit-logger';
import { z } from 'zod';

const bulkOperationSchema = z.object({
  operation: z.enum(['approve', 'reject', 'delete', 'verify', 'unverify']),
  plantIds: z.array(z.number()).min(1),
});

export async function POST(request: NextRequest) {
  try {
    const { user } = await requireCuratorSession();
    const body = await request.json();
    const { operation, plantIds } = bulkOperationSchema.parse(body);

    let result;
    let auditAction;

    switch (operation) {
      case 'approve':
        result = await AdminPlantQueries.bulkApprovePlants(plantIds, user.id);
        auditAction = AUDIT_ACTIONS.BULK_OPERATION;
        break;

      case 'verify':
        const verifiedCount = await AdminPlantQueries.bulkUpdateVerification(plantIds, true);
        result = { approvedCount: verifiedCount, errors: [] };
        auditAction = AUDIT_ACTIONS.BULK_OPERATION;
        break;

      case 'unverify':
        const unverifiedCount = await AdminPlantQueries.bulkUpdateVerification(plantIds, false);
        result = { approvedCount: unverifiedCount, errors: [] };
        auditAction = AUDIT_ACTIONS.BULK_OPERATION;
        break;

      case 'delete':
        result = await AdminPlantQueries.bulkDeletePlants(plantIds);
        auditAction = AUDIT_ACTIONS.BULK_OPERATION;
        break;

      case 'reject':
        // For now, rejection is the same as deletion
        result = await AdminPlantQueries.bulkDeletePlants(plantIds);
        auditAction = AUDIT_ACTIONS.BULK_OPERATION;
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid operation' },
          { status: 400 }
        );
    }

    // Log the bulk operation
    await AuditLogger.logSystemAction(
      auditAction,
      user.id,
      {
        operation: `bulk_${operation}_plants`,
        plantIds,
        result,
        totalRequested: plantIds.length,
      }
    );

    let successCount = 0;
    if ('approvedCount' in result) {
      successCount = result.approvedCount;
    } else if ('deletedCount' in result) {
      successCount = result.deletedCount;
    }

    const success = result.errors.length === 0;

    return NextResponse.json({
      success,
      processedCount: successCount,
      errors: result.errors,
      message: `${successCount} plants ${operation}d successfully${
        result.errors.length > 0 ? `, ${result.errors.length} failed` : ''
      }`,
    });
  } catch (error) {
    console.error('Failed to perform bulk plant operation:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to perform bulk operation' },
      { status: 500 }
    );
  }
}