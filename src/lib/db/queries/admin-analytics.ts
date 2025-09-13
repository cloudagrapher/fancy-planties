import 'server-only';

import { sql, desc, gte, lte, and, eq } from 'drizzle-orm';
import { db } from '../index';
import { 
  users, 
  plants, 
  plantInstances, 
  propagations, 
  careHistory,
  sessions,
  type User,
  type Plant
} from '../schema';

export interface AdminDashboardStats {
  users: {
    total: number;
    curators: number;
    newThisMonth: number;
    activeThisWeek: number;
    emailVerified: number;
  };
  plants: {
    total: number;
    verified: number;
    pendingApproval: number;
    submittedThisMonth: number;
  };
  activity: {
    recentRegistrations: User[];
    recentSubmissions: Plant[];
    totalInstances: number;
    totalPropagations: number;
    totalCareEntries: number;
  };
  systemHealth: {
    activeSessions: number;
    lastWeekRegistrations: number;
    lastWeekSubmissions: number;
  };
}

export class AdminAnalyticsQueries {
  // Get comprehensive dashboard statistics
  static async getDashboardStats(): Promise<AdminDashboardStats> {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - 7);

      // Get user statistics
      const [userStats] = await db
        .select({
          total: sql<number>`count(*)`,
          curators: sql<number>`count(*) filter (where ${users.isCurator} = true)`,
          newThisMonth: sql<number>`count(*) filter (where ${users.createdAt} >= ${startOfMonth})`,
          activeThisWeek: sql<number>`count(*) filter (where ${users.createdAt} >= ${startOfWeek})`,
          emailVerified: sql<number>`count(*) filter (where ${users.isEmailVerified} = true)`,
        })
        .from(users);

      // Get plant statistics
      const [plantStats] = await db
        .select({
          total: sql<number>`count(*)`,
          verified: sql<number>`count(*) filter (where ${plants.isVerified} = true)`,
          pendingApproval: sql<number>`count(*) filter (where ${plants.isVerified} = false)`,
          submittedThisMonth: sql<number>`count(*) filter (where ${plants.createdAt} >= ${startOfMonth})`,
        })
        .from(plants);

      // Get activity statistics
      const [activityStats] = await db
        .select({
          totalInstances: sql<number>`count(*)`,
        })
        .from(plantInstances);

      const [propagationStats] = await db
        .select({
          totalPropagations: sql<number>`count(*)`,
        })
        .from(propagations);

      const [careStats] = await db
        .select({
          totalCareEntries: sql<number>`count(*)`,
        })
        .from(careHistory);

      // Get system health statistics
      const [systemStats] = await db
        .select({
          activeSessions: sql<number>`count(*)`,
        })
        .from(sessions)
        .where(gte(sessions.expiresAt, now));

      const [weeklyRegistrations] = await db
        .select({
          lastWeekRegistrations: sql<number>`count(*)`,
        })
        .from(users)
        .where(gte(users.createdAt, startOfWeek));

      const [weeklySubmissions] = await db
        .select({
          lastWeekSubmissions: sql<number>`count(*)`,
        })
        .from(plants)
        .where(gte(plants.createdAt, startOfWeek));

      // Get recent registrations (last 10)
      const recentRegistrations = await db
        .select()
        .from(users)
        .orderBy(desc(users.createdAt))
        .limit(10);

      // Get recent plant submissions (last 10)
      const recentSubmissions = await db
        .select()
        .from(plants)
        .orderBy(desc(plants.createdAt))
        .limit(10);

