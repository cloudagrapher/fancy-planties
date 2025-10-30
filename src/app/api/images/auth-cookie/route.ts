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
    // IMPORTANT: For cookies to work with CloudFront in development:
    // 1. Add to /etc/hosts: 127.0.0.1 dev.fancy-planties.cloudagrapher.com
    // 2. Access app via http://dev.fancy-planties.cloudagrapher.com:3000
    // This allows cookies set for .fancy-planties.cloudagrapher.com to be sent to cdn.fancy-planties.cloudagrapher.com
    
    const isProduction = process.env.NODE_ENV === 'production';
    const requestHost = request.headers.get('host') || '';
    const usesCustomDomain = requestHost.includes('fancy-planties.cloudagrapher.com');
    
    const cookieOptions: any = {
      path: '/',
      secure: isProduction,
      httpOnly: false, // Must be false so browser can send cookies with image requests
      sameSite: 'lax' as const, // 'lax' works for same-site subdomains
      maxAge: SEVEN_DAYS_IN_SECONDS,
    };
    
    // Set parent domain for cookie sharing across subdomains
    // Only works if accessing via a subdomain of fancy-planties.cloudagrapher.com
    if (usesCustomDomain && cloudfrontDomain.includes('fancy-planties.cloudagrapher.com')) {
      cookieOptions.domain = '.fancy-planties.cloudagrapher.com';
      console.log('[CloudFront Cookie] Setting cookies for domain: .fancy-planties.cloudagrapher.com');
    } else {
      console.warn('[CloudFront Cookie] WARNING: Accessing via localhost - CloudFront cookies will NOT work!');
      console.warn('[CloudFront Cookie] Add to /etc/hosts: 127.0.0.1 dev.fancy-planties.cloudagrapher.com');
      console.warn('[CloudFront Cookie] Then access via: http://dev.fancy-planties.cloudagrapher.com:3000');
    }

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
