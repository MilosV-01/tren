import { NextResponse } from 'next/server';
import { AUTH_COOKIE } from '@/lib/config';

export async function POST(): Promise<NextResponse> {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, '', { path: '/', maxAge: 0 });
  return res;
}
