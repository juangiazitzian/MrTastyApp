import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/stock/trend?storeId=xxx&productId=yyy&limit=10
 * Devuelve la evolución de stock para un producto en los últimos N snapshots.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const storeId = url.searchParams.get("storeId");
  const productId = url.searchParams.get("productId");
  const limit = parseInt(url.searchParams.get("limit") || "12");

  if (!storeId) {
    return NextResponse.json({ error: "storeId requerido" }, { status: 400 });
  }

  const snapshots = await prisma.stockSnapshot.findMany({
    where: { storeId },
    include: {
      items: {
        include: { product: { select: { id: true, name: true, unit: true } } },
      },
    },
    orderBy: { date: "desc" },
    take: limit,
  });

  // Reverse to chronological order
  snapshots.reverse();

  if (productId) {
    // Single product trend
    const trend = snapshots.map((s) => {
      const item = s.items.find((i) => i.productId === productId);
      const d = new Date(s.date);
      return {
        date: s.date,
        label: `${d.getDate()}/${d.getMonth() + 1}`,
        value: item?.quantity ?? 0,
        productName: item?.product?.name ?? "",
      };
    });
    return NextResponse.json({ trend });
  }

  // Multi-product: devuelve todos los productos con sus series
  const productMap = new Map<string, { name: string; unit: string; values: number[] }>();
  for (const snap of snapshots) {
    for (const item of snap.items) {
      if (!productMap.has(item.productId)) {
        productMap.set(item.productId, {
          name: item.product.name,
          unit: item.product.unit,
          values: [],
        });
      }
    }
  }

  // Fill values in snapshot order
  for (const snap of snapshots) {
    const itemByProduct = new Map(snap.items.map((i) => [i.productId, i.quantity]));
    for (const [pid, data] of productMap) {
      data.values.push(itemByProduct.get(pid) ?? 0);
    }
  }

  const labels = snapshots.map((s) => {
    const d = new Date(s.date);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  });

  const products = Array.from(productMap.entries()).map(([id, data]) => ({
    id,
    name: data.name,
    unit: data.unit,
    values: data.values,
  }));

  return NextResponse.json({ labels, products });
}
