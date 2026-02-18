import { NextRequest, NextResponse } from "next/server";
import { getSpecByMediaId, updateSpecByMediaId } from "@/lib/sheets";
import type { SpecRow } from "@/lib/sheets";
import { getUserRole } from "@/lib/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ media_id: string }> }
) {
  // 제작업체는 매체사양관리 접근 불가
  const role = await getUserRole();
  if (role === "vendor") {
    return NextResponse.json({ error: "접근 권한이 없습니다. 관리자에게 문의해 주세요." }, { status: 403 });
  }

  const { media_id } = await params;
  try {
    const spec = await getSpecByMediaId(media_id);
    if (!spec) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(spec);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch spec" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ media_id: string }> }
) {
  // 제작업체는 매체사양관리 접근 불가
  const role = await getUserRole();
  if (role === "vendor") {
    return NextResponse.json({ error: "접근 권한이 없습니다. 관리자에게 문의해 주세요." }, { status: 403 });
  }

  const { media_id } = await params;
  let body: Partial<SpecRow>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const updates: Partial<SpecRow> = {};
  const keys: (keyof SpecRow)[] = [
    "media_id", "media_name", "default_vendor", "trim_size", "cover_type",
    "cover_paper", "cover_print", "inner_pages", "inner_paper", "inner_print",
    "binding", "finishing", "packaging_delivery", "file_rule", "additional_inner_pages",
  ];
  keys.forEach((k) => {
    if (body[k] !== undefined) updates[k] = String(body[k] ?? "");
  });
  try {
    const ok = await updateSpecByMediaId(media_id, updates);
    if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update spec" }, { status: 500 });
  }
}
