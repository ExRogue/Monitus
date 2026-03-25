import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = [
  '/',
  '/login',
  '/register',
  '/verify-email',
  '/forgot-password',
  '/reset-password',
  '/terms',
  '/privacy',
  '/about',
  '/pricing',
  '/contact',
  '/blog',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/logout',
  '/api/auth/verify-email',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/google',
  '/api/auth/linkedin',
  '/api/auth/slack',
  '/api/auth/me',
  '/api/billing/plans',
  '/api/waitlist',
  '/api/webhooks/stripe',
  '/api/content',
  '/api/cron',
  '/api/health',
  '/api/v1',
  '/shared',
  '/sitemap.xml',
  '/robots.txt',
];

// Paths that unverified users can access (besides PUBLIC_PATHS)
const UNVERIFIED_ALLOWED = [
  '/verify-email',
  '/api/auth/verify-email',
  '/api/auth/logout',
  '/api/auth/me',
  '/narrative',
  '/api/onboarding/quick-start',
  '/api/messaging-bible',
  '/api/company',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get('host') || '';

  // Redirect non-www to www in production (cookie domain consistency)
  if (hostname === 'monitus.ai') {
    const url = request.nextUrl.clone();
    url.host = 'www.monitus.ai';
    return NextResponse.redirect(url, 301);
  }

  // Allow public assets
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.ico')
  ) {
    return NextResponse.next();
  }

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return addSecurityHeaders(NextResponse.next());
  }

  // Check for auth token
  const token = request.cookies.get('monitus_token')?.value;
  if (!token) {
    // API routes return 401, pages redirect to login
    if (pathname.startsWith('/api/')) {
      return addSecurityHeaders(
        NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      );
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Email verification enforcement — DISABLED until Loops templates are ready
  // TODO: Re-enable before production launch

  // Add security headers to all responses
  return addSecurityHeaders(NextResponse.next());
}

function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()'
  );
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self' https://api.stripe.com https://accounts.google.com https://oauth2.googleapis.com; frame-src https://js.stripe.com https://accounts.google.com;"
  );
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};
