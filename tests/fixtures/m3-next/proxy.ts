import { type NextRequest, NextResponse } from 'next/server';
export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const mode =
    request.nextUrl.searchParams.get('mode') === 'external'
      ? 'external'
      : 'nonce';
  const csp = `default-src 'none'; script-src 'self' 'nonce-${nonce}' 'strict-dynamic'; style-src 'self' ${mode === 'nonce' ? `'nonce-${nonce}'` : ''}; style-src-attr 'none'; img-src 'self' data:; font-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'`;
  const headers = new Headers(request.headers);
  headers.set('x-nonce', nonce);
  headers.set('x-style-mode', mode);
  headers.set('Content-Security-Policy', csp);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set('Content-Security-Policy', csp);
  return response;
}
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|app.css|capture.js|dotquilt/).*)',
  ],
};
