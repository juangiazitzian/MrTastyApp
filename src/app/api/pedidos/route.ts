import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateRecommendation, getDeliverySchedule, type DayOfWeek } from "@/lib/recommendation-engine";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const storeId = url.searchParams.get("storeId");
  const action = url.searchParams.get("action");

  // Obtener schedule de entregas
  if (action === "schedule") {
    const schedule = await getDeliverySchedule();
    return NextResponse.json(schedule);
  }

  // Generar recomendación
  if (action === "recommend" && storeId) {
    const dayOfWeek = parseInt(url.searchParams.get("dayOfWeek") || "0");
    const schedule = await getDeliverySchedule();
    const config = schedule[dayOfWeek];

    if (!config) {
      return NextResponse.json(
        { error: `No hay configuración de entrega para el día ${dayOfWeek}` },
        { status: 400 }
      );
    }

    const recommendations = await generateRecommendation({
      storeId,
      orderDate: new Date(),
      orderDayOfWeek: dayOfWeek as DayOfWeek,
      coverageDays: config.coverageDays,
      coverageDayNumbers: config.coverageDayNumbers ?? [],
    });

    return NextResponse.json({
      coverageDays: config.coverageDays,
      coverageLabel: config.label,
      coverageDayNumbers: config.coverageDayNumbers ?? [],
      dayOfWeek,
      items: recommendations,
    });
  }

  // Historial de pedidos
  const where: any = {};
  if (storeId && storeId !== "all") where.storeId = storeId;

  const orders = await prisma.purchaseRecommendation.findMany({
    where,
    include: {
      store: { select: { id: true, name: true } },
      items: {
        include: { product: { select: { id: true, name: true, unit: true } } },
        orderBy: { product: { name: "asc" } },
      },
    },
    orderBy: { orderDate: "desc" },
    take: 50,
  });

  return NextResponse.json(orders);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const order = await prisma.purchaseRecommendation.create({
    data: {
      storeId: body.storeId,
      orderDate: new Date(body.orderDate || Date.now()),
      deliveryDate: new Date(body.deliveryDate),
      coverageDays: body.coverageDays,
      status: body.status || "borrador",
      notes: body.notes || null,
      items: {
        create: body.items.map((item: any) => ({
          productId: item.productId,
          stockActual: item.stockActual,
          avgDailyUsage: item.avgDailyUsage,
          coverageDays: item.coverageDays,
          safetyStock: item.safetyStock,
          stockTarget: item.stockTarget,
          suggestedQty: item.suggestedQty,
          finalQty: item.finalQty,
          roundingUnit: item.roundingUnit || 1,
          calculationDetail: item.calculationDetail || null,
        })),
      },
    },
    include: {
      store: true,
      items: { include: { product: true } },
    },
  });

  return NextResponse.json(order, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const body = await request.json();

  const order = await prisma.purchaseRecommendation.update({
    where: { id: body.id },
    data: {
      status: body.status,
      notes: body.notes,
    },
  });

  // Actualizar items si vienen (para ediciones manuales)
  if (body.items) {
    for (const item of body.items) {
      if (item.id) {
        await prisma.purchaseRecommendationItem.update({
          where: { id: item.id },
          data: { finalQty: item.finalQty },
        });
      }
    }
  }

  return NextResponse.json(order);
}
