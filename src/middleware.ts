import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const SESSION_COOKIE_NAME = 'pocketflow_session';

/**
 * Edge-compatible middleware for protecting dashboard pages.
 *
 * API routes (/api/v1/*) perform their own auth checks inside route handlers
 * using getCurrentUser() — middleware only handles page-level redirects.
 *
 * We use jose (edge-compatible JWT library) directly here, avoiding importing
 * from server-only modules that rely on next/headers (which is not available in edge).
 */

const PUBLIC_PATHS = ['/login', '/register', '/api/'];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Let static assets, next internals, and all API routes pass through
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;

  // No session cookie → redirect to login
  if (!token) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Verify JWT in the edge runtime using jose directly
  try {
    const secret = new TextEncoder().encode(
      process.env.AUTH_SECRET || 'pocketflow-super-secret-key-at-least-32-chars-long!'
    );
    await jwtVerify(token, secret, { algorithms: ['HS256'] });
    return NextResponse.next();
  } catch {
    // Invalid or expired token → clear cookie and redirect
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete(SESSION_COOKIE_NAME);
    return response;
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - /api/* (API routes handle their own auth)
     * - /login, /register (auth pages)
     */
    '/((?!_next/static|_next/image|favicon\\.ico|api/).*)',
  ],
};
