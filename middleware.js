// middleware.js (or .ts)
import { NextResponse } from 'next/server';

export function middleware() {
  // Pass-through – no headers added
  return NextResponse.next();
}

// If you had a matcher, keep it; otherwise you can remove this export.
export const config = {
  matcher: ['/((?!_next|favicon.ico).*)'],
};
