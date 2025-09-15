import { NextRequest, NextResponse } from 'next/server';
import { getCSRFToken, createCSRFCookieHeaders } from '@/lib/auth/csrf';

/**
 * GET /api/csrf - Get CSRF token for authenticated users
 * This endpoint provides CSRF tokens for frontend forms
 */
export async function GET(request: NextRequest) {
  try {
    const token = await getCSRFToken();
    
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized - no active session' },
        { status: 401 }
      );
    }
    
    const response = NextResponse.json({ csrfToken: token });
    
    // Set CSRF token in httpOnly cookie for double-submit pattern
    const cookieHeaders = createCSRFCookieHeaders(token);
    Object.entries(cookieHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    
    return response;
  } catch (error) {
    console.error('CSRF token generation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}