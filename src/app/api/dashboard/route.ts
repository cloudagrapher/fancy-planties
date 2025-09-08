import { NextRequest, NextResponse } from 'next/server';
import { validateRequest } from '@/lib/auth/server';
import { db } from '@/lib/db';
import { plantInstances, propagations } from '@/lib/db/schema';
import { eq, and, sql, isNull, isNotNull, lte, inArray } from 'drizzle-orm';

export interface DashboardStats {
  totalPlants: number;
  activePlants: number;
  careDueToday: number;
  totalPropagations: number;
  activePropagations: number;
  successfulPropagations: number;
  propagationSuccessRate: number;
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

    const dashboardStats: DashboardStats = {
      totalPlants: plantStats?.totalPlants || 0,
      activePlants: plantStats?.activePlants || 0,
      careDueToday: plantStats?.careDueToday || 0,
      totalPropagations: propagationStats?.totalPropagations || 0,
      activePropagations: propagationStats?.activePropagations || 0,
      successfulPropagations: successfulCount,
      propagationSuccessRate
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