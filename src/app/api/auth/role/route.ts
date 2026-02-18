import { NextResponse } from "next/server";
import { getUserRole, getVendorId } from "@/lib/auth";
import { getVendorById } from "@/lib/sheets";

export async function GET() {
  try {
    const role = await getUserRole();
    const vendorId = await getVendorId();
    let vendorName: string | null = null;
    
    if (role === "vendor" && vendorId) {
      const vendor = await getVendorById(vendorId);
      vendorName = vendor?.vendor_name ?? null;
    }
    
    return NextResponse.json({ role, vendor_id: vendorId, vendor_name: vendorName });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to get user role" }, { status: 500 });
  }
}
