import 'server-only';

import { sql, desc, asc, eq, ilike, and, or, count } from 'drizzle-orm';
import { db } from '../index';
import { 
  users, 
  plantInstances, 
  propagations, 
  careHistory,
  sessions,
  type User 
} from '../schema';

export interface UserWithStats {
  id: number;
  name: string;
  email: string;
  isCurator: boolean;
  isEmailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  plantCount: number;
  propagationCount: number;
  careEntriesCount: number;
  lastActive?: Date;
}

export interface UserFilters {
  search?: string;
  curatorStatus?: 'all' | 'curators' | 'users';
  emailVerified?: boolean;
}

export interface UserSortConfig {
  field: 'name' | 'email' | 'createdAt' | 'plantCount' | 'lastActive';
  direction: 'asc' | 'desc';
}

export interface PaginatedUsers {
  users: UserWithStats[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export class AdminUserQueries {
  // Get paginated users with statistics and filtering
  static async getPaginatedUsers(
    page: number = 1,
    pageSize: number = 20,
    filters: UserFilters = {},
    sort: UserSortConfig = { field: 'createdAt', direction: 'desc' }
  ): Promise<PaginatedUsers> {
    try {
      const offset = (page - 1) * pageSize;
      
      // Build where conditions
      const whereConditions = [];
      
      if (filters.search) {
        whereConditions.push(
          or(
            ilike(users.name, `%${filters.search}%`),
            ilike(users.email, `%${filters.search}%`)
          )
        );
      }
      
      if (filters.curatorStatus === 'curators') {
        whereConditions.push(eq(users.isCurator, true));
      } else if (filters.curatorStatus === 'users') {
        whereConditions.push(eq(users.isCurator, false));
      }
      
      if (filters.emailVerified !== undefined) {
        whereConditions.push(eq(users.isEmailVerified, filters.emailVerified));
      }
      
      const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;
      
      // Build order by clause based on field type
      let orderByClause;
      switch (sort.field) {
        case 'plantCount':
          orderByClause = sort.direction === 'desc' 
            ? desc(sql`coalesce(plant_stats.plant_count, 0)`)
            : asc(sql`coalesce(plant_stats.plant_count, 0)`);
          break;
        case 'lastActive':
          orderByClause = sort.direction === 'desc' 
            ? desc(sql`session_stats.last_active`)
            : asc(sql`session_stats.last_active`);
          break;
        case 'name':
          orderByClause = sort.direction === 'desc' ? desc(users.name) : asc(users.name);
          break;
        case 'email':
          orderByClause = sort.direction === 'desc' ? desc(users.email) : asc(users.email);
          break;
        case 'createdAt':
        default:
          orderByClause = sort.direction === 'desc' ? desc(users.createdAt) : asc(users.createdAt);
          break;
      }
      
      // Get users with statistics
      const usersWithStats = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          isCurator: users.isCurator,
          isEmailVerified: users.isEmailVerified,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
          plantCount: sql<number>`coalesce(${sql`plant_stats.plant_count`}, 0)`,
          propagationCount: sql<number>`coalesce(${sql`prop_stats.propagation_count`}, 0)`,
          careEntriesCount: sql<number>`coalesce(${sql`care_stats.care_count`}, 0)`,
          lastActive: sql<Date | null>`${sql`session_stats.last_active`}`,
        })
        .from(users)
        .leftJoin(
          sql`(
            SELECT user_id, count(*) as plant_count 
            FROM plant_instances 
            WHERE is_active = true 
            GROUP BY user_id
          ) plant_stats`,
          sql`plant_stats.user_id = ${users.id}`
        )
        .leftJoin(
          sql`(
            SELECT user_id, count(*) as propagation_count 
            FROM propagations 
            GROUP BY user_id
          ) prop_stats`,
          sql`prop_stats.user_id = ${users.id}`
        )
        .leftJoin(
          sql`(
            SELECT user_id, count(*) as care_count 
            FROM care_history 
            GROUP BY user_id
          ) care_stats`,
          sql`care_stats.user_id = ${users.id}`
        )
        .leftJoin(
          sql`(
            SELECT user_id, max(expires_at) as last_active 
            FROM sessions 
            GROUP BY user_id
          ) session_stats`,
          sql`session_stats.user_id = ${users.id}`
        )
        .where(whereClause)
        .orderBy(orderByClause)
        .limit(pageSize)
        .offset(offset);
      
      // Get total count for pagination
      const [totalResult] = await db
        .select({ count: count() })
        .from(users)
        .where(whereClause);
      
      const totalCount = totalResult.count;
      const totalPages = Math.ceil(totalCount / pageSize);
      
      return {
        users: usersWithStats.map(user => ({
          ...user,
          plantCount: Number(user.plantCount),
          propagationCount: Number(user.propagationCount),
          careEntriesCount: Number(user.careEntriesCount),
          lastActive: user.lastActive || undefined,
        })),
        totalCount,
        page,
        pageSize,
        totalPages,
      };
    } catch (error) {
      console.error('Failed to get paginated users:', error);
      throw new Error('Failed to get users');
    }
  }

