import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE } from '@/lib/config';

/** Gate the organizer dashboard behind the presence of the auth cookie. */
export function middleware(req: NextRequest): NextResponse {
  const hasToken = Boolean(req.cookies.get(AUTH_COOKIE)?.value);
  if (!hasToken) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
