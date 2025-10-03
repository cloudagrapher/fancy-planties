/**
 * API Route: Generate pre-signed upload URL
 * Validates user authentication and authorization before proxying to AWS Lambda
 */
import { NextRequest, NextResponse } from 'next/server';
import { validateRequest } from '@/lib/auth/server';
import { z } from 'zod';

const uploadRequestSchema = z.object({
  entityType: z.enum(['plant_instance', 'propagation', 'care_history', 'care_guide']),
  entityId: z.string(),
  contentType: z.string(),
  fileExtension: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    // Validate user session
    const { user } = await validateRequest();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = uploadRequestSchema.parse(body);

    // Call AWS Lambda function to generate pre-signed URL
    const lambdaEndpoint = process.env.AWS_API_ENDPOINT;
    if (!lambdaEndpoint) {
      return NextResponse.json(
        { error: 'S3 upload not configured' },
        { status: 503 }
      );
    }

    const lambdaResponse = await fetch(`${lambdaEndpoint}/images/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: user.id.toString(),
        ...validatedData,
      }),
    });

    if (!lambdaResponse.ok) {
      const error = await lambdaResponse.json();
      return NextResponse.json(
        { error: error.error || 'Failed to generate upload URL' },
        { status: lambdaResponse.status }
      );
    }

    const data = await lambdaResponse.json();
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Failed to generate upload URL:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
