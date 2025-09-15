import { NextRequest, NextResponse } from 'next/server';
import { validateRequest } from './server';
import type { User } from '../db/schema';
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { db } from '../db';
import { rateLimits } from '../db/schema';
import { eq, and, lt } from 'drizzle-orm';

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX_REQUESTS = 100; // Max requests per window

// CSRF token generation and validation
export function generateCSRFToken(sessionId: string): string {
  const token = randomBytes(32).toString('hex');
  const signature = createHmac('sha256', sessionId).update(token).digest('hex');
  return `${token}.${signature}`;
}

export function validateCSRFToken(token: string, sessionId: string): boolean {
  if (!token || !sessionId) return false;
  
  const [tokenPart, signature] = token.split('.');
  if (!tokenPart || !signature) return false;
  
  const expectedSignature = createHmac('sha256', sessionId).update(tokenPart).digest('hex');
  
  try {
    return timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSignature, 'hex'));
  } catch {
    return false;
  }
}

// Database-backed rate limiting
export async function rateLimit(identifier: string, dbInstance = db): Promise<{ success: boolean; remaining: number; resetTime: number }> {
  const now = new Date();
  const windowStart = new Date(Math.floor(now.getTime() / RATE_LIMIT_WINDOW) * RATE_LIMIT_WINDOW);
  const resetTime = windowStart.getTime() + RATE_LIMIT_WINDOW;
  
  try {
    // Clean up old entries (run occasionally)
    if (Math.random() < 0.01) {
      await dbInstance.delete(rateLimits).where(lt(rateLimits.windowStart, new Date(now.getTime() - RATE_LIMIT_WINDOW * 2)));
    }
    
    // Try to get existing rate limit record
    const existing = await dbInstance.select()
      .from(rateLimits)
      .where(and(
        eq(rateLimits.identifier, identifier),
        eq(rateLimits.windowStart, windowStart)
      ))
      .limit(1);
    
    if (existing.length === 0) {
      // Create new rate limit record
      await dbInstance.insert(rateLimits).values({
        identifier,
        windowStart,
        requestCount: 1,
      });
      
      return {
        success: true,
        remaining: RATE_LIMIT_MAX_REQUESTS - 1,
        resetTime,
      };
    }
    
    const current = existing[0];
    
    if (current.requestCount >= RATE_LIMIT_MAX_REQUESTS) {
      return {
        success: false,
        remaining: 0,
        resetTime,
      };
    }
    
    // Increment request count
    await dbInstance.update(rateLimits)
      .set({ 
        requestCount: current.requestCount + 1,
        updatedAt: now,
      })
      .where(eq(rateLimits.id, current.id));
    
    return {
      success: true,
      remaining: RATE_LIMIT_MAX_REQUESTS - (current.requestCount + 1),
      resetTime,
    };
  } catch (error) {
    console.error('Rate limiting error:', error);
    // Fallback to allowing request on database error
    return {
      success: true,
      remaining: RATE_LIMIT_MAX_REQUESTS - 1,
      resetTime,
    };
  }
}

// Authentication middleware for API routes
export async function withAuth(
  request: NextRequest,
  handler: (request: NextRequest, user: User) => Promise<NextResponse>
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
    const identifier = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      'unknown';
    
    const rateLimitResult = await rateLimit(identifier);
    
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
  handler: (request: NextRequest, user: User) => Promise<NextResponse>
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
    
    const { session } = await validateRequest();
    if (!session || !validateCSRFToken(csrfToken, session.id)) {
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
export async function requireAuth(): Promise<{ user: User; session: { id: string; userId: number; expiresAt: Date } } | null> {
  const { user, session } = await validateRequest();
  
  if (!user || !session) {
    return null;
  }
  
  return { user, session };
}