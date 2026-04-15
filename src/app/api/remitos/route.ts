import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const storeId = url.searchParams.get("storeId");
  const supplierId = url.searchParams.get("supplierId");
  const month = url.searchParams.get("month");
  const year = url.searchParams.get("year");
  const status = url.searchParams.get("status");

  const where: any = {};

  if (storeId && storeId !== "all") where.storeId = storeId;
  if (supplierId && supplierId !== "all") where.supplierId = supplierId;
  if (status && status !== "all") where.status = status;

  if (month && year) {
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
    where.date = { gte: startDate, lte: endDate };
  }

  const remitos = await prisma.deliveryNote.findMany({
    where,
    include: {
      store: { select: { id: true, name: true } },
      supplier: { select: { id: true, name: true } },
      items: {
        include: { product: { select: { id: true, name: true } } },
      },
    },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(remitos);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  // Check deduplication
  if (body.supplierId && body.noteNumber && body.date) {
    const existing = await prisma.deliveryNote.findFirst({
      where: {
        supplierId: body.supplierId,
        noteNumber: body.noteNumber,
        date: new Date(body.date),
        storeId: body.storeId,
      },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Posible duplicado detectado", existingId: existing.id },
        { status: 409 }
      );
    }
  }

  const remito = await prisma.deliveryNote.create({
    data: {
      storeId: body.storeId,
      supplierId: body.supplierId || null,
      supplierRaw: body.supplierRaw || null,
      noteNumber: body.noteNumber || null,
      date: new Date(body.date),
      total: body.total,
      currency: body.currency || "ARS",
      status: body.status || "pendiente",
      imageUrl: body.imageUrl || null,
      ocrRawData: body.ocrRawData ? JSON.stringify(body.ocrRawData) : null,
      notes: body.notes || null,
      items: body.items
        ? {
            create: body.items.map((item: any) => ({
              productId: item.productId || null,
              productRaw: item.productRaw || null,
              quantity: item.quantity || null,
              unitPrice: item.unitPrice || null,
              subtotal: item.subtotal || null,
            })),
          }
        : undefined,
    },
    include: {
      store: true,
      supplier: true,
      items: true,
    },
  });

  return NextResponse.json(remito, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const body = await request.json();

  // Actualizar items si vienen
  if (body.items) {
    await prisma.deliveryNoteItem.deleteMany({ where: { deliveryNoteId: body.id } });
    for (const item of body.items) {
      await prisma.deliveryNoteItem.create({
        data: {
          deliveryNoteId: body.id,
          productId: item.productId || null,
          productRaw: item.productRaw || null,
          quantity: item.quantity || null,
          unitPrice: item.unitPrice || null,
          subtotal: item.subtotal || null,
        },
      });
    }
  }

  const remito = await prisma.deliveryNote.update({
    where: { id: body.id },
    data: {
      storeId: body.storeId,
      supplierId: body.supplierId,
      supplierRaw: body.supplierRaw,
      noteNumber: body.noteNumber,
      date: body.date ? new Date(body.date) : undefined,
      total: body.total,
      currency: body.currency,
      status: body.status,
      notes: body.notes,
    },
    include: {
      store: true,
      supplier: true,
      items: { include: { product: true } },
    },
  });

  return NextResponse.json(remito);
}

export async function DELETE(request: NextRequest) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

  await prisma.deliveryNote.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