  // Get user details with full statistics
  static async getUserDetails(userId: number): Promise<UserWithStats | null> {
    try {
      const [userWithStats] = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          isCurator: users.isCurator,
          isEmailVerified: users.isEmailVerified,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
          plantCount: sql<number>`coalesce(${sql`plant_stats.plant_count`}, 0)`,
          propagationCount: sql<number>`coalesce(${sql`prop_stats.propagation_count`}, 0)`,
          careEntriesCount: sql<number>`coalesce(${sql`care_stats.care_count`}, 0)`,
          lastActive: sql<Date | null>`${sql`session_stats.last_active`}`,
        })
        .from(users)
        .leftJoin(
          sql`(
            SELECT user_id, count(*) as plant_count 
            FROM plant_instances 
            WHERE is_active = true 
            GROUP BY user_id
          ) plant_stats`,
          sql`plant_stats.user_id = ${users.id}`
        )
        .leftJoin(
          sql`(
            SELECT user_id, count(*) as propagation_count 
            FROM propagations 
            GROUP BY user_id
          ) prop_stats`,
          sql`prop_stats.user_id = ${users.id}`
        )
        .leftJoin(
          sql`(
            SELECT user_id, count(*) as care_count 
            FROM care_history 
            GROUP BY user_id
          ) care_stats`,
          sql`care_stats.user_id = ${users.id}`
        )
        .leftJoin(
          sql`(
            SELECT user_id, max(expires_at) as last_active 
            FROM sessions 
            GROUP BY user_id
          ) session_stats`,
          sql`session_stats.user_id = ${users.id}`
        )
        .where(eq(users.id, userId));
      
      if (!userWithStats) {
        return null;
      }
      
      return {
        ...userWithStats,
        plantCount: Number(userWithStats.plantCount),
        propagationCount: Number(userWithStats.propagationCount),
        careEntriesCount: Number(userWithStats.careEntriesCount),
        lastActive: userWithStats.lastActive || undefined,
      };
    } catch (error) {
      console.error('Failed to get user details:', error);
      throw new Error('Failed to get user details');
    }
  }

  // Promote user to curator
  static async promoteUserToCurator(userId: number, currentCuratorId: number): Promise<User> {
    try {
      // Prevent self-promotion (additional safety check)
      if (userId === currentCuratorId) {
        throw new Error('Cannot promote yourself');
      }
      
      const [updatedUser] = await db
        .update(users)
        .set({ 
          isCurator: true,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId))
        .returning();
      
      if (!updatedUser) {
        throw new Error('User not found');
      }
      
      return updatedUser;
    } catch (error) {
      console.error('Failed to promote user to curator:', error);
      throw new Error('Failed to promote user');
    }
  }

  // Demote curator to regular user
  static async demoteCuratorToUser(userId: number, currentCuratorId: number): Promise<User> {
    try {
      // Prevent self-demotion
      if (userId === currentCuratorId) {
        throw new Error('Cannot demote yourself');
      }
      
      const [updatedUser] = await db
        .update(users)
        .set({ 
          isCurator: false,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId))
        .returning();
      
      if (!updatedUser) {
        throw new Error('User not found');
      }
      
      return updatedUser;
    } catch (error) {
      console.error('Failed to demote curator to user:', error);
      throw new Error('Failed to demote curator');
    }
  }

  // Get curator count (to prevent demoting the last curator)
  static async getCuratorCount(): Promise<number> {
    try {
      const [result] = await db
        .select({ count: count() })
        .from(users)
        .where(eq(users.isCurator, true));
      
      return result.count;
    } catch (error) {
      console.error('Failed to get curator count:', error);
      throw new Error('Failed to get curator count');
    }
  }

  // Search users by name or email
  static async searchUsers(query: string, limit: number = 10): Promise<User[]> {
    try {
      const searchResults = await db
        .select()
        .from(users)
        .where(
          or(
            ilike(users.name, `%${query}%`),
            ilike(users.email, `%${query}%`)
          )
        )
        .orderBy(asc(users.name))
        .limit(limit);
      
      return searchResults;
    } catch (error) {
      console.error('Failed to search users:', error);
      throw new Error('Failed to search users');
    }
  }

  // Get user activity summary
  static async getUserActivitySummary(userId: number): Promise<{
    totalPlants: number;
    totalPropagations: number;
    totalCareEntries: number;
    recentActivity: Array<{
      type: 'plant' | 'propagation' | 'care';
      description: string;
      date: Date;
    }>;
  }> {
    try {
      // Get counts
      const [plantCount] = await db
        .select({ count: count() })
        .from(plantInstances)
        .where(and(eq(plantInstances.userId, userId), eq(plantInstances.isActive, true)));
      
      const [propagationCount] = await db
        .select({ count: count() })
        .from(propagations)
        .where(eq(propagations.userId, userId));
      
      const [careCount] = await db
        .select({ count: count() })
        .from(careHistory)
        .where(eq(careHistory.userId, userId));
      
      // Get recent activity (simplified - would be more complex in real app)
      const recentCare = await db
        .select({
          type: sql<'care'>`'care'`,
          description: sql<string>`'Care entry: ' || ${careHistory.careType}`,
          date: careHistory.careDate,
        })
        .from(careHistory)
        .where(eq(careHistory.userId, userId))
        .orderBy(desc(careHistory.careDate))
        .limit(5);
      
      return {
        totalPlants: plantCount.count,
        totalPropagations: propagationCount.count,
        totalCareEntries: careCount.count,
        recentActivity: recentCare,
      };
    } catch (error) {
      console.error('Failed to get user activity summary:', error);
      throw new Error('Failed to get user activity summary');
    }
  }
}