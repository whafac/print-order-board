import { NextRequest, NextResponse } from "next/server";
import { getJobById, updateJob, updateJobContent, calculateProductionCostFromSpec, calculateSheetProductionCost, getVendors } from "@/lib/sheets";
import { getUserRole, getVendorId } from "@/lib/auth";

function parseStoredProductionCost(value: unknown): number | null {
  const normalized = String(value ?? "").replace(/[^\d-]/g, "");
  if (!normalized || normalized === "-") return null;
  const parsed = parseInt(normalized, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

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
    const currentJob = await getJobById(job_id);
    if (!currentJob) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const userRole = await getUserRole();
    const currentVendorId = await getVendorId();
    let currentVendorName = "";
    if (userRole === "vendor") {
      const vendors = await getVendors();
      currentVendorName = vendors.find((v) => v.vendor_id === currentVendorId)?.vendor_name ?? "";
      const belongsToVendor = Boolean(
        (currentVendorId && currentJob.vendor_id && currentJob.vendor_id === currentVendorId) ||
        (currentVendorName && currentJob.vendor === currentVendorName)
      );
      if (!belongsToVendor) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (isContentUpdate) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    if (isContentUpdate) {
      const updates: Record<string, string> = {};
      const keys = ["requester_name", "media_id", "media_name", "vendor", "due_date", "qty", "file_link", "changes_note", "spec_snapshot", "type_spec_snapshot", "last_updated_by"];
      for (const k of keys) {
        if (body[k] !== undefined) updates[k] = String(body[k] ?? "");
      }
      // order_type별 미사용 snapshot 초기화 (기존값 유지로 인한 되돌림 방지)
      const orderType = body.order_type as string;
      if (orderType === "sheet") {
        updates.spec_snapshot = "";
      } else if (orderType === "book") {
        updates.type_spec_snapshot = "";
      }
      // 제작금액 재계산 및 포함
      const qty = String(body.qty ?? "");
      let vendorId = body.vendor_id as string | undefined;
      if (!vendorId && updates.vendor) {
        const vendors = await getVendors();
        const matched = vendors.find((v) => v.vendor_name === updates.vendor);
        if (matched) vendorId = matched.vendor_id;
      }
      if (orderType === "sheet" && updates.type_spec_snapshot) {
        const cost = await calculateSheetProductionCost(updates.type_spec_snapshot, vendorId);
        if (cost !== null) updates.production_cost = String(cost);
      } else if (orderType === "book" && updates.spec_snapshot) {
        try {
          const spec = JSON.parse(updates.spec_snapshot) as Record<string, unknown>;
          spec.order_type = "book";
          const cost = await calculateProductionCostFromSpec(spec, qty, vendorId);
          if (cost !== null) updates.production_cost = String(cost);
        } catch {
          // 무시
        }
      }
      const ok = await updateJobContent(job_id, updates);
      if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
    } else {
      let changesNoteForAudit: string | undefined;
      if (body.production_cost !== undefined) {
        const newCost = parseStoredProductionCost(body.production_cost);
        if (newCost === null) {
          return NextResponse.json({ error: "Invalid production_cost" }, { status: 400 });
        }
        const prevCost = parseStoredProductionCost(currentJob.production_cost);
        const prevCostLabel = prevCost !== null ? `${prevCost.toLocaleString()}원` : (currentJob.production_cost || "-");
        const updater =
          String(body.last_updated_by ?? "").trim() ||
          (userRole === "vendor" ? (currentVendorName || "제작업체") : "관리자");
        const now = new Date().toISOString();
        const auditLine = `[금액수정 ${now}] ${updater}: ${prevCostLabel} -> ${newCost.toLocaleString()}원`;
        const baseNote = String(currentJob.changes_note ?? "").trim();
        changesNoteForAudit =
          baseNote && baseNote !== "없음"
            ? `${baseNote}\n${auditLine}`
            : auditLine;
      }
      const ok = await updateJob(job_id, {
        status: body.status as string | undefined,
        last_updated_by: body.last_updated_by as string | undefined,
        production_cost: body.production_cost as string | undefined,
        changes_note: changesNoteForAudit,
      });
      if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update job" }, { status: 500 });
  }
}
