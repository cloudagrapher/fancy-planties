import { NextRequest, NextResponse } from 'next/server';
import { validateRequest } from './index';

// Rate limiting store (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX_REQUESTS = 100; // Max requests per window

// CSRF token generation and validation
export function generateCSRFToken(): string {
  return crypto.randomUUID();
}

export function validateCSRFToken(token: string, sessionToken: string): boolean {
  // Simple CSRF validation - in production, use more sophisticated approach
  return token === sessionToken;
}

// Rate limiting middleware
export function rateLimit(identifier: string): { success: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW;
  
  // Clean up old entries
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
  
  const current = rateLimitStore.get(identifier);
  
  if (!current || current.resetTime < now) {
    // New window or expired window
    const resetTime = now + RATE_LIMIT_WINDOW;
    rateLimitStore.set(identifier, { count: 1, resetTime });
    return {
      success: true,
      remaining: RATE_LIMIT_MAX_REQUESTS - 1,
      resetTime,
    };
  }
  
  if (current.count >= RATE_LIMIT_MAX_REQUESTS) {
    return {
      success: false,
      remaining: 0,
      resetTime: current.resetTime,
    };
  }
  
  current.count++;
  rateLimitStore.set(identifier, current);
  
  return {
    success: true,
    remaining: RATE_LIMIT_MAX_REQUESTS - current.count,
    resetTime: current.resetTime,
  };
}

// Authentication middleware for API routes
export async function withAuth(
  request: NextRequest,
  handler: (request: NextRequest, user: any) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    const { user, session } = await validateRequest();
    
    if (!user || !session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    return await handler(request, user);
  } catch (error) {
    console.error('Auth middleware error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Rate limiting middleware for API routes
export async function withRateLimit(
  request: NextRequest,
  handler: (request: NextRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    // Use IP address for rate limiting (in production, consider user ID for authenticated requests)
    const identifier = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
    
    const rateLimitResult = rateLimit(identifier);
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { 
          error: 'Too many requests',
          resetTime: rateLimitResult.resetTime,
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': RATE_LIMIT_MAX_REQUESTS.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
          },
        }
      );
    }
    
    const response = await handler(request);
    
    // Add rate limit headers to successful responses
    response.headers.set('X-RateLimit-Limit', RATE_LIMIT_MAX_REQUESTS.toString());
    response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
    response.headers.set('X-RateLimit-Reset', rateLimitResult.resetTime.toString());
    
    return response;
  } catch (error) {
    console.error('Rate limit middleware error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Combined middleware for authenticated and rate-limited routes
export async function withAuthAndRateLimit(
  request: NextRequest,
  handler: (request: NextRequest, user: any) => Promise<NextResponse>
): Promise<NextResponse> {
  return withRateLimit(request, async (req) => {
    return withAuth(req, handler);
  });
}

// CSRF protection middleware
export async function withCSRFProtection(
  request: NextRequest,
  handler: (request: NextRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    // Skip CSRF for GET requests
    if (request.method === 'GET') {
      return await handler(request);
    }
    
    const csrfToken = request.headers.get('x-csrf-token');
    const sessionCookie = request.cookies.get('auth-session');
    
    if (!csrfToken || !sessionCookie) {
      return NextResponse.json(
        { error: 'CSRF token missing' },
        { status: 403 }
      );
    }
    
    // In a real implementation, you'd validate the CSRF token properly
    // For now, we'll just check that it exists
    if (!validateCSRFToken(csrfToken, sessionCookie.value)) {
      return NextResponse.json(
        { error: 'Invalid CSRF token' },
        { status: 403 }
      );
    }
    
    return await handler(request);
  } catch (error) {
    console.error('CSRF middleware error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Route protection helper for pages
export async function requireAuth(): Promise<{ user: any; session: any } | null> {
  const { user, session } = await validateRequest();
  
  if (!user || !session) {
    return null;
  }
  
  return { user, session };
}