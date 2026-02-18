import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "auth_token";
const TOKEN_EXPIRY = "7d";

function getSecret() {
  const secret = process.env.AUTH_TOKEN_SECRET;
  if (!secret) throw new Error("AUTH_TOKEN_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export async function createAuthToken(role: "admin" | "vendor" | "requester" = "admin", vendorId?: string): Promise<string> {
  const secret = getSecret();
  const payload: { sub: string; role: string; vendor_id?: string } = {
    sub: "pin-auth",
    role,
  };
  if (role === "vendor" && vendorId) {
    payload.vendor_id = vendorId;
  }
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(secret);
}

export async function verifyAuthToken(token: string): Promise<boolean> {
  try {
    const secret = getSecret();
    await jwtVerify(token, secret);
    return true;
  } catch {
    return false;
  }
}

export async function getAuthTokenPayload(token: string): Promise<{ role?: string; vendor_id?: string } | null> {
  try {
    const secret = getSecret();
    const { payload } = await jwtVerify(token, secret);
    return {
      role: payload.role as string | undefined,
      vendor_id: payload.vendor_id as string | undefined,
    };
  } catch {
    return null;
  }
}

export async function getUserRole(): Promise<"admin" | "vendor" | "requester"> {
  const token = await getAuthTokenFromCookie();
  if (!token) return "admin"; // 기본값
  const payload = await getAuthTokenPayload(token);
  if (!payload || !payload.role) return "admin"; // 하위 호환: role이 없으면 admin
  return payload.role as "admin" | "vendor" | "requester";
}

export async function getVendorId(): Promise<string | null> {
  const token = await getAuthTokenFromCookie();
  if (!token) return null;
  const payload = await getAuthTokenPayload(token);
  return payload?.vendor_id ?? null;
}

export async function getAuthTokenFromCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value ?? null;
}

export async function isAuthenticated(): Promise<boolean> {
  const token = await getAuthTokenFromCookie();
  if (!token) return false;
  return verifyAuthToken(token);
}

export function getCookieName() {
  return COOKIE_NAME;
}

export function getCookieOptions() {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  };
}
