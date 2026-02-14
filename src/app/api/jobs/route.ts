import { NextRequest, NextResponse } from "next/server";
import { getSpecByMediaId, appendJob, getJobs } from "@/lib/sheets";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month") ?? undefined;
  const status = searchParams.get("status") ?? undefined;
  const vendor = searchParams.get("vendor") ?? undefined;
  const media_id = searchParams.get("media_id") ?? undefined;
  const q = searchParams.get("q") ?? undefined;
  try {
    const list = await getJobs({ month, status, vendor, media_id, q });
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
    spec_snapshot = JSON.stringify(spec);
    type_spec_snapshot = "";
  }

  try {
    const job_id = await appendJob({
      requester_name: requester_name.trim(),
      media_id,
      media_name,
      vendor,
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
