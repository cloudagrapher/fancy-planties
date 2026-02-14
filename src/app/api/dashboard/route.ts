import { NextRequest, NextResponse } from 'next/server';
import { validateRequest } from '@/lib/auth/server';
import { db } from '@/lib/db';
import { plantInstances, propagations } from '@/lib/db/schema';
import { eq, and, sql, lte, isNotNull } from 'drizzle-orm';

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

    // Get plant statistics
    // BUG FIX: careDueToday previously used `<= end of today` which included ALL overdue plants.
    // Now we separately count plants due specifically today vs all overdue plants.
    const [plantStats] = await db
      .select({
        totalPlants: sql<number>`count(*)`,
        activePlants: sql<number>`count(*) filter (where ${plantInstances.isActive} = true)`,
        careDueToday: sql<number>`count(*) filter (where ${plantInstances.isActive} = true and ${plantInstances.fertilizerDue} >= ${todayStart.toISOString()} and ${plantInstances.fertilizerDue} <= ${todayEnd.toISOString()})`,
        overdueCount: sql<number>`count(*) filter (where ${plantInstances.isActive} = true and ${plantInstances.fertilizerDue} < ${todayStart.toISOString()})`
      })
      .from(plantInstances)
      .where(eq(plantInstances.userId, userId));

    // Get propagation statistics
    // Note: Status enum is ['started', 'rooting', 'ready', 'planted']
    // 'established' was renamed to 'ready' — see schema.ts
    const [propagationStats] = await db
      .select({
        totalPropagations: sql<number>`count(*)`,
        activePropagations: sql<number>`count(*) filter (where ${propagations.status} in ('started', 'rooting'))`,
        successfulPropagations: sql<number>`count(*) filter (where ${propagations.status} in ('planted', 'ready'))`
      })
      .from(propagations)
      .where(eq(propagations.userId, userId));

    // Calculate success rate
    // 'planted' and 'ready' are both considered successful outcomes
    const successfulCount = propagationStats?.successfulPropagations || 0;
    const totalCount = propagationStats?.totalPropagations || 0;
    const propagationSuccessRate = totalCount > 0 ? Math.round((successfulCount / totalCount) * 100) : 0;

    // Get fertilizer events — filter in SQL to avoid fetching all active plants
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const fertilizerEventData = await db
      .select({
        id: plantInstances.id,
        nickname: plantInstances.nickname,
        fertilizerDue: plantInstances.fertilizerDue
      })
      .from(plantInstances)
      .where(
        and(
          eq(plantInstances.userId, userId),
          eq(plantInstances.isActive, true),
          isNotNull(plantInstances.fertilizerDue),
          lte(plantInstances.fertilizerDue, thirtyDaysFromNow)
        )
      );

    const fertilizerEvents: FertilizerEvent[] = fertilizerEventData.map(plant => ({
      id: `fertilizer-${plant.id}`,
      plantName: plant.nickname,
      plantId: plant.id.toString(),
      date: plant.fertilizerDue!.toISOString().split('T')[0],
      type: 'fertilize' as const
    }));

    const dashboardStats: DashboardStats = {
      totalPlants: plantStats?.totalPlants || 0,
      activePlants: plantStats?.activePlants || 0,
      careDueToday: plantStats?.careDueToday || 0,
      overdueCount: plantStats?.overdueCount || 0,
      totalPropagations: propagationStats?.totalPropagations || 0,
      activePropagations: propagationStats?.activePropagations || 0,
      successfulPropagations: successfulCount,
      propagationSuccessRate,
      fertilizerEvents
    };
    
    return NextResponse.json(dashboardStats);
  } catch (error) {
    console.error('Failed to get dashboard stats:', error);
    return NextResponse.json(
      { error: 'Failed to get dashboard stats' },
      { status: 500 }
    );
  }
}