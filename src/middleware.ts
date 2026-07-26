import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = process.env.ADMIN_SESSION_COOKIE ?? "session";

/**
 * Cheap edge gate: no `session` cookie, no admin screens. The cookie is
 * httpOnly and signed server-side, so its presence is only a hint — every API
 * call is still authorised upstream, and a 401 from any endpoint sends the
 * user back here.
 */
export function middleware(request: NextRequest) {
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);
  const { pathname, search } = request.nextUrl;
  const isLogin = pathname === "/login";

  if (!hasSession && !isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  if (hasSession && isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.svg).*)"],
};
