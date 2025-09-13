import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { validateCuratorRequest } from '@/lib/auth/server';
import { db } from '@/lib/db';
import { plants } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const result = await validateCuratorRequest();
    
    if ('error' in result) {
      return NextResponse.json(
        { error: result.error },
        { status: 401 }
      );
    }

    // Count unverified plants (pending approval)
    const pendingPlants = await db
      .select({ count: plants.id })
      .from(plants)
      .where(eq(plants.isVerified, false));

    const count = pendingPlants.length;

    return NextResponse.json({ count });
  } catch (error) {
    console.error('Error fetching pending count:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}