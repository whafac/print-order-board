import { NextRequest, NextResponse } from "next/server";
import { getSpecList, appendSpec } from "@/lib/sheets";
import type { SpecRow } from "@/lib/sheets";

export async function GET() {
  try {
    const list = await getSpecList();
    return NextResponse.json(list);
  } catch (e: any) {
    console.error(e);
    if (e?.code === 403 || e?.response?.status === 403) {
      return NextResponse.json({
        error: "Google 시트 접근 권한이 없습니다. 시트에 서비스 계정 이메일(print-order-board@astute-coda-474715-j8.iam.gserviceaccount.com)을 편집자 권한으로 공유해 주세요.",
      }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed to fetch spec" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  let body: Partial<SpecRow>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const media_id = body.media_id?.trim();
  const media_name = body.media_name?.trim();
  if (!media_id || !media_name) {
    return NextResponse.json({ error: "media_id, media_name 필수" }, { status: 400 });
  }
  const spec: SpecRow = {
    media_id,
    media_name,
    default_vendor: body.default_vendor ?? "",
    trim_size: body.trim_size ?? "",
    cover_type: body.cover_type ?? "",
    cover_paper: body.cover_paper ?? "",
    cover_print: body.cover_print ?? "",
    inner_pages: body.inner_pages ?? "",
    inner_paper: body.inner_paper ?? "",
    inner_print: body.inner_print ?? "",
    binding: body.binding ?? "",
    finishing: body.finishing ?? "",
    packaging_delivery: body.packaging_delivery ?? "",
    file_rule: body.file_rule ?? "",
  };
  try {
    await appendSpec(spec);
    return NextResponse.json({ ok: true, media_id });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to add spec" }, { status: 500 });
  }
}
