import { NextRequest, NextResponse } from 'next/server';
import { validateRequest } from '@/lib/auth/server';
import { db } from '@/lib/db';
import { plantInstances, propagations } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';

export interface FertilizerEvent {
  id: string;
  plantName: string;
  plantId: string;
  date: string;
  type: 'fertilize';
}

export interface DashboardStats {
  totalPlants: number;
  activePlants: number;
  careDueToday: number;
  overdueCount: number;
  totalPropagations: number;
  activePropagations: number;
  successfulPropagations: number;
  propagationSuccessRate: number;
  fertilizerEvents: FertilizerEvent[];
}

// GET /api/dashboard - Get dashboard statistics
export async function GET(request: NextRequest) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.id;
    // Build date boundaries for "today" — start of day to end of day
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    // Run plant stats + propagation stats in parallel (independent queries)
    const [plantStatsResult, propagationStatsResult] = await Promise.all([
      // Combined query: plant stats + fertilizer events in one round-trip
      // Uses a CTE to avoid scanning plant_instances twice
      db.execute<{
        total_plants: number;
        active_plants: number;
        care_due_today: number;
        overdue_count: number;
        event_id: number | null;
        event_nickname: string | null;
        event_fertilizer_due: string | null;
      }>(sql`
        WITH plant_stats AS (
          SELECT
            count(*) AS total_plants,
            count(*) FILTER (WHERE ${plantInstances.isActive} = true) AS active_plants,
            count(*) FILTER (WHERE ${plantInstances.isActive} = true AND ${plantInstances.fertilizerDue} >= ${todayStart.toISOString()} AND ${plantInstances.fertilizerDue} <= ${todayEnd.toISOString()}) AS care_due_today,
            count(*) FILTER (WHERE ${plantInstances.isActive} = true AND ${plantInstances.fertilizerDue} < ${todayStart.toISOString()}) AS overdue_count
          FROM ${plantInstances}
          WHERE ${plantInstances.userId} = ${userId}
        ),
        fertilizer_events AS (
          SELECT ${plantInstances.id}, ${plantInstances.nickname}, ${plantInstances.fertilizerDue}
          FROM ${plantInstances}
          WHERE ${plantInstances.userId} = ${userId}
            AND ${plantInstances.isActive} = true
            AND ${plantInstances.fertilizerDue} IS NOT NULL
            AND ${plantInstances.fertilizerDue} <= ${thirtyDaysFromNow.toISOString()}
        )
        SELECT
          ps.total_plants, ps.active_plants, ps.care_due_today, ps.overdue_count,
          fe.id AS event_id, fe.nickname AS event_nickname, fe.fertilizer_due AS event_fertilizer_due
        FROM plant_stats ps
        LEFT JOIN fertilizer_events fe ON true
      `),

      // Propagation stats (separate table, runs in parallel)
      db
        .select({
          totalPropagations: sql<number>`count(*)`,
          activePropagations: sql<number>`count(*) FILTER (WHERE ${propagations.status} IN ('started', 'rooting'))`,
          successfulPropagations: sql<number>`count(*) FILTER (WHERE ${propagations.status} IN ('planted', 'ready', 'converted'))`,
        })
        .from(propagations)
        .where(eq(propagations.userId, userId)),
    ]);

    // Extract plant stats from the first row (all rows share the same stats columns)
    const firstRow = plantStatsResult[0];
    const plantStats = {
      totalPlants: Number(firstRow?.total_plants ?? 0),
      activePlants: Number(firstRow?.active_plants ?? 0),
      careDueToday: Number(firstRow?.care_due_today ?? 0),
      overdueCount: Number(firstRow?.overdue_count ?? 0),
    };

    // Extract fertilizer events from all rows (filter out null event_id from LEFT JOIN)
    const fertilizerEvents: FertilizerEvent[] = plantStatsResult
      .filter((row) => row.event_id != null)
      .map((row) => ({
        id: `fertilizer-${row.event_id}`,
        plantName: row.event_nickname ?? '',
        plantId: String(row.event_id),
        date: row.event_fertilizer_due ? new Date(String(row.event_fertilizer_due)).toISOString().split('T')[0] : '',
        type: 'fertilize' as const,
      }));

    // Extract propagation stats
    const propagationStats = propagationStatsResult[0];
    const successfulCount = propagationStats?.successfulPropagations || 0;
    const totalCount = propagationStats?.totalPropagations || 0;
    const propagationSuccessRate = totalCount > 0 ? Math.round((successfulCount / totalCount) * 100) : 0;

    const dashboardStats: DashboardStats = {
      totalPlants: plantStats.totalPlants,
      activePlants: plantStats.activePlants,
      careDueToday: plantStats.careDueToday,
      overdueCount: plantStats.overdueCount,
      totalPropagations: propagationStats?.totalPropagations || 0,
      activePropagations: propagationStats?.activePropagations || 0,
      successfulPropagations: successfulCount,
      propagationSuccessRate,
      fertilizerEvents,
    };
    
    return NextResponse.json(dashboardStats, {
      headers: {
        'Cache-Control': 'private, max-age=60, stale-while-revalidate=120',
      },
    });
  } catch (error) {
    console.error('Failed to get dashboard stats:', error);
    return NextResponse.json(
      { error: 'Failed to get dashboard stats' },
      { status: 500 }
    );
  }
}