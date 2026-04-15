import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Sembrando base de datos...");

  // ── Locales ──
  const balbin = await prisma.store.upsert({
    where: { id: "store-balbin" },
    update: {},
    create: {
      id: "store-balbin",
      name: "San Miguel Balbín",
      address: "Balbín, San Miguel",
    },
  });

  const peron = await prisma.store.upsert({
    where: { id: "store-peron" },
    update: {},
    create: {
      id: "store-peron",
      name: "San Miguel Perón",
      address: "Perón, San Miguel",
    },
  });

  console.log(`  Locales: ${balbin.name}, ${peron.name}`);

  // ── Proveedores ──
  const suppliers = [
    { id: "sup-blancaluna", name: "BLANCALUNA", eerrLabel: "Blanca Luna", isBlancaluna: true, category: "MERCADERIA", aliases: ["Blanca Luna", "blancaluna", "BLANCA LUNA", "BlancaLuna"] },
    { id: "sup-verduleria", name: "Verdulería", eerrLabel: "Verduleria", category: "MERCADERIA", aliases: ["VERDULERIA", "verduleria"] },
    { id: "sup-huevos", name: "Huevos", eerrLabel: "Huevos", category: "MERCADERIA", aliases: ["HUEVOS", "huevos", "Huevería"] },
    { id: "sup-aceite", name: "Aceite", eerrLabel: "Aceite", category: "MERCADERIA", aliases: ["ACEITE", "aceite"] },
    { id: "sup-cdp", name: "CDP", eerrLabel: "CDP", category: "MERCADERIA", aliases: ["cdp", "C.D.P."] },
    { id: "sup-breadbox", name: "The Bread Box", eerrLabel: "The Bread Box / Arte en Harina", category: "MERCADERIA", aliases: ["BREAD BOX", "bread box", "Arte en Harina", "ARTE EN HARINA"] },
    { id: "sup-cocacola", name: "Coca Cola", eerrLabel: "Coca Cola", category: "MERCADERIA", aliases: ["COCA COLA", "coca cola", "Coca-Cola", "COCACOLA"] },
    { id: "sup-envases", name: "TODO ENVASES", eerrLabel: "TODO ENVASES", category: "MERCADERIA", aliases: ["Todo Envases", "todo envases", "TODOENVASES"] },
    { id: "sup-papeleria", name: "Papelería", eerrLabel: "Papelería", category: "MERCADERIA", aliases: ["PAPELERIA", "papeleria"] },
  ];

  for (const s of suppliers) {
    const { aliases, ...data } = s;
    await prisma.supplier.upsert({
      where: { id: s.id },
      update: {},
      create: data,
    });
    for (const alias of aliases) {
      await prisma.supplierAlias.upsert({
        where: { alias },
        update: {},
        create: { alias, supplierId: s.id },
      });
    }
  }
  console.log(`  Proveedores: ${suppliers.length}`);

  // ── Productos BLANCALUNA ──
  const products = [
    { id: "prod-papas", name: "Papas", unit: "bolsa", packSize: 1, safetyStock: 10, roundingUnit: 1, aliases: ["papas", "PAPAS", "Papa"] },
    { id: "prod-cheddar", name: "Cheddar", unit: "unidad", packSize: 1, safetyStock: 5, roundingUnit: 1, aliases: ["cheddar", "CHEDDAR"] },
    { id: "prod-nuggets", name: "Nuggets", unit: "caja", packSize: 1, safetyStock: 2, roundingUnit: 1, aliases: ["nuggets", "NUGGETS", "Nugget"] },
    { id: "prod-medallonpollo", name: "Medallón de pollo", unit: "caja", packSize: 1, safetyStock: 2, roundingUnit: 1, aliases: ["M. Pollo", "m. pollo", "medallon pollo", "MEDALLON POLLO", "Med. Pollo"] },
    { id: "prod-sal", name: "Sal", unit: "bolsa", packSize: 1, safetyStock: 1, roundingUnit: 1, aliases: ["sal", "SAL"] },
    { id: "prod-leche", name: "Leche", unit: "unidad", packSize: 1, safetyStock: 2, roundingUnit: 1, aliases: ["leche", "LECHE"] },
    { id: "prod-ketchup", name: "Ketchup", unit: "bolsa", packSize: 1, safetyStock: 2, roundingUnit: 1, aliases: ["ketchup", "KETCHUP", "Kétchup"] },
    { id: "prod-mayo", name: "Mayonesa", unit: "bolsa", packSize: 1, safetyStock: 2, roundingUnit: 1, aliases: ["Mayo", "mayo", "MAYO", "Mayonesa", "MAYONESA"] },
    { id: "prod-mostaza", name: "Mostaza", unit: "unidad", packSize: 1, safetyStock: 2, roundingUnit: 1, aliases: ["mostaza", "MOSTAZA"] },
    { id: "prod-cheddarliq", name: "Cheddar líquido", unit: "unidad", packSize: 1, safetyStock: 2, roundingUnit: 1, aliases: ["Cheddarliq", "cheddarliq", "CHEDDARLIQ", "Cheddar Liq", "cheddar liquido"] },
  ];

  for (const p of products) {
    const { aliases, ...data } = p;
    await prisma.product.upsert({
      where: { id: p.id },
      update: {},
      create: data,
    });
    for (const alias of aliases) {
      await prisma.productAlias.upsert({
        where: { alias },
        update: {},
        create: { alias, productId: p.id },
      });
    }
    // Vincular producto a BLANCALUNA
    await prisma.supplierProduct.upsert({
      where: {
        supplierId_productId: {
          supplierId: "sup-blancaluna",
          productId: p.id,
        },
      },
      update: {},
      create: {
        supplierId: "sup-blancaluna",
        productId: p.id,
      },
    });
  }
  console.log(`  Productos BLANCALUNA: ${products.length}`);

  // ── Consumo base manual ──
  // weekdayAvgUsage: consumo promedio Lun-Jue
  // weekendAvgUsage: consumo promedio Vie-Dom (generalmente más alto)
  // avgDailyUsage:   promedio general (fallback si los anteriores son null)
  const baselineUsage: Record<string, { avg: number; weekday: number; weekend: number }> = {
    "prod-papas":         { avg: 18,  weekday: 14,  weekend: 24  },
    "prod-cheddar":       { avg: 5,   weekday: 4,   weekend: 7   },
    "prod-nuggets":       { avg: 2.5, weekday: 2,   weekend: 3.5 },
    "prod-medallonpollo": { avg: 2.5, weekday: 2,   weekend: 3.5 },
    "prod-sal":           { avg: 0.2, weekday: 0.2, weekend: 0.2 },
    "prod-leche":         { avg: 1.5, weekday: 1.2, weekend: 2   },
    "prod-ketchup":       { avg: 2,   weekday: 1.5, weekend: 2.3 },
    "prod-mayo":          { avg: 2,   weekday: 1.5, weekend: 2.3 },
    "prod-mostaza":       { avg: 1.2, weekday: 1,   weekend: 1.5 },
    "prod-cheddarliq":    { avg: 1.8, weekday: 1.4, weekend: 2.5 },
  };

  for (const [productId, usage] of Object.entries(baselineUsage)) {
    for (const store of [balbin, peron]) {
      await (prisma.consumptionBaseline as any).upsert({
        where: { storeId_productId: { storeId: store.id, productId } },
        update: {
          avgDailyUsage: usage.avg,
          weekdayAvgUsage: usage.weekday,
          weekendAvgUsage: usage.weekend,
        },
        create: {
          storeId: store.id,
          productId,
          avgDailyUsage: usage.avg,
          weekdayAvgUsage: usage.weekday,
          weekendAvgUsage: usage.weekend,
          source: "manual",
          notes: "Baseline inicial estimado — ajustar con datos reales",
        },
      });
    }
  }
  console.log(`  Consumos baseline cargados (con diferenciación semana/fin de semana)`);

  // ── EERR Mappings ──
  for (const s of suppliers) {
    if (s.eerrLabel) {
      await prisma.eerrMapping.upsert({
        where: { supplierId: s.id },
        update: { eerrCategory: s.eerrLabel },
        create: {
          supplierId: s.id,
          eerrCategory: s.eerrLabel,
          eerrSection: "MERCADERIA",
        },
      });
    }
  }
  console.log(`  Mapeos EERR cargados`);

  // ── Settings por defecto ──
  const settings = [
    {
      key: "blancaluna_delivery_schedule",
      // Días JS: 0=Dom, 1=Lun, 2=Mar, 3=Mié, 4=Jue, 5=Vie, 6=Sáb
      // coverageDayNumbers: días exactos que cubre ese pedido
      value: JSON.stringify({
        1: {
          coverageDays: 2,
          label: "Lunes → llega miércoles (cubre Mié+Jue)",
          coverageDayNumbers: [3, 4],
        },
        3: {
          coverageDays: 3,
          label: "Miércoles → llega viernes (cubre Vie+Sáb+Dom)",
          coverageDayNumbers: [5, 6, 0],
        },
        4: {
          coverageDays: 2,
          label: "Jueves → llega lunes (cubre Lun+Mar)",
          coverageDayNumbers: [1, 2],
        },
      }),
      label: "Calendario de entregas BLANCALUNA",
    },
    {
      key: "default_currency",
      value: '"ARS"',
      label: "Moneda por defecto",
    },
    {
      key: "eerr_sections",
      value: JSON.stringify([
        "VENTAS",
        "MERCADERIA",
        "SUELDOS",
        "GASTOS DE LOCAL",
        "IMPUESTOS, GASTOS BANCARIOS Y COMISIONES",
        "GASTOS DE MANTENIMIENTO",
        "UTILIDAD",
        "PORCENTAJE",
      ]),
      label: "Secciones del EERR",
    },
  ];

  for (const setting of settings) {
    await prisma.appSetting.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: setting,
    });
  }
  console.log(`  Settings cargadas`);

  console.log("\nSeed completado exitosamente!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
