import { NextResponse } from "next/server";
import { getSessionToken, deleteSession, clearSessionCookie } from "@/lib/auth";

export async function POST() {
  const token = getSessionToken();
  if (token) {
    await deleteSession(token).catch(() => {});
    clearSessionCookie();
  }
  return NextResponse.json({ ok: true });
}
