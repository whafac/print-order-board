import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { createAuthToken, getCookieName, getCookieOptions } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";

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

  const match = await bcrypt.compare(pin, hash);
  if (!match) {
    return NextResponse.json({ error: "PIN이 올바르지 않습니다" }, { status: 401 });
  }

  const token = await createAuthToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(getCookieName(), token, getCookieOptions());
  return res;
}
