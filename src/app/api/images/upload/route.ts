/**
 * API Route: Generate pre-signed upload URL
 * Validates user authentication and authorization before proxying to AWS Lambda
 */
import { NextRequest, NextResponse } from 'next/server';
import { validateRequest } from '@/lib/auth/server';
import { z } from 'zod';

const ALLOWED_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
] as const;

const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'heif'] as const;

const uploadRequestSchema = z.object({
  entityType: z.enum(['plant_instance', 'propagation', 'care_history', 'care_guide']),
  entityId: z.string().min(1, 'Entity ID is required').max(50, 'Entity ID too long'),
  contentType: z.string().refine(
    (val) => ALLOWED_CONTENT_TYPES.includes(val as typeof ALLOWED_CONTENT_TYPES[number]),
    `Content type must be one of: ${ALLOWED_CONTENT_TYPES.join(', ')}`
  ),
  fileExtension: z.string().refine(
    (val) => ALLOWED_EXTENSIONS.includes(val.toLowerCase() as typeof ALLOWED_EXTENSIONS[number]),
    `File extension must be one of: ${ALLOWED_EXTENSIONS.join(', ')}`
  ),
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
