import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const key = url.searchParams.get("key");

  if (key) {
    const setting = await prisma.appSetting.findUnique({ where: { key } });
    if (!setting) return NextResponse.json(null);
    return NextResponse.json({ ...setting, value: JSON.parse(setting.value) });
  }

  const settings = await prisma.appSetting.findMany();
  return NextResponse.json(
    settings.map((s) => ({ ...s, value: JSON.parse(s.value) }))
  );
}

export async function PUT(request: NextRequest) {
  const body = await request.json();

  const setting = await prisma.appSetting.upsert({
    where: { key: body.key },
    update: { value: JSON.stringify(body.value), label: body.label },
    create: { key: body.key, value: JSON.stringify(body.value), label: body.label || body.key },
  });

  return NextResponse.json(setting);
}
