import 'server-only';

import { NextRequest, NextResponse } from 'next/server';
import { validateCuratorRequest } from './server';

/**
 * Middleware for protecting admin API routes
 * Validates curator session and returns appropriate responses
 */
export async function withCuratorAuth<T>(
  handler: (request: NextRequest, context: T, user: any, session: any) => Promise<NextResponse>
) {
  return async (request: NextRequest, context: T) => {
    const result = await validateCuratorRequest();
    
    if ('error' in result) {
      return NextResponse.json(
        { error: result.error },
        { status: result.error === 'Unauthorized' ? 401 : 403 }
      );
    }
    
    return handler(request, context, result.user, result.session);
  };
}

/**
 * Admin route protection utility for server components
 * Throws redirect if user is not a curator
 */
export async function requireAdminAccess() {
  const { requireCuratorSession } = await import('./server');
  return await requireCuratorSession();
}

/**
 * Check admin access without throwing (for conditional rendering)
 */
export async function checkAdminAccess() {
  const { getCuratorStatus } = await import('./server');
  return await getCuratorStatus();
}