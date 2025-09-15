import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { emailVerificationRateLimiter } from '@/lib/services/email-verification-rate-limiter';

/**
 * Get client identifier for rate limiting
 */
function getClientIdentifier(request: NextRequest): string {
  // Try to get real IP address
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const remoteAddr = request.headers.get('x-remote-addr');
  
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwardedFor.split(',')[0].trim();
  }
  
  if (realIp) {
    return realIp;
  }
  
  if (remoteAddr) {
    return remoteAddr;
  }
  
  // Fallback identifier
  return 'unknown';
}

/**
 * Enhanced rate limiting middleware for email verification endpoints
 */
export async function withEmailVerificationRateLimit(
  request: NextRequest,
  handler: (request: NextRequest) => Promise<NextResponse>,
  options: {
    checkVerificationAttempts?: boolean;
    checkResendRequests?: boolean;
    checkOverallActivity?: boolean;
    requireEmail?: boolean;
  } = {}
): Promise<NextResponse> {
  try {
    const identifier = getClientIdentifier(request);
    let email: string | undefined;
    
    // Extract email from request body if needed
    if (options.requireEmail || options.checkResendRequests) {
      try {
        const body = await request.json();
        email = body.email?.toLowerCase();
        
        if (options.requireEmail && !email) {
          return NextResponse.json(
            { error: 'Email is required' },
            { status: 400 }
          );
        }
        
        // Create a new request with the parsed body for the handler
        const newRequest = new NextRequest(request.url, {
          method: request.method,
          headers: request.headers,
          body: JSON.stringify(body),
        });
        
        // Copy the parsed body to the new request for the handler to use
        (newRequest as any)._parsedBody = body;
        request = newRequest;
      } catch (error) {
        return NextResponse.json(
          { error: 'Invalid JSON in request body' },
          { status: 400 }
        );
      }
    }
    
    // Check overall email verification activity first
    if (options.checkOverallActivity !== false) {
      const activityResult = emailVerificationRateLimiter.checkEmailVerificationActivity(identifier, email);
      
      if (!activityResult.allowed) {
        return NextResponse.json(
          {
            error: 'Too many email verification requests. Please try again later.',
            retryAfter: activityResult.retryAfter,
            resetTime: activityResult.resetTime,
          },
          {
            status: 429,
            headers: {
              'X-RateLimit-Limit': '100',
              'X-RateLimit-Remaining': activityResult.remaining.toString(),
              'X-RateLimit-Reset': activityResult.resetTime.toString(),
              'Retry-After': activityResult.retryAfter?.toString() || '3600',
            },
          }
        );
      }
    }
    
    // Check verification attempts rate limit
    if (options.checkVerificationAttempts) {
      const verificationResult = emailVerificationRateLimiter.checkVerificationAttempts(identifier, email);
      
      if (!verificationResult.allowed) {
        return NextResponse.json(
          {
            error: 'Too many verification attempts. Please try again later.',
            retryAfter: verificationResult.retryAfter,
            resetTime: verificationResult.resetTime,
          },
          {
            status: 429,
            headers: {
              'X-RateLimit-Limit': '50',
              'X-RateLimit-Remaining': verificationResult.remaining.toString(),
              'X-RateLimit-Reset': verificationResult.resetTime.toString(),
              'Retry-After': verificationResult.retryAfter?.toString() || '3600',
            },
          }
        );
      }
    }
    
    // Check resend requests rate limit
    if (options.checkResendRequests && email) {
      const resendResult = emailVerificationRateLimiter.checkResendRequests(email, identifier);
      
      if (!resendResult.allowed) {
        const errorMessage = resendResult.cooldownRemaining
          ? `Please wait ${resendResult.cooldownRemaining} seconds before requesting another verification code.`
          : 'Too many resend requests. Please try again later.';
        
        return NextResponse.json(
          {
            error: errorMessage,
            retryAfter: resendResult.retryAfter,
            resetTime: resendResult.resetTime,
            cooldownSeconds: resendResult.cooldownRemaining,
          },
          {
            status: 429,
            headers: {
              'X-RateLimit-Limit': '10',
              'X-RateLimit-Remaining': resendResult.remaining.toString(),
              'X-RateLimit-Reset': resendResult.resetTime.toString(),
              'Retry-After': resendResult.retryAfter?.toString() || '30',
            },
          }
        );
      }
    }
    
    // Check for suspicious activity
    const isSuspicious = emailVerificationRateLimiter.detectSuspiciousActivity(identifier, email);
    if (isSuspicious) {
      // For now, just log it. In production, you might want to add additional restrictions
      console.warn(`Suspicious email verification activity detected from ${identifier}`, { email });
    }
    
    // Call the handler
    const response = await handler(request);
    
    // Record successful resend if applicable
    if (options.checkResendRequests && email && response.status === 200) {
      emailVerificationRateLimiter.recordResendSuccess(email);
    }
    
    return response;
    
  } catch (error) {
    console.error('Email verification rate limit middleware error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Middleware specifically for verification attempts
 */
export async function withVerificationRateLimit(
  request: NextRequest,
  handler: (request: NextRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  return withEmailVerificationRateLimit(request, handler, {
    checkVerificationAttempts: true,
    checkOverallActivity: true,
    requireEmail: true,
  });
}

/**
 * Middleware specifically for resend requests
 */
export async function withResendRateLimit(
  request: NextRequest,
  handler: (request: NextRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  return withEmailVerificationRateLimit(request, handler, {
    checkResendRequests: true,
    checkOverallActivity: true,
    requireEmail: true,
  });
}

/**
 * Security monitoring endpoint middleware
 */
export async function withSecurityMonitoring(
  request: NextRequest,
  handler: (request: NextRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    const identifier = getClientIdentifier(request);
    
    // Basic rate limiting for monitoring endpoints
    const activityResult = emailVerificationRateLimiter.checkEmailVerificationActivity(identifier);
    
    if (!activityResult.allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429 }
      );
    }
    
    return await handler(request);
    
  } catch (error) {
    console.error('Security monitoring middleware error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}