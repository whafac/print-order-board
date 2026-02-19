import { NextRequest, NextResponse } from "next/server";
import { getJobById, updateJob, updateJobContent } from "@/lib/sheets";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ job_id: string }> }
) {
  const { job_id } = await params;
  try {
    const job = await getJobById(job_id);
    if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(job);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch job" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ job_id: string }> }
) {
  const { job_id } = await params;
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const isContentUpdate = "requester_name" in body || "order_type" in body || "spec_snapshot" in body || "type_spec_snapshot" in body;

  try {
    if (isContentUpdate) {
      const updates: Record<string, string> = {};
      const keys = ["requester_name", "media_id", "media_name", "vendor", "due_date", "qty", "file_link", "changes_note", "spec_snapshot", "type_spec_snapshot", "last_updated_by"];
      for (const k of keys) {
        if (body[k] !== undefined) updates[k] = String(body[k] ?? "");
      }
      const ok = await updateJobContent(job_id, updates);
      if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
    } else {
      const ok = await updateJob(job_id, {
        status: body.status as string | undefined,
        last_updated_by: body.last_updated_by as string | undefined,
        production_cost: body.production_cost as string | undefined,
      });
      if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update job" }, { status: 500 });
  }
}
