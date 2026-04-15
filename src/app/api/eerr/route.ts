import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const month = parseInt(url.searchParams.get("month") || "0");
  const year = parseInt(url.searchParams.get("year") || "0");
  const storeId = url.searchParams.get("storeId");
  const action = url.searchParams.get("action");

  // Obtener mappings
  if (action === "mappings") {
    const mappings = await prisma.eerrMapping.findMany({
      include: { supplier: { select: { id: true, name: true, eerrLabel: true } } },
    });
    return NextResponse.json(mappings);
  }

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

  // Remitos con mapping EERR
  const remitos = await prisma.deliveryNote.findMany({
    where,
    include: {
      supplier: {
        select: {
          id: true,
          name: true,
          eerrLabel: true,
          eerrMappings: true,
        },
      },
      store: { select: { id: true, name: true } },
    },
  });

  // Agrupar por categoría EERR
  const eerrData: Record<string, {
    category: string;
    section: string;
    total: number;
    count: number;
    suppliers: string[];
  }> = {};

  for (const r of remitos) {
    const mapping = r.supplier?.eerrMappings?.[0];
    const category = mapping?.eerrCategory || r.supplier?.eerrLabel || r.supplier?.name || "Sin categoría";
    const section = mapping?.eerrSection || "MERCADERIA";

    if (!eerrData[category]) {
      eerrData[category] = {
        category,
        section,
        total: 0,
        count: 0,
        suppliers: [],
      };
    }

    eerrData[category].total += r.total;
    eerrData[category].count += 1;
    const supplierName = r.supplier?.name || "Desconocido";
    if (!eerrData[category].suppliers.includes(supplierName)) {
      eerrData[category].suppliers.push(supplierName);
    }
  }

  const items = Object.values(eerrData).sort((a, b) => a.category.localeCompare(b.category));
  const grandTotal = items.reduce((sum, i) => sum + i.total, 0);

  return NextResponse.json({
    month,
    year,
    section: "MERCADERIA",
    grandTotal,
    items,
  });
}

// Actualizar mapping EERR
export async function PUT(request: NextRequest) {
  const body = await request.json();

  const mapping = await prisma.eerrMapping.upsert({
    where: { supplierId: body.supplierId },
    update: {
      eerrCategory: body.eerrCategory,
      eerrSection: body.eerrSection || "MERCADERIA",
    },
    create: {
      supplierId: body.supplierId,
      eerrCategory: body.eerrCategory,
      eerrSection: body.eerrSection || "MERCADERIA",
    },
  });

  return NextResponse.json(mapping);
}
