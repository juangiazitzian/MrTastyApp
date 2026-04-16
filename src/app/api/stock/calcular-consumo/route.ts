import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * POST /api/stock/calcular-consumo
 * Calcula el consumo promedio diario por producto y local
 * a partir de snapshots de stock + compras (remitos con ítems).
 *
 * Fórmula: consumo = stock_inicial + compras - stock_final - ajustes
 *          promedio_diario = consumo / días
 *
 * Guarda el resultado en ConsumptionBaseline (source = "calculado").
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { storeId } = body;

    if (!storeId) {
      return NextResponse.json({ error: "storeId requerido" }, { status: 400 });
    }

    // Obtener snapshots ordenados cronológicamente
    const snapshots = await prisma.stockSnapshot.findMany({
      where: { storeId },
      include: {
        items: {
          include: { product: { select: { id: true, name: true, unit: true } } },
        },
      },
      orderBy: { date: "asc" },
    });

    if (snapshots.length < 2) {
      return NextResponse.json(
        { error: "Se necesitan al menos 2 snapshots para calcular consumo" },
        { status: 400 }
      );
    }

    // Para cada producto, calculamos consumo entre snapshots consecutivos
    // y promediamos todos los períodos disponibles
    interface ProductCalc {
      productId: string;
      productName: string;
      periods: { days: number; consumption: number }[];
    }

    const productCalcs = new Map<string, ProductCalc>();

    for (let i = 0; i < snapshots.length - 1; i++) {
      const snapA = snapshots[i];
      const snapB = snapshots[i + 1];

      const dateA = new Date(snapA.date);
      const dateB = new Date(snapB.date);
      const days = Math.max(
        1,
        Math.round((dateB.getTime() - dateA.getTime()) / (1000 * 60 * 60 * 24))
      );

      // Productos que aparecen en ambos snapshots
      const qtyA = new Map(snapA.items.map((it) => [it.productId, it.quantity]));
      const qtyB = new Map(snapB.items.map((it) => [it.productId, it.quantity]));
      const allProducts = new Map([...snapA.items, ...snapB.items].map((it) => [it.productId, it.product]));

      for (const [productId, product] of allProducts) {
        const stockA = qtyA.get(productId) ?? 0;
        const stockB = qtyB.get(productId) ?? 0;

        // Compras entre los dos snapshots (remitos con ítems del producto)
        const deliveries = await prisma.deliveryNoteItem.findMany({
          where: {
            productId,
            deliveryNote: {
              storeId,
              date: { gte: dateA, lt: dateB },
            },
          },
          select: { quantity: true },
        });
        const totalPurchased = deliveries.reduce((s, d) => s + (d.quantity ?? 0), 0);

        // Ajustes entre los dos snapshots
        const adjustments = await prisma.stockAdjustment.findMany({
          where: {
            storeId,
            productId,
            date: { gte: dateA, lt: dateB },
          },
          select: { quantity: true },
        });
        const totalAdjusted = adjustments.reduce((s, a) => s + a.quantity, 0);

        // consumo = stock_inicial + compras - stock_final - ajustes
        const consumption = stockA + totalPurchased - stockB - totalAdjusted;

        if (!productCalcs.has(productId)) {
          productCalcs.set(productId, {
            productId,
            productName: product.name,
            periods: [],
          });
        }

        productCalcs.get(productId)!.periods.push({ days, consumption });
      }
    }

    const firstDate = new Date(snapshots[0].date);
    const lastDate = new Date(snapshots[snapshots.length - 1].date);

    const results: {
      productId: string;
      productName: string;
      avgDailyUsage: number;
      totalDays: number;
      totalConsumption: number;
    }[] = [];

    for (const [productId, calc] of productCalcs) {
      const totalDays = calc.periods.reduce((s, p) => s + p.days, 0);
      const totalConsumption = calc.periods.reduce((s, p) => s + p.consumption, 0);
      const avgDailyUsage = totalDays > 0 ? Math.max(0, totalConsumption / totalDays) : 0;

      // Upsert en ConsumptionBaseline
      await prisma.consumptionBaseline.upsert({
        where: { storeId_productId: { storeId, productId } },
        create: {
          storeId,
          productId,
          avgDailyUsage,
          source: "calculado",
          calculatedFrom: firstDate,
          calculatedTo: lastDate,
          notes: `Calculado de ${snapshots.length} snapshots (${calc.periods.length} períodos)`,
        },
        update: {
          avgDailyUsage,
          source: "calculado",
          calculatedFrom: firstDate,
          calculatedTo: lastDate,
          notes: `Calculado de ${snapshots.length} snapshots (${calc.periods.length} períodos)`,
        },
      });

      results.push({
        productId,
        productName: calc.productName,
        avgDailyUsage: Math.round(avgDailyUsage * 100) / 100,
        totalDays,
        totalConsumption: Math.round(totalConsumption * 100) / 100,
      });
    }

    return NextResponse.json({
      ok: true,
      storeId,
      snapshots: snapshots.length,
      period: {
        from: firstDate.toISOString().slice(0, 10),
        to: lastDate.toISOString().slice(0, 10),
      },
      results,
    });
  } catch (err) {
    console.error("[calcular-consumo]", err);
    return NextResponse.json({ error: "Error calculando consumo" }, { status: 500 });
  }
}

// GET — para ver el estado del cálculo de consumo
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const storeId = url.searchParams.get("storeId");

  const where: Record<string, unknown> = {};
  if (storeId) where.storeId = storeId;

  const baselines = await prisma.consumptionBaseline.findMany({
    where,
    include: {
      store: { select: { name: true } },
      product: { select: { name: true, unit: true } },
    },
    orderBy: [{ storeId: "asc" }, { product: { name: "asc" } }],
  });

  return NextResponse.json(baselines);
}
