import { NextRequest, NextResponse } from 'next/server';
import { validateRequest } from '@/lib/auth/server';
import { db } from '@/lib/db';
import { plantInstances, propagations, plants } from '@/lib/db/schema';
import { eq, and, sql, isNull, isNotNull, lte, inArray, gte } from 'drizzle-orm';

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
    
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0); // Beginning of today
    
    const next30Days = new Date();
    next30Days.setDate(next30Days.getDate() + 30);
    next30Days.setHours(23, 59, 59, 999);

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
    const [propagationStats] = await db
      .select({
        totalPropagations: sql<number>`count(*)`,
        activePropagations: sql<number>`count(*) filter (where ${propagations.status} in ('started', 'rooting'))`,
        successfulPropagations: sql<number>`count(*) filter (where ${propagations.status} in ('planted', 'established'))`
      })
      .from(propagations)
      .where(eq(propagations.userId, userId));

    // Calculate success rate
    const totalCompletedPropagations = await db
      .select({
        count: sql<number>`count(*)`
      })
      .from(propagations)
      .where(
        and(
          eq(propagations.userId, userId),
          inArray(propagations.status, ['planted', 'established'])
        )
      );

    const completedCount = totalCompletedPropagations[0]?.count || 0;
    const successfulCount = propagationStats?.successfulPropagations || 0;
    const propagationSuccessRate = completedCount > 0 ? Math.round((successfulCount / completedCount) * 100) : 0;

    // Get fertilizer events for the next 30 days (including overdue)
    const fertilizerData = await db
      .select({
        id: plantInstances.id,
        nickname: plantInstances.nickname,
        fertilizerDue: plantInstances.fertilizerDue,
        commonName: plants.commonName
      })
      .from(plantInstances)
      .leftJoin(plants, eq(plantInstances.plantId, plants.id))
      .where(
        and(
          eq(plantInstances.userId, userId),
          eq(plantInstances.isActive, true),
          isNotNull(plantInstances.fertilizerDue),
          lte(plantInstances.fertilizerDue, next30Days.toISOString())
        )
      )
      .orderBy(plantInstances.fertilizerDue);

    // Convert to fertilizer events
    const fertilizerEvents: FertilizerEvent[] = fertilizerData.map(plant => ({
      id: `fertilize-${plant.id}`,
      plantName: plant.nickname || plant.commonName || 'Unknown Plant',
      plantId: plant.id.toString(),
      date: plant.fertilizerDue ? new Date(plant.fertilizerDue).toISOString().split('T')[0] : '',
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