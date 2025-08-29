import { NextResponse } from 'next/server';

export function middleware(req) {
  const res = NextResponse.next();
  res.headers.set(
    'Content-Security-Policy',
    "default-src 'self' https: data: blob:; img-src 'self' https: data: blob:; media-src 'self' https: blob:; connect-src 'self' https: wss:; script-src 'self' https: 'unsafe-eval' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline' https:; worker-src 'self' blob:"
  );
  return res;
}

export const config = {
  matcher: ['/((?!_next|favicon.ico).*)']
};
