import { NextRequest, NextResponse } from "next/server";
import { getSpecByMediaId, updateSpecByMediaId } from "@/lib/sheets";
import type { SpecRow } from "@/lib/sheets";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ media_id: string }> }
) {
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
  const { media_id } = await params;
  let body: Partial<SpecRow>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const updates: Partial<SpecRow> = {};
  const keys: (keyof SpecRow)[] = [
    "media_name", "default_vendor", "trim_size", "pages",
    "cover_paper", "inner_paper", "print_color", "binding",
    "finishing", "packaging_delivery", "file_rule",
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
