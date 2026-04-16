import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/remitos/trend?months=12&storeId=xxx
 * Devuelve totales por mes de los últimos N meses.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const months = parseInt(url.searchParams.get("months") || "12");
  const storeId = url.searchParams.get("storeId");

  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);

  const where: Record<string, unknown> = {
    date: { gte: startDate },
  };
  if (storeId && storeId !== "all") {
    where.storeId = storeId;
  }

  const remitos = await prisma.deliveryNote.findMany({
    where,
    select: { date: true, total: true, supplierId: true, supplier: { select: { name: true } } },
    orderBy: { date: "asc" },
  });

  // Agrupar por mes
  const byMonth: Record<string, number> = {};
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    byMonth[key] = 0;
  }

  for (const r of remitos) {
    const d = new Date(r.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (key in byMonth) byMonth[key] += r.total;
  }

  const monthNames = [
    "Ene", "Feb", "Mar", "Abr", "May", "Jun",
    "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
  ];

  const trend = Object.entries(byMonth).map(([key, value]) => {
    const [y, m] = key.split("-");
    return {
      key,
      label: `${monthNames[parseInt(m) - 1]} ${y.slice(2)}`,
      value: Math.round(value),
    };
  });

  return NextResponse.json({ trend });
}
