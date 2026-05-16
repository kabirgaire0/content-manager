import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "cm_session";

// Paths the middleware doesn't gate. Static assets are already excluded by the
// matcher below; this list covers app routes that must work unauthenticated.
const PUBLIC_PATHS = ["/login", "/setup"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (token) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    // Run on everything except Next internals, static files, and our API
    // proxies (those forward auth themselves and return 401 from the API
    // when the session is missing, which is the right behavior for fetches).
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
