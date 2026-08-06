import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { legacyChatPathToQuery } from '@acongm/kb-catalog';

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (!pathname.startsWith('/c/')) {
    return NextResponse.next();
  }

  const target = legacyChatPathToQuery(pathname);
  const url = request.nextUrl.clone();
  const [path, query = ''] = target.split('?');
  url.pathname = path || '/';
  url.search = query ? `?${query}` : '';
  // preserve title etc from original search
  if (search) {
    const incoming = new URLSearchParams(search);
    const merged = new URLSearchParams(url.search);
    incoming.forEach((value, key) => {
      if (!merged.has(key)) merged.set(key, value);
    });
    url.search = `?${merged.toString()}`;
  }
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/c/:path*'],
};
