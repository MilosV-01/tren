import { NextRequest, NextResponse } from 'next/server';
import { API_INTERNAL_URL } from '@/lib/config';

/**
 * Same-origin proxy for the UNAUTHENTICATED guest / gallery API.
 *
 * The guest page is opened from a QR code on a phone, so it may be served from
 * localhost, a LAN IP, or a real domain. Routing every API call back through the
 * same origin the page was loaded from means there is nothing host-specific to
 * configure and no browser CORS in play — the only cross-origin hop left is the
 * presigned PUT/GET straight to object storage.
 */
const FORWARD_HEADERS = ['content-type', 'x-guest-session', 'x-gallery-access'];

async function forward(req: NextRequest, path: string[]): Promise<NextResponse> {
  const target = `${API_INTERNAL_URL}/api/${path.join('/')}${req.nextUrl.search}`;
  const method = req.method.toUpperCase();
  const hasBody = method !== 'GET' && method !== 'HEAD';

  const headers: Record<string, string> = {};
  for (const h of FORWARD_HEADERS) {
    const v = req.headers.get(h);
    if (v) headers[h] = v;
  }
  if (hasBody && !headers['content-type']) headers['content-type'] = 'application/json';

  const upstream = await fetch(target, {
    method,
    headers,
    body: hasBody ? await req.text() : undefined,
    cache: 'no-store',
  });

  const text = await upstream.text();
  return new NextResponse(text || null, {
    status: upstream.status,
    headers: { 'content-type': upstream.headers.get('content-type') ?? 'application/json' },
  });
}

type Ctx = { params: { path: string[] } };
export const GET = (req: NextRequest, { params }: Ctx) => forward(req, params.path);
export const POST = (req: NextRequest, { params }: Ctx) => forward(req, params.path);
export const PATCH = (req: NextRequest, { params }: Ctx) => forward(req, params.path);
export const DELETE = (req: NextRequest, { params }: Ctx) => forward(req, params.path);
