import 'server-only';
import { db } from '@/lib/db';
import { users, plants, plantInstances, propagations, careHistory } from '@/lib/db/schema';
import { sql, count, desc, and, gte, eq } from 'drizzle-orm';

export interface AdminDashboardStats {
  users: {
    total: number;
    curators: number;
    newThisMonth: number;
    activeThisWeek: number;
  };
  plants: {
    total: number;
    verified: number;
    pendingApproval: number;
    submittedThisMonth: number;
  };
  activity: {
    recentRegistrations: Array<{
      id: number;
      name: string;
      email: string;
      createdAt: Date;
    }>;
    recentSubmissions: Array<{
      id: number;
      commonName: string;
      genus: string;
      species: string;
      createdAt: Date;
    }>;
    recentApprovals: Array<{
      plantId: number;
      curatorName: string;
      notes?: string;
    }>;
  };
  systemHealth: {
    databaseSize: string;
    activeConnections: number;
    lastBackup?: Date;
    alerts: Array<{
      severity: 'info' | 'warning' | 'critical';
      title: string;
      message: string;
    }>;
  };
}

export class AdminDashboardQueries {
  static async getDashboardStats(): Promise<AdminDashboardStats> {
    const now = new Date();
    const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    try {
      // Get user statistics
      const [
        totalUsers,
        totalCurators,
        newUsersThisMonth,
        activeUsersThisWeek,
      ] = await Promise.all([
        db.select({ count: count() }).from(users),
        db.select({ count: count() }).from(users).where(eq(users.isCurator, true)),
        db.select({ count: count() }).from(users).where(gte(users.createdAt, oneMonthAgo)),
        // For now, use updatedAt as a proxy for activity since lastActiveAt doesn't exist
        db.select({ count: count() }).from(users).where(gte(users.updatedAt, oneWeekAgo)),
      ]);

      // Get plant statistics
      const [
        totalPlants,
        verifiedPlants,
        pendingPlants,
        submittedPlantsThisMonth,
      ] = await Promise.all([
        db.select({ count: count() }).from(plants),
        db.select({ count: count() }).from(plants).where(eq(plants.isVerified, true)),
        db.select({ count: count() }).from(plants).where(eq(plants.isVerified, false)),
        db.select({ count: count() }).from(plants).where(gte(plants.createdAt, oneMonthAgo)),
      ]);

      // Get recent activity
      const [recentRegistrations, recentSubmissions] = await Promise.all([
        db
          .select({
            id: users.id,
            name: users.name,
            email: users.email,
            createdAt: users.createdAt,
          })
          .from(users)
          .orderBy(desc(users.createdAt))
          .limit(10),
        db
          .select({
            id: plants.id,
            commonName: plants.commonName,
            genus: plants.genus,
            species: plants.species,
            createdAt: plants.createdAt,
          })
          .from(plants)
          .orderBy(desc(plants.createdAt))
          .limit(10),
      ]);

      // Get system health information
      const systemHealth = await this.getSystemHealth();

      return {
        users: {
          total: totalUsers[0]?.count || 0,
          curators: totalCurators[0]?.count || 0,
          newThisMonth: newUsersThisMonth[0]?.count || 0,
          activeThisWeek: activeUsersThisWeek[0]?.count || 0,
        },
        plants: {
          total: totalPlants[0]?.count || 0,
          verified: verifiedPlants[0]?.count || 0,
          pendingApproval: pendingPlants[0]?.count || 0,
          submittedThisMonth: submittedPlantsThisMonth[0]?.count || 0,
        },
        activity: {
          recentRegistrations: recentRegistrations || [],
          recentSubmissions: recentSubmissions || [],
          recentApprovals: [], // TODO: Implement when audit logs are available
        },
        systemHealth,
      };
    } catch (error) {
      console.error('Failed to get dashboard stats:', error);
      throw new Error('Failed to retrieve dashboard statistics');
    }
  }

  private static async getSystemHealth(): Promise<AdminDashboardStats['systemHealth']> {
    const alerts: AdminDashboardStats['systemHealth']['alerts'] = [];

    try {
      // Get database size (PostgreSQL specific)
      const dbSizeResult = await db.execute(
        sql`SELECT pg_size_pretty(pg_database_size(current_database())) as size`
      );
      const databaseSize = (dbSizeResult[0] as any)?.size as string || 'Unknown';

      // Get active connections
      const connectionsResult = await db.execute(
        sql`SELECT count(*) as active_connections FROM pg_stat_activity WHERE state = 'active'`
      );
      const activeConnections = Number((connectionsResult[0] as any)?.active_connections) || 0;

      // Check for potential issues
      if (activeConnections > 50) {
        alerts.push({
          severity: 'warning',
          title: 'High Database Connections',
          message: `Currently ${activeConnections} active connections. Consider monitoring for connection leaks.`,
        });
      }

      // Check for unverified plants that need attention
      const unverifiedCount = await db
        .select({ count: count() })
        .from(plants)
        .where(eq(plants.isVerified, false));

      if ((unverifiedCount[0]?.count || 0) > 20) {
        alerts.push({
          severity: 'info',
          title: 'Plants Pending Verification',
          message: `${unverifiedCount[0]?.count} plants are waiting for curator verification.`,
        });
      }

      return {
        databaseSize,
        activeConnections,
        lastBackup: undefined, // TODO: Implement backup tracking
        alerts,
      };
    } catch (error) {
      console.error('Failed to get system health:', error);
      return {
        databaseSize: 'Unknown',
        activeConnections: 0,
        alerts: [
          {
            severity: 'critical',
            title: 'System Health Check Failed',
            message: 'Unable to retrieve system health information.',
          },
        ],
      };
    }
  }

  static async getRecentActivity() {
    try {
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      // Get recent user registrations
      const recentUsers = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(gte(users.createdAt, oneWeekAgo))
        .orderBy(desc(users.createdAt))
        .limit(5);

      // Get recent plant submissions
      const recentPlants = await db
        .select({
          id: plants.id,
          commonName: plants.commonName,
          genus: plants.genus,
          species: plants.species,
          createdAt: plants.createdAt,
        })
        .from(plants)
        .where(gte(plants.createdAt, oneWeekAgo))
        .orderBy(desc(plants.createdAt))
        .limit(5);

      return {
        recentUsers,
        recentPlants,
      };
    } catch (error) {
      console.error('Failed to get recent activity:', error);
      throw new Error('Failed to retrieve recent activity');
    }
  }
}