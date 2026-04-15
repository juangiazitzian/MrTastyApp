import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { EERR_TEMPLATE, findTemplateItem } from "@/lib/eerr-template";

type EerrRow = {
  category: string;
  section: string;
  total: number;
  count: number;
  suppliers: string[];
  source: "manual" | "remitos" | "mixto";
};

function rowKey(section: string, category: string) {
  return `${section}:::${category}`;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const month = parseInt(url.searchParams.get("month") || "0");
  const year = parseInt(url.searchParams.get("year") || "0");
  const storeId = url.searchParams.get("storeId") || "all";
  const action = url.searchParams.get("action");

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
  const where: any = { date: { gte: startDate, lte: endDate } };

  if (storeId !== "all") {
    where.storeId = storeId;
  }

  const rows = new Map<string, EerrRow>();

  for (const section of EERR_TEMPLATE) {
    for (const item of section.items) {
      rows.set(rowKey(section.name, item.category), {
        category: item.category,
        section: section.name,
        total: 0,
        count: 0,
        suppliers: [],
        source: item.source,
      });
    }
  }

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

  for (const remito of remitos) {
    const mapping = remito.supplier?.eerrMappings?.[0];
    const section = mapping?.eerrSection || "MERCADERIA";
    const category = mapping?.eerrCategory || remito.supplier?.eerrLabel || remito.supplier?.name || "Sin categoria";
    const key = rowKey(section, category);
    const existing = rows.get(key);
    const row: EerrRow = existing || {
      category,
      section,
      total: 0,
      count: 0,
      suppliers: [],
      source: "remitos",
    };

    row.total += remito.total;
    row.count += 1;
    const supplierName = remito.supplier?.name || remito.supplierRaw || "Desconocido";
    if (!row.suppliers.includes(supplierName)) {
      row.suppliers.push(supplierName);
    }
    rows.set(key, row);
  }

  const manualEntries = await (prisma as any).eerrEntry.findMany({
    where: { year, month, storeId },
  });

  for (const entry of manualEntries) {
    const key = rowKey(entry.section, entry.category);
    const existing = rows.get(key);
    const templateItem = findTemplateItem(entry.section, entry.category);
    const row: EerrRow = existing || {
      category: entry.category,
      section: entry.section,
      total: 0,
      count: 0,
      suppliers: [],
      source: templateItem?.source || "manual",
    };

    row.total += entry.amount;
    if (row.source === "remitos" && entry.amount !== 0) row.source = "mixto";
    rows.set(key, row);
  }

  const sections = EERR_TEMPLATE.map((section) => {
    const sectionRows = Array.from(rows.values())
      .filter((row) => row.section === section.name)
      .sort((a, b) => {
        const aIndex = section.items.findIndex((item) => item.category === a.category);
        const bIndex = section.items.findIndex((item) => item.category === b.category);
        if (aIndex === -1 && bIndex === -1) return a.category.localeCompare(b.category);
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
      });

    const total = sectionRows.reduce((sum, row) => sum + row.total, 0);
    return { name: section.name, kind: section.kind, total, items: sectionRows };
  });

  const salesTotal = sections.find((section) => section.name === "VENTAS")?.total || 0;
  const expenseTotal = sections
    .filter((section) => section.kind === "expense")
    .reduce((sum, section) => sum + section.total, 0);
  const profit = salesTotal - expenseTotal;
  const profitPercentage = salesTotal > 0 ? profit / salesTotal : 0;
  const mercaderiaTotal = sections.find((section) => section.name === "MERCADERIA")?.total || 0;

  return NextResponse.json({
    month,
    year,
    storeId,
    sections,
    items: sections.find((section) => section.name === "MERCADERIA")?.items || [],
    grandTotal: mercaderiaTotal,
    salesTotal,
    expenseTotal,
    profit,
    profitPercentage,
  });
}

export async function PUT(request: NextRequest) {
  const body = await request.json();

  if (body.action === "entries" || Array.isArray(body.entries)) {
    const entries = Array.isArray(body.entries) ? body.entries : [body];
    const saved = [];

    for (const entry of entries) {
      saved.push(
        await (prisma as any).eerrEntry.upsert({
          where: {
            year_month_storeId_section_category: {
              year: entry.year,
              month: entry.month,
              storeId: entry.storeId || "all",
              section: entry.section,
              category: entry.category,
            },
          },
          update: {
            amount: Number(entry.amount) || 0,
            notes: entry.notes || null,
          },
          create: {
            year: entry.year,
            month: entry.month,
            storeId: entry.storeId || "all",
            section: entry.section,
            category: entry.category,
            amount: Number(entry.amount) || 0,
            notes: entry.notes || null,
          },
        })
      );
    }

    return NextResponse.json({ saved });
  }

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
