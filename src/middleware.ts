import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js Middleware for Supabase Authentication
 * 
 * This middleware runs on every request to the application and is responsible for:
 * 1. Creating a Supabase client with the request and response
 * 2. Refreshing the session if needed
 * 3. Passing the session data to the application
 * 
 * The middleware doesn't redirect users based on authentication status.
 * That logic is handled by individual pages/layouts for more flexibility.
 */
export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  await supabase.auth.getSession();
  return res;
}

/**
 * Matcher Configuration
 * 
 * Specifies which routes this middleware should run on.
 * Excludes static files, images, favicon, and public files.
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}; 