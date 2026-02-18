import { NextRequest, NextResponse } from "next/server";
import { getVendors, createVendor } from "@/lib/sheets";
import { getUserRole } from "@/lib/auth";
import type { VendorRow } from "@/lib/sheets";

// GET: 제작업체 목록 조회 (관리자만)
export async function GET(request: NextRequest) {
  const role = await getUserRole();
  if (role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const vendors = await getVendors();
    return NextResponse.json(vendors);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch vendors" }, { status: 500 });
  }
}

// POST: 제작업체 추가 (관리자만)
export async function POST(request: NextRequest) {
  const role = await getUserRole();
  if (role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  let body: {
    vendor_id: string;
    vendor_name: string;
    pin: string; // 6자리 PIN 번호
    is_active?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { vendor_id, vendor_name, pin, is_active } = body;
  if (!vendor_id?.trim() || !vendor_name?.trim() || !pin?.trim()) {
    return NextResponse.json({ error: "vendor_id, vendor_name, pin 필수" }, { status: 400 });
  }

  // PIN 번호 검증
  if (!/^\d{6}$/.test(pin.trim())) {
    return NextResponse.json({ error: "PIN은 6자리 숫자여야 합니다" }, { status: 400 });
  }

  // PIN 해시 생성
  const bcrypt = await import("bcrypt");
  const hash = bcrypt.hashSync(pin.trim(), 10);
  const hashB64 = Buffer.from(hash, "utf8").toString("base64");

  const vendor: Omit<VendorRow, "created_at" | "updated_at"> = {
    vendor_id: vendor_id.trim(),
    vendor_name: vendor_name.trim(),
    pin_hash_b64: hashB64,
    is_active: is_active === "FALSE" ? "FALSE" : "TRUE",
  };

  try {
    const success = await createVendor(vendor);
    if (!success) {
      return NextResponse.json({ error: "Failed to create vendor" }, { status: 500 });
    }
    return NextResponse.json({ ok: true, vendor_id: vendor.vendor_id });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to create vendor" }, { status: 500 });
  }
}
