import 'server-only';
import { db } from '../index';
import { auditLogs, users, type AuditLog, type NewAuditLog } from '../schema';
import { eq, desc, and, gte, lte, ilike, or, count } from 'drizzle-orm';

export interface AuditLogFilters {
  action?: string;
  entityType?: 'user' | 'plant' | 'plant_instance' | 'propagation' | 'system';
  performedBy?: number;
  startDate?: Date;
  endDate?: Date;
  success?: boolean;
  search?: string;
}

export interface AuditLogWithUser extends AuditLog {
  performedByUser: {
    id: number;
    name: string;
    email: string;
  };
}

export class AuditLogQueries {
  // Create a new audit log entry
  static async createAuditLog(data: NewAuditLog): Promise<AuditLog> {
    const [auditLog] = await db.insert(auditLogs).values(data).returning();
    return auditLog;
  }

  // Get paginated audit logs with filtering
  static async getPaginatedAuditLogs(
    filters: AuditLogFilters = {},
    page: number = 1,
    pageSize: number = 50
  ): Promise<{
    logs: AuditLogWithUser[];
    totalCount: number;
    totalPages: number;
  }> {
    const offset = (page - 1) * pageSize;
    
    // Build where conditions
    const whereConditions = [];
    
    if (filters.action) {
      whereConditions.push(eq(auditLogs.action, filters.action));
    }
    
    if (filters.entityType) {
      whereConditions.push(eq(auditLogs.entityType, filters.entityType));
    }
    
    if (filters.performedBy) {
      whereConditions.push(eq(auditLogs.performedBy, filters.performedBy));
    }
    
    if (filters.startDate) {
      whereConditions.push(gte(auditLogs.timestamp, filters.startDate));
    }
    
    if (filters.endDate) {
      whereConditions.push(lte(auditLogs.timestamp, filters.endDate));
    }
    
    if (filters.success !== undefined) {
      whereConditions.push(eq(auditLogs.success, filters.success));
    }
    
    if (filters.search) {
      whereConditions.push(
        or(
          ilike(auditLogs.action, `%${filters.search}%`),
          ilike(users.name, `%${filters.search}%`),
          ilike(users.email, `%${filters.search}%`)
        )
      );
    }

    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

    // Get total count
    const [{ totalCount }] = await db
      .select({ totalCount: count() })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.performedBy, users.id))
      .where(whereClause);

    // Get paginated results
    const logs = await db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        entityType: auditLogs.entityType,
        entityId: auditLogs.entityId,
        performedBy: auditLogs.performedBy,
        timestamp: auditLogs.timestamp,
        details: auditLogs.details,
        ipAddress: auditLogs.ipAddress,
        userAgent: auditLogs.userAgent,
        success: auditLogs.success,
        errorMessage: auditLogs.errorMessage,
        performedByUser: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.performedBy, users.id))
      .where(whereClause)
      .orderBy(desc(auditLogs.timestamp))
      .limit(pageSize)
      .offset(offset);

    return {
      logs: logs as AuditLogWithUser[],
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
    };
  }

  // Get audit logs for a specific entity
  static async getEntityAuditLogs(
    entityType: 'user' | 'plant' | 'plant_instance' | 'propagation' | 'system',
    entityId: number,
    limit: number = 20
  ): Promise<AuditLogWithUser[]> {
    const logs = await db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        entityType: auditLogs.entityType,
        entityId: auditLogs.entityId,
        performedBy: auditLogs.performedBy,
        timestamp: auditLogs.timestamp,
        details: auditLogs.details,
        ipAddress: auditLogs.ipAddress,
        userAgent: auditLogs.userAgent,
        success: auditLogs.success,
        errorMessage: auditLogs.errorMessage,
        performedByUser: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.performedBy, users.id))
      .where(
        and(
          eq(auditLogs.entityType, entityType),
          eq(auditLogs.entityId, entityId)
        )
      )
      .orderBy(desc(auditLogs.timestamp))
      .limit(limit);

    return logs as AuditLogWithUser[];
  }

  // Get recent audit logs for dashboard
  static async getRecentAuditLogs(limit: number = 10): Promise<AuditLogWithUser[]> {
    const logs = await db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        entityType: auditLogs.entityType,
        entityId: auditLogs.entityId,
        performedBy: auditLogs.performedBy,
        timestamp: auditLogs.timestamp,
        details: auditLogs.details,
        ipAddress: auditLogs.ipAddress,
        userAgent: auditLogs.userAgent,
        success: auditLogs.success,
        errorMessage: auditLogs.errorMessage,
        performedByUser: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.performedBy, users.id))
      .orderBy(desc(auditLogs.timestamp))
      .limit(limit);

    return logs as AuditLogWithUser[];
  }

  // Get audit statistics
  static async getAuditStats(): Promise<{
    totalLogs: number;
    todayLogs: number;
    failedActions: number;
    topActions: Array<{ action: string; count: number }>;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get total logs count
    const [{ totalLogs }] = await db
      .select({ totalLogs: count() })
      .from(auditLogs);

    // Get today's logs count
    const [{ todayLogs }] = await db
      .select({ todayLogs: count() })
      .from(auditLogs)
      .where(gte(auditLogs.timestamp, today));

    // Get failed actions count
    const [{ failedActions }] = await db
      .select({ failedActions: count() })
      .from(auditLogs)
      .where(eq(auditLogs.success, false));

    // Get top actions (this would need a more complex query in production)
    const topActionsResult = await db
      .select({
        action: auditLogs.action,
        count: count(),
      })
      .from(auditLogs)
      .groupBy(auditLogs.action)
      .orderBy(desc(count()))
      .limit(5);

    return {
      totalLogs,
      todayLogs,
      failedActions,
      topActions: topActionsResult.map(row => ({
        action: row.action,
        count: Number(row.count),
      })),
    };
  }
}