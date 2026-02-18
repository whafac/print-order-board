import { NextRequest, NextResponse } from "next/server";
import { getVendorById, updateVendor, deleteVendor } from "@/lib/sheets";
import { getUserRole } from "@/lib/auth";
import type { VendorRow } from "@/lib/sheets";

// GET: 제작업체 조회 (관리자만)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ vendor_id: string }> }
) {
  const role = await getUserRole();
  if (role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { vendor_id } = await params;
  try {
    const vendor = await getVendorById(vendor_id);
    if (!vendor) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(vendor);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch vendor" }, { status: 500 });
  }
}

// PATCH: 제작업체 수정 (관리자만)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ vendor_id: string }> }
) {
  const role = await getUserRole();
  if (role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { vendor_id } = await params;
  let body: {
    vendor_name?: string;
    pin?: string; // PIN 변경 시
    is_active?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const updates: Partial<VendorRow> = {};
  if (body.vendor_name !== undefined) {
    updates.vendor_name = body.vendor_name.trim();
  }
  if (body.is_active !== undefined) {
    updates.is_active = body.is_active === "FALSE" ? "FALSE" : "TRUE";
  }
  if (body.pin !== undefined) {
    // PIN 번호 검증
    if (!/^\d{6}$/.test(body.pin.trim())) {
      return NextResponse.json({ error: "PIN은 6자리 숫자여야 합니다" }, { status: 400 });
    }
    // PIN 해시 생성
    const bcrypt = await import("bcrypt");
    const hash = bcrypt.hashSync(body.pin.trim(), 10);
    const hashB64 = Buffer.from(hash, "utf8").toString("base64");
    updates.pin = body.pin.trim(); // PIN 평문 저장 (관리자 확인용)
    updates.pin_hash_b64 = hashB64;
  }

  try {
    const success = await updateVendor(vendor_id, updates);
    if (!success) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update vendor" }, { status: 500 });
  }
}

// DELETE: 제작업체 삭제 (관리자만)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ vendor_id: string }> }
) {
  const role = await getUserRole();
  if (role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { vendor_id } = await params;
  try {
    const success = await deleteVendor(vendor_id);
    if (!success) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to delete vendor" }, { status: 500 });
  }
}
