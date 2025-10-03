/**
 * API Route: Generate pre-signed download URL
 * Validates user authentication and authorization before proxying to AWS Lambda
 */
import { NextRequest, NextResponse } from 'next/server';
import { validateRequest } from '@/lib/auth/server';
import { z } from 'zod';

const downloadRequestSchema = z.object({
  s3Key: z.string(),
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
    const { s3Key } = downloadRequestSchema.parse(body);

    // Verify user owns this image (s3Key should start with users/{userId}/)
    const expectedPrefix = `users/${user.id}/`;
    if (!s3Key.startsWith(expectedPrefix)) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Call AWS Lambda function to generate pre-signed URL
    const lambdaEndpoint = process.env.AWS_API_ENDPOINT;
    if (!lambdaEndpoint) {
      return NextResponse.json(
        { error: 'S3 download not configured' },
        { status: 503 }
      );
    }

    const lambdaResponse = await fetch(`${lambdaEndpoint}/images/download`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: user.id.toString(),
        s3Key,
      }),
    });

    if (!lambdaResponse.ok) {
      const error = await lambdaResponse.json();
      return NextResponse.json(
        { error: error.error || 'Failed to generate download URL' },
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

    console.error('Failed to generate download URL:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
