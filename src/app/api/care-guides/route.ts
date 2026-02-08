import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { validateRequest } from '@/lib/auth/server';
import { db } from '@/lib/db';
import { careGuides } from '@/lib/db/schema';
import { eq, and, or, ilike, desc } from 'drizzle-orm';

const CareGuideCreateSchema = z.object({
  taxonomyLevel: z.enum(['family', 'genus', 'species', 'cultivar']),
  family: z.string().min(1),
  genus: z.string().optional(),
  species: z.string().optional(),
  cultivar: z.string().optional(),
  commonName: z.string().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  images: z.array(z.string()).default([]),
  s3ImageKeys: z.array(z.string()).default([]),
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
  isPublic: z.boolean().default(false),
});

const CareGuideFiltersSchema = z.object({
  taxonomyLevel: z.enum(['family', 'genus', 'species', 'cultivar']).optional(),
  searchQuery: z.string().optional(),
  isPublic: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = CareGuideCreateSchema.parse(body);

    const newCareGuide = await db.insert(careGuides).values({
      userId: user.id,
      taxonomyLevel: validatedData.taxonomyLevel,
      family: validatedData.family,
      genus: validatedData.genus || null,
      species: validatedData.species || null,
      cultivar: validatedData.cultivar || null,
      commonName: validatedData.commonName || null,
      title: validatedData.title,
      description: validatedData.description || null,
      images: validatedData.images,
      s3ImageKeys: validatedData.s3ImageKeys,
      watering: validatedData.watering || null,
      fertilizing: validatedData.fertilizing || null,
      lighting: validatedData.lighting || null,
      temperature: validatedData.temperature || null,
      humidity: validatedData.humidity || null,
      soil: validatedData.soil || null,
      repotting: validatedData.repotting || null,
      propagation: validatedData.propagation || null,
      rootStructure: validatedData.rootStructure || null,
      generalTips: validatedData.generalTips || null,
      isPublic: validatedData.isPublic,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    return NextResponse.json(newCareGuide[0], { status: 201 });
  } catch (error) {
    console.error('Failed to create care guide:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create care guide' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filters = CareGuideFiltersSchema.parse({
      taxonomyLevel: searchParams.get('taxonomyLevel') || undefined,
      searchQuery: searchParams.get('searchQuery') || undefined,
      isPublic: searchParams.get('isPublic') === 'true' ? true : 
                searchParams.get('isPublic') === 'false' ? false : undefined,
    });

    const query = db.select().from(careGuides);
    
    const conditions = [eq(careGuides.userId, user.id)];

    if (filters.taxonomyLevel) {
      conditions.push(eq(careGuides.taxonomyLevel, filters.taxonomyLevel));
    }

    if (filters.isPublic !== undefined) {
      conditions.push(eq(careGuides.isPublic, filters.isPublic));
    }

    if (filters.searchQuery) {
      // Escape special LIKE/ILIKE characters to prevent wildcard injection
      const escapedQuery = filters.searchQuery
        .replace(/\\/g, '\\\\')
        .replace(/%/g, '\\%')
        .replace(/_/g, '\\_');
      const searchConditions = or(
        ilike(careGuides.title, `%${escapedQuery}%`),
        ilike(careGuides.description, `%${escapedQuery}%`),
        ilike(careGuides.commonName, `%${escapedQuery}%`),
        ilike(careGuides.family, `%${escapedQuery}%`),
        ilike(careGuides.genus, `%${escapedQuery}%`),
        ilike(careGuides.species, `%${escapedQuery}%`)
      );
      if (searchConditions) {
        conditions.push(searchConditions);
      }
    }

    const userCareGuides = await query
      .where(and(...conditions))
      .orderBy(desc(careGuides.updatedAt));

    return NextResponse.json(userCareGuides);
  } catch (error) {
    console.error('Failed to fetch care guides:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch care guides' },
      { status: 500 }
    );
  }
}