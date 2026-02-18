import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { createAuthToken, getCookieName, getCookieOptions } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { getVendorByPin } from "@/lib/sheets";

const HONEYPOT = "website_url"; // 봇이 채우면 실패

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip") ?? "127.0.0.1";
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: { pin?: string; [key: string]: string | undefined };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (body[HONEYPOT]) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const pin = body.pin?.trim();
  if (!pin || pin.length !== 6 || !/^\d{6}$/.test(pin)) {
    return NextResponse.json({ error: "PIN이 올바르지 않습니다" }, { status: 401 });
  }

  let hash = "";
  const b64 = process.env.TEAM_PIN_HASH_B64?.trim();
  if (b64) {
    try {
      hash = Buffer.from(b64, "base64").toString("utf8");
    } catch {
      hash = "";
    }
  }
  if (!hash) hash = (process.env.TEAM_PIN_HASH ?? "").trim().replace(/^['"]|['"]$/g, "");
  if (!hash) {
    return NextResponse.json({
      error: "서버에 PIN이 설정되지 않았습니다. .env.local에 TEAM_PIN_HASH 또는 TEAM_PIN_HASH_B64를 설정해 주세요.",
    }, { status: 500 });
  }

  // 1. 관리자 PIN 확인 (기존 로직)
  const match = await bcrypt.compare(pin, hash);
  if (match) {
    const token = await createAuthToken("admin");
    const res = NextResponse.json({ ok: true });
    res.cookies.set(getCookieName(), token, getCookieOptions());
    return res;
  }

  // 2. 제작업체 PIN 확인
  try {
    const vendor = await getVendorByPin(pin);
    if (vendor) {
      const token = await createAuthToken("vendor", vendor.vendor_id);
      const res = NextResponse.json({ ok: true });
      res.cookies.set(getCookieName(), token, getCookieOptions());
      return res;
    }
  } catch (e) {
    // vendors 시트가 없거나 오류 시 무시하고 계속 진행
    console.warn("Failed to check vendor PIN:", e);
  }

  // 3. 둘 다 실패
  return NextResponse.json({ error: "PIN이 올바르지 않습니다" }, { status: 401 });
}
