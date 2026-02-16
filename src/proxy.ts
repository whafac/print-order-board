import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const AUTH_COOKIE = "auth_token";

async function verifyToken(token: string): Promise<boolean> {
  const secret = process.env.AUTH_TOKEN_SECRET;
  if (!secret) return false;
  try {
    await jwtVerify(token, new TextEncoder().encode(secret));
    return true;
  } catch {
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAuthApi = pathname === "/api/auth/pin" || pathname === "/api/auth/logout";
  if (isAuthApi) return NextResponse.next();

  const isApi = pathname.startsWith("/api/");
  const isProtectedPage = pathname.startsWith("/list") || pathname.startsWith("/jobs") || pathname.startsWith("/new") || pathname.startsWith("/specs") || pathname === "/";

  const token = request.cookies.get(AUTH_COOKIE)?.value;

  if (isApi) {
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const valid = await verifyToken(token);
    if (!valid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  if (isProtectedPage) {
    if (!token) {
      if (pathname === "/") return NextResponse.next();
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
    const valid = await verifyToken(token);
    if (!valid) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
    if (pathname === "/") {
      const url = request.nextUrl.clone();
      url.pathname = "/list";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/list", "/list/:path*", "/jobs/:path*", "/new", "/specs", "/specs/:path*", "/api/:path*"],
};
