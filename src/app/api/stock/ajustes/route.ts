import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/stock/ajustes?storeId=xxx&productId=yyy&limit=50
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const storeId = url.searchParams.get("storeId");
  const productId = url.searchParams.get("productId");
  const limit = parseInt(url.searchParams.get("limit") || "50");

  const where: Record<string, unknown> = {};
  if (storeId && storeId !== "all") where.storeId = storeId;
  if (productId) where.productId = productId;

  const adjustments = await prisma.stockAdjustment.findMany({
    where,
    include: {
      store: { select: { id: true, name: true } },
      product: { select: { id: true, name: true, unit: true } },
    },
    orderBy: { date: "desc" },
    take: limit,
  });

  return NextResponse.json(adjustments);
}

// POST /api/stock/ajustes
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { storeId, productId, date, quantity, type, reason, notes } = body;

    if (!storeId || !productId || !date || quantity === undefined) {
      return NextResponse.json(
        { error: "storeId, productId, date y quantity son requeridos" },
        { status: 400 }
      );
    }

    const adjustment = await prisma.stockAdjustment.create({
      data: {
        storeId,
        productId,
        date: new Date(date),
        quantity: parseFloat(quantity),
        type: type || "merma",
        reason: reason || null,
        notes: notes || null,
      },
      include: {
        store: { select: { name: true } },
        product: { select: { name: true, unit: true } },
      },
    });

    return NextResponse.json(adjustment, { status: 201 });
  } catch (err) {
    console.error("[stock/ajustes POST]", err);
    return NextResponse.json({ error: "Error al crear ajuste" }, { status: 500 });
  }
}

// DELETE /api/stock/ajustes?id=xxx
export async function DELETE(request: NextRequest) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

  await prisma.stockAdjustment.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
