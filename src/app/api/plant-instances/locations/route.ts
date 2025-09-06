import { NextRequest, NextResponse } from 'next/server';
import { PlantInstanceQueries } from '@/lib/db/queries/plant-instances';
import { validateRequest } from '@/lib/auth';

// GET /api/plant-instances/locations - Get unique locations for the user
export async function GET(request: NextRequest) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get unique locations for the user
    const locations = await PlantInstanceQueries.getUserLocations(user.id);
    
    return NextResponse.json({ locations });
  } catch (error) {
    console.error('Failed to get user locations:', error);
    return NextResponse.json(
      { error: 'Failed to get user locations' },
      { status: 500 }
    );
  }
}