import { prisma } from "./db";
import { roundUp } from "./utils";

export interface RecommendationInput {
  storeId: string;
  orderDate: Date;
  coverageDays: number;
}

export interface ProductRecommendation {
  productId: string;
  productName: string;
  unit: string;
  stockActual: number;
  avgDailyUsage: number;
  coverageDays: number;
  safetyStock: number;
  stockTarget: number;
  suggestedQty: number;
  roundingUnit: number;
  calculationDetail: string;
}

/**
 * Motor de recomendación de pedidos BLANCALUNA.
 *
 * Fórmula:
 *   stock_objetivo = (promedio_diario * días_cobertura) + stock_seguridad
 *   pedido_sugerido = max(0, stock_objetivo - stock_actual)
 *   pedido_final = redondear_arriba(pedido_sugerido, unidad_redondeo)
 */
export async function generateRecommendation(
  input: RecommendationInput
): Promise<ProductRecommendation[]> {
  const { storeId, coverageDays } = input;

  // Obtener el proveedor BLANCALUNA
  const blancaluna = await prisma.supplier.findFirst({
    where: { isBlancaluna: true },
    include: {
      products: {
        include: { product: true },
      },
    },
  });

  if (!blancaluna) {
    throw new Error("Proveedor BLANCALUNA no encontrado");
  }

  // Obtener el último snapshot de stock para este local
  const latestSnapshot = await prisma.stockSnapshot.findFirst({
    where: { storeId },
    orderBy: { date: "desc" },
    include: { items: true },
  });

  // Mapa de stock actual por producto
  const stockMap = new Map<string, number>();
  if (latestSnapshot) {
    for (const item of latestSnapshot.items) {
      stockMap.set(item.productId, item.quantity);
    }
  }

  // Obtener consumos baseline
  const baselines = await prisma.consumptionBaseline.findMany({
    where: { storeId },
  });
  const usageMap = new Map<string, number>();
  for (const b of baselines) {
    usageMap.set(b.productId, b.avgDailyUsage);
  }

  // Generar recomendación por producto
  const recommendations: ProductRecommendation[] = [];

  for (const sp of blancaluna.products) {
    const product = sp.product;
    const stockActual = stockMap.get(product.id) || 0;
    const avgDailyUsage = usageMap.get(product.id) || 0;
    const safetyStock = product.safetyStock;
    const roundingUnit = product.roundingUnit;

    const stockTarget = avgDailyUsage * coverageDays + safetyStock;
    const rawSuggestion = Math.max(0, stockTarget - stockActual);
    const suggestedQty = roundUp(rawSuggestion, roundingUnit);

    const detail = {
      formula: "pedido = max(0, redondear(stock_objetivo - stock_actual))",
      stock_objetivo: `${avgDailyUsage} × ${coverageDays} + ${safetyStock} = ${stockTarget}`,
      stock_actual: stockActual,
      diferencia: stockTarget - stockActual,
      antes_redondeo: rawSuggestion,
      redondeo: roundingUnit,
      resultado: suggestedQty,
    };

    recommendations.push({
      productId: product.id,
      productName: product.name,
      unit: product.unit,
      stockActual,
      avgDailyUsage,
      coverageDays,
      safetyStock,
      stockTarget,
      suggestedQty,
      roundingUnit,
      calculationDetail: JSON.stringify(detail),
    });
  }

  return recommendations.sort((a, b) => a.productName.localeCompare(b.productName));
}

/** Obtiene el schedule de entregas desde la configuración */
export async function getDeliverySchedule(): Promise<
  Record<number, { coverageDays: number; label: string }>
> {
  const setting = await prisma.appSetting.findUnique({
    where: { key: "blancaluna_delivery_schedule" },
  });

  if (!setting) {
    // Default
    return {
      1: { coverageDays: 2, label: "Lunes → Miércoles" },
      3: { coverageDays: 2, label: "Miércoles → Viernes" },
      5: { coverageDays: 3, label: "Viernes → Lunes" },
    };
  }

  return JSON.parse(setting.value);
}
