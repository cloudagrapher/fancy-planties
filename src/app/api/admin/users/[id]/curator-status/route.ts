import { NextRequest, NextResponse } from 'next/server';
import { validateCuratorRequest } from '@/lib/auth/server';
import { AdminUserQueries } from '@/lib/db/queries/admin-users';
import { z } from 'zod';

const curatorStatusSchema = z.object({
  action: z.enum(['promote', 'demote']),
});

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Validate curator access
    const authResult = await validateCuratorRequest();
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.error === 'Unauthorized' ? 401 : 403 }
      );
    }

    const { user: currentUser } = authResult;
    const { id } = await context.params;
    const userId = parseInt(id);
    
    if (isNaN(userId)) {
      return NextResponse.json(
        { error: 'Invalid user ID' },
        { status: 400 }
      );
    }
    
    // Parse request body
    const body = await request.json();
    const { action } = curatorStatusSchema.parse(body);
    
    // Prevent self-modification
    if (userId === currentUser.id) {
      return NextResponse.json(
        { error: 'Cannot modify your own curator status' },
        { status: 400 }
      );
    }
    
    let updatedUser;
    
    if (action === 'promote') {
      updatedUser = await AdminUserQueries.promoteUserToCurator(userId, currentUser.id);
    } else {
      // Check if this is the last curator
      const curatorCount = await AdminUserQueries.getCuratorCount();
      if (curatorCount <= 1) {
        return NextResponse.json(
          { error: 'Cannot demote the last curator' },
          { status: 400 }
        );
      }
      
      updatedUser = await AdminUserQueries.demoteCuratorToUser(userId, currentUser.id);
    }
    
    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: action === 'promote' 
        ? 'User promoted to curator successfully' 
        : 'Curator demoted to user successfully',
    });
  } catch (error) {
    console.error('Failed to update curator status:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to update curator status';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}