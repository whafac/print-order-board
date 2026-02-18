import { NextRequest, NextResponse } from "next/server";
import { getVendors } from "@/lib/sheets";
import { getUserRole } from "@/lib/auth";

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
