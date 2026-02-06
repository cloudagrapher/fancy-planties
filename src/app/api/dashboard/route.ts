import { NextRequest, NextResponse } from 'next/server';
import { validateRequest } from '@/lib/auth/server';
import { db } from '@/lib/db';
import { plantInstances, propagations } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';

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
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today

    // Get plant statistics
    const [plantStats] = await db
      .select({
        totalPlants: sql<number>`count(*)`,
        activePlants: sql<number>`count(*) filter (where ${plantInstances.isActive} = true)`,
        careDueToday: sql<number>`count(*) filter (where ${plantInstances.isActive} = true and ${plantInstances.fertilizerDue} <= ${today.toISOString()})`
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

    // Get fertilizer events from plant instances with due dates
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
          eq(plantInstances.isActive, true)
        )
      );

    // Convert to fertilizer events with proper date filtering (show events for next 30 days)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    const fertilizerEvents: FertilizerEvent[] = fertilizerEventData
      .filter(plant => plant.fertilizerDue && plant.fertilizerDue <= thirtyDaysFromNow)
      .map(plant => ({
        id: `fertilizer-${plant.id}`,
        plantName: plant.nickname,
        plantId: plant.id.toString(),
        date: plant.fertilizerDue!.toISOString().split('T')[0], // Format as YYYY-MM-DD
        type: 'fertilize' as const
      }));

    const dashboardStats: DashboardStats = {
      totalPlants: plantStats?.totalPlants || 0,
      activePlants: plantStats?.activePlants || 0,
      careDueToday: plantStats?.careDueToday || 0,
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