import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { requireCuratorSession } from '@/lib/auth/server';
import { AdminUserQueries } from '@/lib/db/queries/admin-users';
import { AuditLogger, AUDIT_ACTIONS } from '@/lib/services/audit-logger';
import { z } from 'zod';

const bulkUserOperationSchema = z.object({
  operation: z.enum(['promote', 'demote']),
  userIds: z.array(z.number()).min(1),
});

export async function POST(request: NextRequest) {
  try {
    const { user } = await requireCuratorSession();
    const body = await request.json();
    const { operation, userIds } = bulkUserOperationSchema.parse(body);

    let result;

    switch (operation) {
      case 'promote':
        result = await AdminUserQueries.bulkPromoteUsers(userIds, user.id);
        break;

      case 'demote':
        result = await AdminUserQueries.bulkDemoteUsers(userIds, user.id);
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid operation' },
          { status: 400 }
        );
    }

    // Log the bulk operation
    await AuditLogger.logSystemAction(
      AUDIT_ACTIONS.BULK_OPERATION,
      user.id,
      {
        operation: `bulk_${operation}_users`,
        userIds,
        result,
        totalRequested: userIds.length,
      }
    );

    let successCount = 0;
    if ('promotedCount' in result) {
      successCount = result.promotedCount;
    } else if ('demotedCount' in result) {
      successCount = result.demotedCount;
    }

    const success = result.errors.length === 0;

    return NextResponse.json({
      success,
      processedCount: successCount,
      errors: result.errors,
      message: `${successCount} users ${operation}d successfully${
        result.errors.length > 0 ? `, ${result.errors.length} failed` : ''
      }`,
    });
  } catch (error) {
    console.error('Failed to perform bulk user operation:', error);
    
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