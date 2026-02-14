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
    requester_name: string;
    media_id: string;
    vendor?: string;
    due_date: string;
    qty: string;
    file_link?: string;
    changes_note?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { requester_name, media_id, due_date, qty } = body;
  if (!requester_name?.trim() || !media_id?.trim() || !due_date || !qty) {
    return NextResponse.json({ error: "requester_name, media_id, due_date, qty required" }, { status: 400 });
  }

  const spec = await getSpecByMediaId(media_id);
  if (!spec) return NextResponse.json({ error: "Unknown media_id" }, { status: 400 });

  const vendor = body.vendor?.trim() || spec.default_vendor;
  const specSnapshot = JSON.stringify(spec);

  try {
    const job_id = await appendJob({
      requester_name: requester_name.trim(),
      media_id,
      media_name: spec.media_name,
      vendor,
      due_date,
      qty: String(qty),
      file_link: body.file_link?.trim() ?? "",
      changes_note: body.changes_note?.trim() ?? "",
      status: "접수",
      spec_snapshot: specSnapshot,
      last_updated_by: "",
    });
    return NextResponse.json({ job_id });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to create job" }, { status: 500 });
  }
}
