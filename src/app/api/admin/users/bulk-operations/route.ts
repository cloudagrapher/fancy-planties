import { NextRequest, NextResponse } from 'next/server';
import { validateApiPermission, logAdminAction } from '@/lib/auth/admin-auth';
import { AdminUserQueries } from '@/lib/db/queries/admin-users';
import { safeValidate, bulkUserOperationSchema } from '@/lib/validation/admin-schemas';

export async function POST(request: NextRequest) {
  try {
    // Validate admin permission
    const authResult = await validateApiPermission('manage_users');
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error.message },
        { status: authResult.status }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = safeValidate(bulkUserOperationSchema, body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid bulk operation parameters', details: validation.errors },
        { status: 400 }
      );
    }

    const { operation, userIds } = validation.data;
    const currentUserId = authResult.user.id;

    // Prevent self-demotion
    if (operation === 'demote' && userIds.includes(currentUserId)) {
      return NextResponse.json(
        { error: 'Cannot demote yourself from curator status' },
        { status: 400 }
      );
    }

    // Process bulk operation
    const results = {
      success: [] as number[],
      errors: [] as Array<{ id: number; error: string }>,
    };

    for (const userId of userIds) {
      try {
        switch (operation) {
          case 'promote':
            await AdminUserQueries.promoteUserToCurator(userId, currentUserId);
            results.success.push(userId);
            break;
            
          case 'demote':
            // Additional check to prevent demoting the last curator
            const curatorCount = await AdminUserQueries.getCuratorCount();
            if (curatorCount <= 1) {
              results.errors.push({
                id: userId,
                error: 'Cannot demote the last curator',
              });
              continue;
            }
            
            await AdminUserQueries.demoteCuratorToUser(userId, currentUserId);
            results.success.push(userId);
            break;
            
          default:
            results.errors.push({
              id: userId,
              error: `Unsupported operation: ${operation}`,
            });
        }
      } catch (error) {
        console.error(`Bulk operation failed for user ${userId}:`, error);
        results.errors.push({
          id: userId,
          error: error instanceof Error ? error.message : 'Operation failed',
        });
      }
    }

    // Log the bulk operation
    await logAdminAction(`bulk_${operation}`, 'user', undefined, {
      operation,
      userIds,
      successCount: results.success.length,
      errorCount: results.errors.length,
      errors: results.errors,
    });

    // Determine response status
    const hasErrors = results.errors.length > 0;
    const hasSuccesses = results.success.length > 0;
    
    let status = 200;
    let message = '';
    
    if (hasSuccesses && !hasErrors) {
      message = `Successfully ${operation}d ${results.success.length} users`;
    } else if (hasSuccesses && hasErrors) {
      status = 207; // Multi-status
      message = `Partially completed: ${results.success.length} succeeded, ${results.errors.length} failed`;
    } else {
      status = 400;
      message = `All operations failed`;
    }

    return NextResponse.json(
      {
        message,
        success: results.success,
        errors: results.errors,
        successCount: results.success.length,
        errorCount: results.errors.length,
      },
      { status }
    );
  } catch (error) {
    console.error('Bulk operation error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Bulk operation failed';
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}