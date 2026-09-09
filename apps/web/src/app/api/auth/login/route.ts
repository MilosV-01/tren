import { NextRequest, NextResponse } from 'next/server';
import { API_INTERNAL_URL } from '@/lib/config';
import { AUTH_COOKIE, authCookieOptions } from '@/lib/auth-cookie';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const payload = await req.json().catch(() => null);
  const upstream = await fetch(`${API_INTERNAL_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await upstream.json().catch(() => null);

  if (!upstream.ok) {
    return NextResponse.json(body ?? { message: 'Prijava nije uspela' }, { status: upstream.status });
  }

  const res = NextResponse.json({ user: body.user });
  res.cookies.set(AUTH_COOKIE, body.token, authCookieOptions);
  return res;
}
