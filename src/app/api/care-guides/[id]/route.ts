import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { validateRequest } from '@/lib/auth/server';
import { db } from '@/lib/db';
import { careGuides } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

const CareGuideUpdateSchema = z.object({
  taxonomyLevel: z.enum(['family', 'genus', 'species', 'cultivar']).optional(),
  family: z.string().optional(),
  genus: z.string().optional(),
  species: z.string().optional(),
  cultivar: z.string().optional(),
  commonName: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  images: z.array(z.string()).optional(),
  s3ImageKeys: z.array(z.string()).optional(),
  watering: z.object({
    frequency: z.string().optional(),
    tips: z.string().optional(),
  }).optional(),
  fertilizing: z.object({
    frequency: z.string().optional(),
    type: z.string().optional(),
    schedule: z.string().optional(),
    tips: z.string().optional(),
  }).optional(),
  lighting: z.object({
    requirements: z.string().optional(),
    intensity: z.string().optional(),
    tips: z.string().optional(),
  }).optional(),
  temperature: z.object({
    range: z.string().optional(),
    tips: z.string().optional(),
  }).optional(),
  humidity: z.object({
    requirements: z.string().optional(),
    tips: z.string().optional(),
  }).optional(),
  soil: z.object({
    type: z.string().optional(),
    recipe: z.string().optional(),
    tips: z.string().optional(),
  }).optional(),
  repotting: z.object({
    frequency: z.string().optional(),
    tips: z.string().optional(),
  }).optional(),
  propagation: z.object({
    methods: z.string().optional(),
    tips: z.string().optional(),
  }).optional(),
  rootStructure: z.object({
    type: z.string().optional(),
    growthHabits: z.string().optional(),
    tips: z.string().optional(),
  }).optional(),
  generalTips: z.string().optional(),
  isPublic: z.boolean().optional(),
});

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const careGuideId = parseInt(id, 10);

    if (isNaN(careGuideId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const careGuide = await db
      .select()
      .from(careGuides)
      .where(
        and(
          eq(careGuides.id, careGuideId),
          eq(careGuides.userId, user.id)
        )
      )
      .limit(1);

    if (!careGuide.length) {
      return NextResponse.json({ error: 'Care guide not found' }, { status: 404 });
    }

    return NextResponse.json(careGuide[0]);
  } catch (error) {
    console.error('Failed to fetch care guide:', error);
    return NextResponse.json(
      { error: 'Failed to fetch care guide' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const careGuideId = parseInt(id, 10);

    if (isNaN(careGuideId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const body = await request.json();
    const validatedData = CareGuideUpdateSchema.parse(body);

    // Check if care guide exists and belongs to user
    const existing = await db
      .select()
      .from(careGuides)
      .where(
        and(
          eq(careGuides.id, careGuideId),
          eq(careGuides.userId, user.id)
        )
      )
      .limit(1);

    if (!existing.length) {
      return NextResponse.json({ error: 'Care guide not found' }, { status: 404 });
    }

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (validatedData.taxonomyLevel !== undefined) updateData.taxonomyLevel = validatedData.taxonomyLevel;
    if (validatedData.family !== undefined) updateData.family = validatedData.family || null;
    if (validatedData.genus !== undefined) updateData.genus = validatedData.genus || null;
    if (validatedData.species !== undefined) updateData.species = validatedData.species || null;
    if (validatedData.cultivar !== undefined) updateData.cultivar = validatedData.cultivar || null;
    if (validatedData.commonName !== undefined) updateData.commonName = validatedData.commonName || null;
    if (validatedData.title !== undefined) updateData.title = validatedData.title;
    if (validatedData.description !== undefined) updateData.description = validatedData.description || null;
    if (validatedData.images !== undefined) updateData.images = validatedData.images;
    if (validatedData.s3ImageKeys !== undefined) updateData.s3ImageKeys = validatedData.s3ImageKeys;
    if (validatedData.watering !== undefined) updateData.watering = validatedData.watering;
    if (validatedData.fertilizing !== undefined) updateData.fertilizing = validatedData.fertilizing;
    if (validatedData.lighting !== undefined) updateData.lighting = validatedData.lighting;
    if (validatedData.temperature !== undefined) updateData.temperature = validatedData.temperature;
    if (validatedData.humidity !== undefined) updateData.humidity = validatedData.humidity;
    if (validatedData.soil !== undefined) updateData.soil = validatedData.soil;
    if (validatedData.repotting !== undefined) updateData.repotting = validatedData.repotting;
    if (validatedData.propagation !== undefined) updateData.propagation = validatedData.propagation;
    if (validatedData.rootStructure !== undefined) updateData.rootStructure = validatedData.rootStructure || null;
    if (validatedData.generalTips !== undefined) updateData.generalTips = validatedData.generalTips || null;
    if (validatedData.isPublic !== undefined) updateData.isPublic = validatedData.isPublic;

    const updated = await db
      .update(careGuides)
      .set(updateData)
      .where(
        and(
          eq(careGuides.id, careGuideId),
          eq(careGuides.userId, user.id)
        )
      )
      .returning();

    return NextResponse.json(updated[0]);
  } catch (error) {
    console.error('Failed to update care guide:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update care guide' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const careGuideId = parseInt(id, 10);

    if (isNaN(careGuideId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const deleted = await db
      .delete(careGuides)
      .where(
        and(
          eq(careGuides.id, careGuideId),
          eq(careGuides.userId, user.id)
        )
      )
      .returning();

    if (!deleted.length) {
      return NextResponse.json({ error: 'Care guide not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete care guide:', error);
    return NextResponse.json(
      { error: 'Failed to delete care guide' },
      { status: 500 }
    );
  }
}
