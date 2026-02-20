import { NextRequest, NextResponse } from "next/server";
import { getVendorPricing } from "@/lib/sheets";

// GET: 제작업체별 단가 조회 (vendor_id 쿼리 파라미터)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const vendorId = searchParams.get("vendor_id");
  if (!vendorId?.trim()) {
    return NextResponse.json({ error: "vendor_id required" }, { status: 400 });
  }

  try {
    const pricing = await getVendorPricing(vendorId.trim());
    return NextResponse.json(pricing);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch vendor pricing" }, { status: 500 });
  }
}
