import { NextResponse } from "next/server";
import { getUserRole } from "@/lib/auth";

export async function GET() {
  try {
    const role = await getUserRole();
    return NextResponse.json({ role });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to get user role" }, { status: 500 });
  }
}
