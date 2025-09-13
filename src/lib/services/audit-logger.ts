import 'server-only';
import { AuditLogQueries } from '../db/queries/audit-logs';
import { type NewAuditLog } from '../db/schema';
import { headers } from 'next/headers';

export interface AuditLogData {
  action: string;
  entityType: 'user' | 'plant' | 'plant_instance' | 'propagation' | 'system';
  entityId?: number;
  performedBy: number;
  details?: Record<string, any>;
  success?: boolean;
  errorMessage?: string;
}

export class AuditLogger {
  // Log an admin action
  static async logAction(data: AuditLogData): Promise<void> {
    try {
      const headersList = await headers();
      const ipAddress = headersList.get('x-forwarded-for') || 
                       headersList.get('x-real-ip') || 
                       'unknown';
      const userAgent = headersList.get('user-agent') || 'unknown';

      const auditLogData: NewAuditLog = {
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        performedBy: data.performedBy,
        details: data.details || {},
        ipAddress,
        userAgent,
        success: data.success ?? true,
        errorMessage: data.errorMessage,
      };

      await AuditLogQueries.createAuditLog(auditLogData);
    } catch (error) {
      // Log audit logging errors to console but don't throw
      // to avoid breaking the main operation
      console.error('Failed to create audit log:', error);
    }
  }

  // Log user management actions
  static async logUserAction(
    action: 'user_promoted' | 'user_demoted' | 'user_created' | 'user_updated' | 'user_deleted',
    userId: number,
    performedBy: number,
    details?: Record<string, any>
  ): Promise<void> {
    await this.logAction({
      action,
      entityType: 'user',
      entityId: userId,
      performedBy,
      details,
    });
  }

  // Log plant management actions
  static async logPlantAction(
    action: 'plant_approved' | 'plant_rejected' | 'plant_created' | 'plant_updated' | 'plant_deleted' | 'plant_merged',
    plantId: number,
    performedBy: number,
    details?: Record<string, any>
  ): Promise<void> {
    await this.logAction({
      action,
      entityType: 'plant',
      entityId: plantId,
      performedBy,
      details,
    });
  }

  // Log system actions
  static async logSystemAction(
    action: 'system_backup' | 'system_maintenance' | 'bulk_operation' | 'data_export',
    performedBy: number,
    details?: Record<string, any>
  ): Promise<void> {
    await this.logAction({
      action,
      entityType: 'system',
      performedBy,
      details,
    });
  }

  // Log failed actions
  static async logFailedAction(
    action: string,
    entityType: 'user' | 'plant' | 'plant_instance' | 'propagation' | 'system',
    performedBy: number,
    error: Error,
    entityId?: number,
    details?: Record<string, any>
  ): Promise<void> {
    await this.logAction({
      action,
      entityType,
      entityId,
      performedBy,
      details,
      success: false,
      errorMessage: error.message,
    });
  }

  // Wrapper for admin operations with automatic logging
  static async withAuditLog<T>(
    action: string,
    entityType: 'user' | 'plant' | 'plant_instance' | 'propagation' | 'system',
    performedBy: number,
    operation: () => Promise<T>,
    entityId?: number,
    details?: Record<string, any>
  ): Promise<T> {
    try {
      const result = await operation();
      
      await this.logAction({
        action,
        entityType,
        entityId,
        performedBy,
        details,
        success: true,
      });
      
      return result;
    } catch (error) {
      await this.logFailedAction(
        action,
        entityType,
        performedBy,
        error as Error,
        entityId,
        details
      );
      throw error;
    }
  }
}

// Audit action constants for consistency
export const AUDIT_ACTIONS = {
  // User actions
  USER_PROMOTED: 'user_promoted',
  USER_DEMOTED: 'user_demoted',
  USER_CREATED: 'user_created',
  USER_UPDATED: 'user_updated',
  USER_DELETED: 'user_deleted',
  
  // Plant actions
  PLANT_APPROVED: 'plant_approved',
  PLANT_REJECTED: 'plant_rejected',
  PLANT_CREATED: 'plant_created',
  PLANT_UPDATED: 'plant_updated',
  PLANT_DELETED: 'plant_deleted',
  PLANT_MERGED: 'plant_merged',
  
  // System actions
  SYSTEM_BACKUP: 'system_backup',
  SYSTEM_MAINTENANCE: 'system_maintenance',
  BULK_OPERATION: 'bulk_operation',
  DATA_EXPORT: 'data_export',
} as const;