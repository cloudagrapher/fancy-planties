import 'server-only';

import { generateCSRFToken } from './middleware';
import { validateRequest } from './server';

/**
 * Generate a CSRF token for the current session
 * This should be called in server components or API routes
 */
export async function getCSRFToken(): Promise<string | null> {
  const { session } = await validateRequest();
  
  if (!session) {
    return null;
  }
  
  return generateCSRFToken(session.id);
}

/**
 * Create CSRF token cookie response headers
 * This helps set the CSRF token in a httpOnly cookie for double-submit pattern
 */
export function createCSRFCookieHeaders(token: string): Record<string, string> {
  const isProduction = process.env.NODE_ENV === 'production';
  
  return {
    'Set-Cookie': `csrf-token=${token}; HttpOnly; SameSite=${isProduction ? 'Strict' : 'Lax'}; ${isProduction ? 'Secure; ' : ''}Path=/; Max-Age=3600`
  };
}