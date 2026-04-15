import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const stores = await prisma.store.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(stores);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const store = await prisma.store.create({
    data: {
      name: body.name,
      address: body.address || null,
    },
  });
  return NextResponse.json(store, { status: 201 });
}
