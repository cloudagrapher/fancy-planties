import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Define protected routes that require authentication
const protectedRoutes = [
  '/dashboard',
  '/api/plants',
  '/api/propagations',
  '/api/care',
  '/api/user',
];

// Define routes that require email verification
const verificationRequiredRoutes = [
  '/dashboard',
  '/api/plants',
  '/api/propagations',
  '/api/care',
  '/api/user',
];

// Define auth routes that should redirect if already authenticated
const authRoutes = [
  '/auth/signin',
  '/auth/signup',
  '/auth/forgot-password',
];

// Define public API routes that don't require authentication (or CSRF tokens)
const publicApiRoutes = [
  '/api/auth/signin',
  '/api/auth/signup',
  '/api/auth/signout',
  '/api/auth/verify-email',
  '/api/auth/resend-verification',
  '/api/auth/check-verification',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/health',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get('auth_session');
  const isAuthenticated = !!sessionCookie?.value;

  // CSRF Protection: validate Origin header for all state-changing API requests
  if (pathname.startsWith('/api/') && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
    const origin = request.headers.get('origin');
    const host = request.headers.get('host');
    
    // Allow requests with no Origin only if they have a matching Referer (same-origin navigations)
    if (origin) {
      const originHost = new URL(origin).host;
      if (originHost !== host) {
        return NextResponse.json(
          { error: 'CSRF validation failed' },
          { status: 403 }
        );
      }
    } else {
      // No Origin header — check Referer as fallback
      const referer = request.headers.get('referer');
      if (referer) {
        const refererHost = new URL(referer).host;
        if (refererHost !== host) {
          return NextResponse.json(
            { error: 'CSRF validation failed' },
            { status: 403 }
          );
        }
      }
      // If neither Origin nor Referer is present, the request likely comes from
      // a non-browser client (curl, server-to-server). Allow it through since
      // session cookies won't be attached by non-browser clients.
    }

    // Double-submit cookie CSRF check for authenticated requests
    // Clients must fetch a token from GET /api/csrf and send it as x-csrf-token header
    if (isAuthenticated && !publicApiRoutes.some(route => pathname.startsWith(route))) {
      const csrfHeader = request.headers.get('x-csrf-token');
      const csrfCookie = request.cookies.get('csrf-token')?.value;
      
      if (csrfHeader && csrfCookie && csrfHeader === csrfCookie) {
        // Valid double-submit — continue
      } else if (!csrfHeader) {
        // No CSRF token header provided — reject
        return NextResponse.json(
          { error: 'CSRF token required. Fetch a token from GET /api/csrf and send it as x-csrf-token header.' },
          { status: 403 }
        );
      } else {
        // Token mismatch
        return NextResponse.json(
          { error: 'Invalid CSRF token' },
          { status: 403 }
        );
      }
    }
  }

  // Check if the route is protected
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname.startsWith(route)
  );

  // Check if the route requires email verification
  const requiresVerification = verificationRequiredRoutes.some(route => 
    pathname.startsWith(route)
  );

  // Check if the route is an auth route
  const isAuthRoute = authRoutes.some(route => 
    pathname.startsWith(route)
  );

  // Check if it's a public API route
  const isPublicApiRoute = publicApiRoutes.some(route => 
    pathname.startsWith(route)
  );

  // Allow public API routes
  if (isPublicApiRoute) {
    return NextResponse.next();
  }

  // Allow access to email verification page for authenticated users
  if (pathname === '/auth/verify-email' && isAuthenticated) {
    return NextResponse.next();
  }

  // Redirect unauthenticated users from protected routes
  if (isProtectedRoute && !isAuthenticated) {
    const signInUrl = new URL('/auth/signin', request.url);
    signInUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Check email verification for authenticated users on verification-required routes
  if (requiresVerification && isAuthenticated && sessionCookie?.value) {
    try {
      // Make a request to our internal API to check verification status
      const verificationCheckUrl = new URL('/api/auth/check-verification', request.url);
      const verificationResponse = await fetch(verificationCheckUrl, {
        headers: {
          'Cookie': request.headers.get('cookie') || '',
        },
      });
      
      if (verificationResponse.ok) {
        const { isVerified } = await verificationResponse.json();
        
        if (!isVerified) {
          // For API routes, return 403 instead of redirect
          if (pathname.startsWith('/api/')) {
            return NextResponse.json(
              { 
                error: 'Email verification required',
                code: 'EMAIL_VERIFICATION_REQUIRED',
                message: 'Please verify your email address to access this resource.'
              },
              { status: 403 }
            );
          }
          
          // For page routes, redirect to verification page
          return NextResponse.redirect(new URL('/auth/verify-email', request.url));
        }
      } else if (verificationResponse.status === 401) {
        // User is not authenticated, redirect to signin
        const signInUrl = new URL('/auth/signin', request.url);
        signInUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(signInUrl);
      }
    } catch (error) {
      // If verification check fails, allow the request to continue
      // The individual route handlers will handle authentication
      console.error('Verification check error in middleware:', error);
    }
  }

  // Redirect authenticated users from auth routes (except verify-email)
  if (isAuthRoute && isAuthenticated && pathname !== '/auth/verify-email') {
    const redirectUrl = request.nextUrl.searchParams.get('redirect') || '/dashboard';
    return NextResponse.redirect(new URL(redirectUrl, request.url));
  }

  // Add security headers
  const response = NextResponse.next();
  
  // Security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  // CSP header for enhanced security
  const cspHeader = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Next.js requires unsafe-inline and unsafe-eval
    "style-src 'self' 'unsafe-inline'", // Tailwind requires unsafe-inline
    "img-src 'self' data: blob: https://cdn.fancy-planties.com https://cdn.fancy-planties.cloudagrapher.com https://*.cloudfront.net",
    "font-src 'self'",
    "connect-src 'self' https://cdn.fancy-planties.com https://cdn.fancy-planties.cloudagrapher.com https://sl4zllu188.execute-api.us-east-1.amazonaws.com",
    "frame-ancestors 'none'",
  ].join('; ');
  
  response.headers.set('Content-Security-Policy', cspHeader);

  return response;
}

// Configure which routes the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};