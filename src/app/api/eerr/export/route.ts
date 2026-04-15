import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const month = parseInt(url.searchParams.get("month") || "0");
  const year = parseInt(url.searchParams.get("year") || "0");
  const storeId = url.searchParams.get("storeId");
  const format = url.searchParams.get("format") || "csv";

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

  const remitos = await prisma.deliveryNote.findMany({
    where,
    include: {
      supplier: {
        select: { name: true, eerrLabel: true, eerrMappings: true },
      },
      store: { select: { name: true } },
    },
    orderBy: { date: "asc" },
  });

  // Agrupar por categoría EERR
  const eerrData: Record<string, number> = {};
  for (const r of remitos) {
    const mapping = r.supplier?.eerrMappings?.[0];
    const category = mapping?.eerrCategory || r.supplier?.eerrLabel || r.supplier?.name || "Sin categoría";
    eerrData[category] = (eerrData[category] || 0) + r.total;
  }

  const months = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
  ];
  const monthLabel = months[month - 1];

  if (format === "csv") {
    let csv = `Categoria EERR,Total ${monthLabel} ${year}\n`;
    csv += `MERCADERIA,,\n`;
    let total = 0;
    for (const [cat, amount] of Object.entries(eerrData).sort(([a], [b]) => a.localeCompare(b))) {
      csv += `${cat},${amount.toFixed(2)}\n`;
      total += amount;
    }
    csv += `\nTOTAL MERCADERIA,${total.toFixed(2)}\n`;

    // Detalle de remitos
    csv += `\n\nDetalle de Remitos\n`;
    csv += `Fecha,Proveedor,Local,Nro Remito,Total,Estado\n`;
    for (const r of remitos) {
      const date = new Date(r.date).toLocaleDateString("es-AR");
      csv += `${date},"${r.supplier?.name || r.supplierRaw || ""}","${r.store.name}","${r.noteNumber || ""}",${r.total.toFixed(2)},${r.status}\n`;
    }

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="EERR_${monthLabel}_${year}.csv"`,
      },
    });
  }

  // JSON para que el frontend pueda generar Excel con exceljs
  return NextResponse.json({
    month,
    year,
    monthLabel,
    eerrData: Object.entries(eerrData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([category, total]) => ({ category, total })),
    detalle: remitos.map((r) => ({
      fecha: new Date(r.date).toLocaleDateString("es-AR"),
      proveedor: r.supplier?.name || r.supplierRaw || "",
      local: r.store.name,
      nroRemito: r.noteNumber || "",
      total: r.total,
      estado: r.status,
    })),
  });
}
