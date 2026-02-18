import { NextRequest, NextResponse } from "next/server";
import { getSpecByMediaId, appendJob, getJobs, getVendors } from "@/lib/sheets";
import { getUserRole, getVendorId } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month") ?? undefined;
  const status = searchParams.get("status") ?? undefined;
  const vendor = searchParams.get("vendor") ?? undefined;
  const media_id = searchParams.get("media_id") ?? undefined;
  const q = searchParams.get("q") ?? undefined;
  
  // 사용자 역할에 따른 필터링
  const userRole = await getUserRole();
  const vendorId = await getVendorId();
  
  try {
    const filters: Parameters<typeof getJobs>[0] = { month, status, vendor, media_id, q };
    
    // 제작업체 로그인 시: 해당 업체의 의뢰서만 표시
    if (userRole === "vendor" && vendorId) {
      filters.vendor_id = vendorId;
    }
    // 관리자/의뢰자: 모든 의뢰서 표시 (필터 없음)
    
    const list = await getJobs(filters);
    return NextResponse.json(list);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch jobs" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  let body: {
    order_type?: "book" | "sheet";
    requester_name: string;
    media_id?: string;
    media_name?: string;
    vendor?: string;
    due_date: string;
    qty: string;
    file_link?: string;
    changes_note?: string;
    type_spec?: Record<string, unknown>;
    spec_snapshot?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const order_type = body.order_type ?? "book";
  const { requester_name, due_date, qty } = body;
  if (!requester_name?.trim() || !due_date || !qty) {
    return NextResponse.json({ error: "requester_name, due_date, qty required" }, { status: 400 });
  }

  let media_id: string;
  let media_name: string;
  let vendor: string;
  let vendor_id: string | undefined;
  let spec_snapshot: string;
  let type_spec_snapshot: string;

  if (order_type === "sheet") {
    media_id = "sheet";
    media_name = body.media_name?.trim() || "낱장 인쇄물";
    vendor = body.vendor?.trim() || "";
    spec_snapshot = "";
    type_spec_snapshot = JSON.stringify(body.type_spec ?? {});
  } else {
    const media_id_req = body.media_id?.trim();
    if (!media_id_req) {
      return NextResponse.json({ error: "media_id required for book order" }, { status: 400 });
    }
    const spec = await getSpecByMediaId(media_id_req);
    if (!spec) return NextResponse.json({ error: "Unknown media_id" }, { status: 400 });
    media_id = media_id_req;
    media_name = spec.media_name;
    vendor = body.vendor?.trim() || spec.default_vendor;
    spec_snapshot = body.spec_snapshot?.trim() || JSON.stringify(spec);
    type_spec_snapshot = "";
  }

  // vendor 이름으로 vendor_id 찾기
  if (vendor) {
    try {
      const vendors = await getVendors();
      const matchedVendor = vendors.find((v) => v.vendor_name === vendor);
      if (matchedVendor) {
        vendor_id = matchedVendor.vendor_id;
      }
    } catch {
      // vendors 시트가 없거나 오류 시 무시
    }
  }

  try {
    const job_id = await appendJob({
      requester_name: requester_name.trim(),
      media_id,
      media_name,
      vendor,
      vendor_id,
      due_date,
      qty: String(qty),
      file_link: body.file_link?.trim() ?? "",
      changes_note: body.changes_note?.trim() ?? "",
      status: "접수",
      spec_snapshot,
      last_updated_by: "",
      order_type,
      type_spec_snapshot,
    });
    return NextResponse.json({ job_id });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to create job" }, { status: 500 });
  }
}