      return {
        users: {
          total: Number(userStats.total),
          curators: Number(userStats.curators),
          newThisMonth: Number(userStats.newThisMonth),
          activeThisWeek: Number(userStats.activeThisWeek),
          emailVerified: Number(userStats.emailVerified),
        },
        plants: {
          total: Number(plantStats.total),
          verified: Number(plantStats.verified),
          pendingApproval: Number(plantStats.pendingApproval),
          submittedThisMonth: Number(plantStats.submittedThisMonth),
        },
        activity: {
          recentRegistrations,
          recentSubmissions,
          totalInstances: Number(activityStats.totalInstances),
          totalPropagations: Number(propagationStats.totalPropagations),
          totalCareEntries: Number(careStats.totalCareEntries),
        },
        systemHealth: {
          activeSessions: Number(systemStats.activeSessions),
          lastWeekRegistrations: Number(weeklyRegistrations.lastWeekRegistrations),
          lastWeekSubmissions: Number(weeklySubmissions.lastWeekSubmissions),
        },
      };
    } catch (error) {
      console.error('Failed to get dashboard stats:', error);
      throw new Error('Failed to get dashboard statistics');
    }
  }

  // Get user growth data for charts (last 30 days)
  static async getUserGrowthData(): Promise<Array<{ date: string; count: number }>> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const growthData = await db
        .select({
          date: sql<string>`date(${users.createdAt})`,
          count: sql<number>`count(*)`,
        })
        .from(users)
        .where(gte(users.createdAt, thirtyDaysAgo))
        .groupBy(sql`date(${users.createdAt})`)
        .orderBy(sql`date(${users.createdAt})`);

      return growthData.map(row => ({
        date: row.date,
        count: Number(row.count),
      }));
    } catch (error) {
      console.error('Failed to get user growth data:', error);
      throw new Error('Failed to get user growth data');
    }
  }

  // Get plant submission trends (last 30 days)
  static async getPlantSubmissionTrends(): Promise<Array<{ date: string; verified: number; pending: number }>> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const trendData = await db
        .select({
          date: sql<string>`date(${plants.createdAt})`,
          verified: sql<number>`count(*) filter (where ${plants.isVerified} = true)`,
          pending: sql<number>`count(*) filter (where ${plants.isVerified} = false)`,
        })
        .from(plants)
        .where(gte(plants.createdAt, thirtyDaysAgo))
        .groupBy(sql`date(${plants.createdAt})`)
        .orderBy(sql`date(${plants.createdAt})`);

      return trendData.map(row => ({
        date: row.date,
        verified: Number(row.verified),
        pending: Number(row.pending),
      }));
    } catch (error) {
      console.error('Failed to get plant submission trends:', error);
      throw new Error('Failed to get plant submission trends');
    }
  }

  // Get top plant families by usage
  static async getTopPlantFamilies(limit: number = 10): Promise<Array<{ family: string; count: number }>> {
    try {
      const familyData = await db
        .select({
          family: plants.family,
          count: sql<number>`count(${plantInstances.id})`,
        })
        .from(plants)
        .leftJoin(plantInstances, eq(plants.id, plantInstances.plantId))
        .where(eq(plants.isVerified, true))
        .groupBy(plants.family)
        .orderBy(desc(sql`count(${plantInstances.id})`))
        .limit(limit);

      return familyData.map(row => ({
        family: row.family,
        count: Number(row.count),
      }));
    } catch (error) {
      console.error('Failed to get top plant families:', error);
      throw new Error('Failed to get top plant families');
    }
  }

  // Get curator activity summary
  static async getCuratorActivity(): Promise<Array<{ 
    curatorId: number; 
    curatorName: string; 
    plantsApproved: number; 
    usersPromoted: number;
  }>> {
    try {
      // This is a simplified version - in a real app you'd have audit logs
      const curatorActivity = await db
        .select({
          curatorId: users.id,
          curatorName: users.name,
          plantsApproved: sql<number>`count(${plants.id}) filter (where ${plants.isVerified} = true and ${plants.createdBy} != ${users.id})`,
        })
        .from(users)
        .leftJoin(plants, eq(users.id, plants.createdBy))
        .where(eq(users.isCurator, true))
        .groupBy(users.id, users.name)
        .orderBy(desc(sql`count(${plants.id})`));

      return curatorActivity.map(row => ({
        curatorId: row.curatorId,
        curatorName: row.curatorName,
        plantsApproved: Number(row.plantsApproved),
        usersPromoted: 0, // Would come from audit logs in real implementation
      }));
    } catch (error) {
      console.error('Failed to get curator activity:', error);
      throw new Error('Failed to get curator activity');
    }
  }

  // Get pending approval count for navigation badge
  static async getPendingApprovalCount(): Promise<number> {
    try {
      const [result] = await db
        .select({
          count: sql<number>`count(*)`,
        })
        .from(plants)
        .where(eq(plants.isVerified, false));

      return Number(result.count);
    } catch (error) {
      console.error('Failed to get pending approval count:', error);
      return 0;
    }
  }

  // Get system alerts (simplified version)
  static async getSystemAlerts(): Promise<Array<{ 
    type: 'info' | 'warning' | 'error'; 
    message: string; 
    timestamp: Date;
  }>> {
    try {
      const alerts = [];
      
      // Check for high pending approval count
      const pendingCount = await this.getPendingApprovalCount();
      if (pendingCount > 50) {
        alerts.push({
          type: 'warning' as const,
          message: `High number of pending plant approvals: ${pendingCount}`,
          timestamp: new Date(),
        });
      }

      // Check for inactive curators (no recent activity)
      const activeCurators = await db
        .select({
          count: sql<number>`count(*)`,
        })
        .from(users)
        .where(
          and(
            eq(users.isCurator, true),
            gte(users.createdAt, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
          )
        );

      if (Number(activeCurators[0].count) === 0) {
        alerts.push({
          type: 'info' as const,
          message: 'No curator activity in the last 30 days',
          timestamp: new Date(),
        });
      }

      return alerts;
    } catch (error) {
      console.error('Failed to get system alerts:', error);
      return [];
    }
  }
}