import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { requireCuratorSession } from '@/lib/auth/server';
import { AdminDashboardQueries } from '@/lib/db/queries/admin-dashboard';

export async function GET(request: NextRequest) {
  try {
    // Ensure user is a curator
    await requireCuratorSession();

    // Get dashboard statistics
    const stats = await AdminDashboardQueries.getDashboardStats();

    return NextResponse.json(stats, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600', // 5 minutes cache
      },
    });
  } catch (error) {
    console.error('Failed to get dashboard stats:', error);
    return NextResponse.json(
      { error: 'Failed to get dashboard statistics' },
      { status: 500 }
    );
  }
}