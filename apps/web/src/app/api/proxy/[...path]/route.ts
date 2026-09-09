import { NextRequest, NextResponse } from 'next/server';
import { API_INTERNAL_URL, AUTH_COOKIE } from '@/lib/config';

/**
 * Same-origin proxy for organizer API calls made from client components. Adds
 * the JWT from the httpOnly cookie as a Bearer token so client JS never sees it.
 */
async function forward(req: NextRequest, path: string[]): Promise<NextResponse> {
  const token = req.cookies.get(AUTH_COOKIE)?.value;
  const search = req.nextUrl.search;
  const target = `${API_INTERNAL_URL}/api/${path.join('/')}${search}`;

  const method = req.method.toUpperCase();
  const hasBody = method !== 'GET' && method !== 'HEAD' && method !== 'DELETE';

  const upstream = await fetch(target, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: hasBody ? await req.text() : undefined,
    cache: 'no-store',
  });

  const text = await upstream.text();
  return new NextResponse(text || null, {
    status: upstream.status,
    headers: { 'Content-Type': upstream.headers.get('Content-Type') ?? 'application/json' },
  });
}

type Ctx = { params: { path: string[] } };

export const GET = (req: NextRequest, { params }: Ctx) => forward(req, params.path);
export const POST = (req: NextRequest, { params }: Ctx) => forward(req, params.path);
export const PATCH = (req: NextRequest, { params }: Ctx) => forward(req, params.path);
export const PUT = (req: NextRequest, { params }: Ctx) => forward(req, params.path);
export const DELETE = (req: NextRequest, { params }: Ctx) => forward(req, params.path);
