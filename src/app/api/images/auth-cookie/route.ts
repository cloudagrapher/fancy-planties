/**
 * API Route: Initialize CloudFront signed cookies
 * Called once per user session to set cookies for CloudFront image access
 *
 * Security: Validates user authentication before generating cookies
 * Cookies enable direct CloudFront access with path-based user isolation
 */
import { NextRequest, NextResponse } from 'next/server';
import { validateRequest } from '@/lib/auth/server';

const SEVEN_DAYS_IN_SECONDS = 7 * 24 * 60 * 60;

export async function POST(request: NextRequest) {
  try {
    // Validate user session
    const { user } = await validateRequest();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Call AWS Lambda function to generate signed cookies
    const lambdaEndpoint = process.env.AWS_API_ENDPOINT;
    const cloudfrontDomain = process.env.NEXT_PUBLIC_CLOUDFRONT_DOMAIN;

    if (!lambdaEndpoint || !cloudfrontDomain) {
      console.error('CloudFront configuration missing:', {
        hasLambdaEndpoint: !!lambdaEndpoint,
        hasCloudfrontDomain: !!cloudfrontDomain,
      });
      return NextResponse.json(
        { error: 'CloudFront signed cookies not configured' },
        { status: 503 }
      );
    }

    console.log(`[CloudFront Cookie] Generating cookies for user ${user.id}`);

    const lambdaResponse = await fetch(`${lambdaEndpoint}/images/auth-cookie`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: user.id.toString(),
      }),
    });

    if (!lambdaResponse.ok) {
      const error = await lambdaResponse.json();
      console.error('[CloudFront Cookie] Lambda error:', error);
      return NextResponse.json(
        { error: error.error || 'Failed to generate signed cookies' },
        { status: lambdaResponse.status }
      );
    }

    const data = await lambdaResponse.json();
    const { cookies, expiresAt } = data;

    // Create response
    const response = NextResponse.json({
      success: true,
      message: 'CloudFront signed cookies set successfully',
      expiresAt,
    });

    // Set CloudFront signed cookies
    // These cookies will be automatically sent with all requests to the CloudFront domain
    const cookieOptions = {
      domain: cloudfrontDomain,
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'none' as const, // Required for cross-domain cookies (Next.js → CloudFront)
      maxAge: SEVEN_DAYS_IN_SECONDS,
    };

    response.cookies.set('CloudFront-Policy', cookies['CloudFront-Policy'], cookieOptions);
    response.cookies.set('CloudFront-Signature', cookies['CloudFront-Signature'], cookieOptions);
    response.cookies.set('CloudFront-Key-Pair-Id', cookies['CloudFront-Key-Pair-Id'], cookieOptions);

    console.log(`[CloudFront Cookie] Successfully set cookies for user ${user.id}, expires at ${new Date(expiresAt * 1000).toISOString()}`);

    return response;
  } catch (error) {
    console.error('[CloudFront Cookie] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
