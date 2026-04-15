import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const storeId = url.searchParams.get("storeId");
  const latest = url.searchParams.get("latest");

  const where: any = {};
  if (storeId) where.storeId = storeId;

  if (latest === "true" && storeId) {
    const snapshot = await prisma.stockSnapshot.findFirst({
      where: { storeId },
      orderBy: { date: "desc" },
      include: {
        store: { select: { id: true, name: true } },
        items: {
          include: { product: { select: { id: true, name: true, unit: true } } },
          orderBy: { product: { name: "asc" } },
        },
      },
    });
    return NextResponse.json(snapshot);
  }

  const snapshots = await prisma.stockSnapshot.findMany({
    where,
    include: {
      store: { select: { id: true, name: true } },
      items: {
        include: { product: { select: { id: true, name: true, unit: true } } },
      },
    },
    orderBy: { date: "desc" },
    take: 50,
  });

  return NextResponse.json(snapshots);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const snapshot = await prisma.stockSnapshot.create({
    data: {
      storeId: body.storeId,
      date: new Date(body.date || Date.now()),
      source: body.source || "manual",
      imageUrl: body.imageUrl || null,
      notes: body.notes || null,
      items: {
        create: body.items.map((item: any) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
      },
    },
    include: {
      store: true,
      items: { include: { product: true } },
    },
  });

  return NextResponse.json(snapshot, { status: 201 });
}
