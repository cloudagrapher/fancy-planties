import 'server-only';

import { redirect } from 'next/navigation';
import { validateRequest, validateCuratorRequest } from './server';
import type { User, Session } from '../db/schema';

export interface AuthResult {
  user: User;
  session: Session;
}

export interface AuthError {
  type: 'unauthorized' | 'forbidden' | 'session_expired' | 'email_unverified' | 'curator_required';
  message: string;
  redirectTo?: string;
}

// Enhanced authorization with detailed error handling
export async function requireAdminAuth(): Promise<AuthResult> {
  const result = await validateCuratorRequest();
  
  if ('error' in result) {
    const authError = mapAuthError(result.error);
    
    // Log the authorization attempt for audit purposes
    console.warn('Admin authorization failed:', {
      error: result.error,
      timestamp: new Date().toISOString(),
      userAgent: process.env.NODE_ENV === 'development' ? 'dev' : 'unknown',
    });
    
    // Redirect based on error type
    switch (authError.type) {
      case 'unauthorized':
        redirect('/auth/signin?returnTo=/admin&reason=unauthorized');
      case 'session_expired':
        redirect('/auth/signin?returnTo=/admin&reason=session_expired');
      case 'email_unverified':
        redirect('/auth/verify-email?returnTo=/admin');
      case 'curator_required':
        redirect('/dashboard?error=curator_required');
      default:
        redirect('/auth/signin?returnTo=/admin');
    }
  }
  
  return result;
}

// API route authorization with detailed error responses
export async function validateAdminApiRequest(): Promise<
  { success: true; user: User; session: Session } | 
  { success: false; error: AuthError; status: number }
> {
  const result = await validateCuratorRequest();
  
  if ('error' in result) {
    const authError = mapAuthError(result.error);
    const status = getHttpStatusForAuthError(authError.type);
    
    // Log API authorization failure
    console.warn('Admin API authorization failed:', {
      error: result.error,
      timestamp: new Date().toISOString(),
      endpoint: 'unknown', // Would be passed in real implementation
    });
    
    return {
      success: false,
      error: authError,
      status,
    };
  }
  
  return {
    success: true,
    user: result.user,
    session: result.session,
  };
}

// Map auth errors to structured error types
function mapAuthError(errorMessage: string): AuthError {
  if (errorMessage === 'Unauthorized') {
    return {
      type: 'unauthorized',
      message: 'You must be signed in to access admin features.',
      redirectTo: '/auth/signin',
    };
  }
  
  if (errorMessage === 'Email verification required') {
    return {
      type: 'email_unverified',
      message: 'Please verify your email address before accessing admin features.',
      redirectTo: '/auth/verify-email',
    };
  }
  
  if (errorMessage === 'Curator privileges required') {
    return {
      type: 'curator_required',
      message: 'You need curator privileges to access this feature.',
      redirectTo: '/dashboard',
    };
  }
  
  // Default to session expired for other cases
  return {
    type: 'session_expired',
    message: 'Your session has expired. Please sign in again.',
    redirectTo: '/auth/signin',
  };
}

// Get appropriate HTTP status code for auth error
function getHttpStatusForAuthError(errorType: AuthError['type']): number {
  switch (errorType) {
    case 'unauthorized':
    case 'session_expired':
      return 401;
    case 'forbidden':
    case 'curator_required':
      return 403;
    case 'email_unverified':
      return 403;
    default:
      return 401;
  }
}

// Check specific admin permissions
export async function checkAdminPermission(permission: AdminPermission): Promise<boolean> {
  try {
    const result = await validateCuratorRequest();
    
    if ('error' in result) {
      return false;
    }
    
    // All curators have all admin permissions for now
    // This could be extended to support role-based permissions
    return true;
  } catch {
    return false;
  }
}

export type AdminPermission = 
  | 'manage_users'
  | 'manage_plants'
  | 'approve_plants'
  | 'view_audit_logs'
  | 'manage_taxonomy'
  | 'bulk_operations'
  | 'export_data';

// Permission-specific authorization
export async function requirePermission(permission: AdminPermission): Promise<AuthResult> {
  const authResult = await requireAdminAuth();
  
  const hasPermission = await checkAdminPermission(permission);
  if (!hasPermission) {
    console.warn('Permission denied:', {
      userId: authResult.user.id,
      permission,
      timestamp: new Date().toISOString(),
    });
    
    redirect('/admin?error=insufficient_permissions');
  }
  
  return authResult;
}

// Validate API request with specific permission
export async function validateApiPermission(permission: AdminPermission): Promise<
  { success: true; user: User; session: Session } | 
  { success: false; error: AuthError; status: number }
> {
  const authResult = await validateAdminApiRequest();
  
  if (!authResult.success) {
    return authResult;
  }
  
  const hasPermission = await checkAdminPermission(permission);
  if (!hasPermission) {
    console.warn('API permission denied:', {
      userId: authResult.user.id,
      permission,
      timestamp: new Date().toISOString(),
    });
    
    return {
      success: false,
      error: {
        type: 'forbidden',
        message: `You don't have permission to ${permission.replace('_', ' ')}.`,
      },
      status: 403,
    };
  }
  
  return authResult;
}

// Session validation with enhanced error handling
export async function validateAdminSession(): Promise<{
  isValid: boolean;
  user?: User;
  session?: Session;
  error?: AuthError;
}> {
  try {
    const result = await validateRequest();
    
    if (!result.user || !result.session) {
      return {
        isValid: false,
        error: {
          type: 'unauthorized',
          message: 'No valid session found.',
          redirectTo: '/auth/signin',
        },
      };
    }
    
    if (!result.user.isEmailVerified) {
      return {
        isValid: false,
        error: {
          type: 'email_unverified',
          message: 'Email verification required.',
          redirectTo: '/auth/verify-email',
        },
      };
    }
    
    if (!result.user.isCurator) {
      return {
        isValid: false,
        error: {
          type: 'curator_required',
          message: 'Curator privileges required.',
          redirectTo: '/dashboard',
        },
      };
    }
    
    return {
      isValid: true,
      user: result.user,
      session: result.session,
    };
  } catch (error) {
    console.error('Session validation error:', error);
    
    return {
      isValid: false,
      error: {
        type: 'session_expired',
        message: 'Session validation failed.',
        redirectTo: '/auth/signin',
      },
    };
  }
}

// Audit logging for admin actions
export async function logAdminAction(
  action: string,
  entityType: 'user' | 'plant' | 'system',
  entityId?: number,
  details?: Record<string, any>
): Promise<void> {
  try {
    const { user } = await requireAdminAuth();
    
    // This would typically insert into an audit log table
    console.log('Admin action logged:', {
      action,
      entityType,
      entityId,
      performedBy: user.id,
      performedByName: user.name,
      timestamp: new Date().toISOString(),
      details,
    });
    
    // In a real implementation, this would insert into the database:
    // await db.insert(auditLogs).values({
    //   action,
    //   entityType,
    //   entityId,
    //   performedBy: user.id,
    //   timestamp: new Date(),
    //   details: JSON.stringify(details),
    // });
  } catch (error) {
    console.error('Failed to log admin action:', error);
    // Don't throw - logging failures shouldn't break the main operation
  }
}