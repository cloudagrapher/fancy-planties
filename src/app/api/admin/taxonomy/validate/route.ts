import { NextRequest, NextResponse } from 'next/server';
import { requireCuratorSession } from '@/lib/auth/server';
import { validateTaxonomyEntry } from '@/lib/db/queries/admin-taxonomy';
import { z } from 'zod';

const validateSchema = z.object({
  family: z.string().min(1),
  genus: z.string().min(1),
  species: z.string().min(1),
  cultivar: z.string().optional(),
  excludeId: z.number().optional(),
});

export async function POST(request: NextRequest) {
  try {
    await requireCuratorSession();

    const body = await request.json();
    const { family, genus, species, cultivar, excludeId } = validateSchema.parse(body);

    const result = await validateTaxonomyEntry(family, genus, species, cultivar, excludeId);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Failed to validate taxonomy:', error);
    return NextResponse.json(
      { error: 'Failed to validate taxonomy' },
      { status: 500 }
    );
  }
}