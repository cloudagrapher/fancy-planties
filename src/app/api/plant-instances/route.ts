import { NextRequest, NextResponse } from 'next/server';
import { PlantInstanceQueries } from '@/lib/db/queries/plant-instances';
import { createPlantInstanceSchema, plantInstanceFilterSchema } from '@/lib/validation/plant-schemas';
import { validateRequest } from '@/lib/auth/server';

// GET /api/plant-instances - Get plant instances with optional filtering
export async function GET(request: NextRequest) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    
    // Parse filter parameters
    const filterParams = {
      userId: user.id,
      location: searchParams.get('location') || undefined,
      plantId: searchParams.get('plantId') ? parseInt(searchParams.get('plantId')!) : undefined,
      isActive: searchParams.get('isActive') ? searchParams.get('isActive') === 'true' : undefined,
      overdueOnly: searchParams.get('overdueOnly') === 'true',
      dueSoonDays: searchParams.get('dueSoonDays') ? parseInt(searchParams.get('dueSoonDays')!) : undefined,
      createdAfter: searchParams.get('createdAfter') ? new Date(searchParams.get('createdAfter')!) : undefined,
      createdBefore: searchParams.get('createdBefore') ? new Date(searchParams.get('createdBefore')!) : undefined,
      lastFertilizedAfter: searchParams.get('lastFertilizedAfter') ? new Date(searchParams.get('lastFertilizedAfter')!) : undefined,
      lastFertilizedBefore: searchParams.get('lastFertilizedBefore') ? new Date(searchParams.get('lastFertilizedBefore')!) : undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0,
    };

    // Validate filter parameters
    const validatedFilters = plantInstanceFilterSchema.parse(filterParams);
    
    // Get plant instances with filters
    const result = await PlantInstanceQueries.getWithFilters(validatedFilters);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to get plant instances:', error);
    return NextResponse.json(
      { error: 'Failed to get plant instances' },
      { status: 500 }
    );
  }
}

// POST /api/plant-instances - Create a new plant instance
export async function POST(request: NextRequest) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    // Add user ID to the request body
    const instanceData = {
      ...body,
      userId: user.id,
    };

    // Validate the plant instance data
    const validatedData = createPlantInstanceSchema.parse(instanceData);
    
    // Calculate initial fertilizer due date if schedule is provided
    if (validatedData.fertilizerSchedule && !validatedData.fertilizerDue) {
      const now = new Date();
      const scheduleMatch = validatedData.fertilizerSchedule.match(/(\d+)\s*(day|week|month)s?/i);
      
      if (scheduleMatch) {
        const [, amount, unit] = scheduleMatch;
        const dueDate = new Date(now);
        
        switch (unit.toLowerCase()) {
          case 'day':
            dueDate.setDate(dueDate.getDate() + parseInt(amount));
            break;
          case 'week':
            dueDate.setDate(dueDate.getDate() + (parseInt(amount) * 7));
            break;
          case 'month':
            dueDate.setMonth(dueDate.getMonth() + parseInt(amount));
            break;
        }
        
        validatedData.fertilizerDue = dueDate;
      }
    }

    // Create the plant instance
    const plantInstance = await PlantInstanceQueries.create(validatedData);
    
    // Get the enhanced plant instance with plant data
    const enhancedInstance = await PlantInstanceQueries.getEnhancedById(plantInstance.id);
    
    return NextResponse.json(enhancedInstance, { status: 201 });
  } catch (error) {
    console.error('Failed to create plant instance:', error);
    
    if (error instanceof Error && error.message.includes('validation')) {
      return NextResponse.json(
        { error: 'Invalid plant instance data', details: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create plant instance' },
      { status: 500 }
    );
  }
}