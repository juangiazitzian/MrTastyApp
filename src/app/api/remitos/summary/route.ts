import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const month = parseInt(url.searchParams.get("month") || "0");
  const year = parseInt(url.searchParams.get("year") || "0");
  const storeId = url.searchParams.get("storeId");

  if (!month || !year) {
    return NextResponse.json({ error: "Se requiere month y year" }, { status: 400 });
  }

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const where: any = {
    date: { gte: startDate, lte: endDate },
    status: { in: ["validado", "pendiente"] },
  };

  if (storeId && storeId !== "all") {
    where.storeId = storeId;
  }

  // Totales por proveedor
  const remitos = await prisma.deliveryNote.findMany({
    where,
    include: {
      supplier: { select: { id: true, name: true, eerrLabel: true } },
      store: { select: { id: true, name: true } },
    },
  });

  // Agrupar por proveedor
  const bySupplier: Record<string, {
    supplierId: string;
    supplierName: string;
    eerrLabel: string;
    total: number;
    count: number;
    byStore: Record<string, { storeName: string; total: number; count: number }>;
  }> = {};

  let grandTotal = 0;

  for (const r of remitos) {
    const key = r.supplierId || "sin-proveedor";
    const supplierName = r.supplier?.name || r.supplierRaw || "Sin proveedor";
    const eerrLabel = r.supplier?.eerrLabel || supplierName;

    if (!bySupplier[key]) {
      bySupplier[key] = {
        supplierId: key,
        supplierName,
        eerrLabel,
        total: 0,
        count: 0,
        byStore: {},
      };
    }

    bySupplier[key].total += r.total;
    bySupplier[key].count += 1;
    grandTotal += r.total;

    const storeKey = r.storeId;
    if (!bySupplier[key].byStore[storeKey]) {
      bySupplier[key].byStore[storeKey] = {
        storeName: r.store.name,
        total: 0,
        count: 0,
      };
    }
    bySupplier[key].byStore[storeKey].total += r.total;
    bySupplier[key].byStore[storeKey].count += 1;
  }

  // Totales por local
  const byStore: Record<string, { storeName: string; total: number; count: number }> = {};
  for (const r of remitos) {
    if (!byStore[r.storeId]) {
      byStore[r.storeId] = { storeName: r.store.name, total: 0, count: 0 };
    }
    byStore[r.storeId].total += r.total;
    byStore[r.storeId].count += 1;
  }

  return NextResponse.json({
    month,
    year,
    grandTotal,
    totalRemitos: remitos.length,
    bySupplier: Object.values(bySupplier).sort((a, b) => b.total - a.total),
    byStore: Object.values(byStore),
  });
}
