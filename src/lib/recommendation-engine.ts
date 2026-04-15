import { prisma } from "./db";
import { roundUp } from "./utils";

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────────────────────

/** Días JS: 0=Dom, 1=Lun, 2=Mar, 3=Mié, 4=Jue, 5=Vie, 6=Sáb */
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface DeliveryConfig {
  /** Días de cobertura total (informativo) */
  coverageDays: number;
  /** Etiqueta legible, ej: "Miércoles → Viernes" */
  label: string;
  /**
   * Los días de la semana exactos que este pedido tiene que cubrir.
   * Array de números JS (0=Dom…6=Sáb).
   * ej: pedido lunes cubre [3,4] (Mié+Jue)
   *     pedido miércoles cubre [5,6,0] (Vie+Sáb+Dom)
   *     pedido jueves cubre [1,2] (Lun+Mar)
   */
  coverageDayNumbers: DayOfWeek[];
}

export interface RecommendationInput {
  storeId: string;
  orderDate: Date;
  /** Día de semana JS del pedido (1=Lun, 3=Mié, 4=Jue…) */
  orderDayOfWeek: DayOfWeek;
  coverageDays: number;
  coverageDayNumbers: DayOfWeek[];
}

export interface ProductRecommendation {
  productId: string;
  productName: string;
  unit: string;
  stockActual: number;
  /** Promedio diario general (para mostrar en UI) */
  avgDailyUsage: number;
  weekdayAvgUsage: number | null;
  weekendAvgUsage: number | null;
  coverageDays: number;
  coverageDayNumbers: DayOfWeek[];
  /** Desglose de uso esperado por día */
  dailyBreakdown: { day: DayOfWeek; dayName: string; usage: number; isWeekend: boolean }[];
  /** Suma total de uso esperado durante el período */
  totalExpectedUsage: number;
  safetyStock: number;
  stockTarget: number;
  suggestedQty: number;
  roundingUnit: number;
  calculationDetail: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const DAY_NAMES: Record<number, string> = {
  0: "Domingo",
  1: "Lunes",
  2: "Martes",
  3: "Miércoles",
  4: "Jueves",
  5: "Viernes",
  6: "Sábado",
};

/** Viernes, Sábado, Domingo tienen consumo de fin de semana */
const WEEKEND_DAYS = new Set<number>([5, 6, 0]);

function isWeekendDay(dow: number): boolean {
  return WEEKEND_DAYS.has(dow);
}

/**
 * Retorna el consumo esperado para un día de semana específico,
 * usando la tasa correspondiente (fin de semana vs semana).
 * Fallback: avgDailyUsage si no hay tasa específica.
 */
function getUsageForDay(
  dow: number,
  avgDailyUsage: number,
  weekdayAvgUsage: number | null,
  weekendAvgUsage: number | null
): number {
  if (isWeekendDay(dow)) {
    return weekendAvgUsage ?? avgDailyUsage;
  }
  return weekdayAvgUsage ?? avgDailyUsage;
}

// ─────────────────────────────────────────────────────────────────────────────
// MOTOR PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Genera la sugerencia de pedido BLANCALUNA.
 *
 * Algoritmo mejorado:
 *   1. Identifica exactamente qué días se van a cubrir (coverageDayNumbers).
 *   2. Para cada día, usa la tasa de consumo correcta (semana vs fin de semana).
 *   3. Suma el consumo esperado total en lugar de avgDiario × N.
 *   4. stock_objetivo = totalEsperado + safetyStock
 *   5. pedido = max(0, roundUp(stock_objetivo - stock_actual, roundingUnit))
 */
export async function generateRecommendation(
  input: RecommendationInput
): Promise<ProductRecommendation[]> {
  const { storeId, coverageDays, coverageDayNumbers } = input;

  // ── Proveedor BLANCALUNA ──
  const blancaluna = await prisma.supplier.findFirst({
    where: { isBlancaluna: true },
    include: { products: { include: { product: true } } },
  });
  if (!blancaluna) throw new Error("Proveedor BLANCALUNA no encontrado");

  // ── Último snapshot de stock ──
  const latestSnapshot = await prisma.stockSnapshot.findFirst({
    where: { storeId },
    orderBy: { date: "desc" },
    include: { items: true },
  });

  const stockMap = new Map<string, number>();
  if (latestSnapshot) {
    for (const item of latestSnapshot.items) {
      stockMap.set(item.productId, item.quantity);
    }
  }

  // ── Baselines de consumo ──
  const baselines = await prisma.consumptionBaseline.findMany({
    where: { storeId },
  });
  const baselineMap = new Map<
    string,
    { avgDailyUsage: number; weekdayAvgUsage: number | null; weekendAvgUsage: number | null }
  >();
  for (const b of baselines) {
    baselineMap.set(b.productId, {
      avgDailyUsage: b.avgDailyUsage,
      weekdayAvgUsage: (b as any).weekdayAvgUsage ?? null,
      weekendAvgUsage: (b as any).weekendAvgUsage ?? null,
    });
  }

  // ── Generar recomendación por producto ──
  const recommendations: ProductRecommendation[] = [];

  for (const sp of blancaluna.products) {
    const product = sp.product;
    const stockActual = stockMap.get(product.id) ?? 0;
    const baseline = baselineMap.get(product.id);

    const avgDailyUsage    = baseline?.avgDailyUsage    ?? 0;
    const weekdayAvgUsage  = baseline?.weekdayAvgUsage  ?? null;
    const weekendAvgUsage  = baseline?.weekendAvgUsage  ?? null;
    const safetyStock      = product.safetyStock;
    const roundingUnit     = product.roundingUnit;

    // Desglose día a día
    const dailyBreakdown = coverageDayNumbers.map((dow) => ({
      day: dow,
      dayName: DAY_NAMES[dow],
      usage: getUsageForDay(dow, avgDailyUsage, weekdayAvgUsage, weekendAvgUsage),
      isWeekend: isWeekendDay(dow),
    }));

    const totalExpectedUsage = dailyBreakdown.reduce((sum, d) => sum + d.usage, 0);
    const stockTarget  = totalExpectedUsage + safetyStock;
    const rawSuggestion = Math.max(0, stockTarget - stockActual);
    const suggestedQty  = roundUp(rawSuggestion, roundingUnit);

    const hasWeekendDifferentiation =
      weekdayAvgUsage !== null || weekendAvgUsage !== null;

    const detail = {
      formula: "pedido = max(0, roundUp(stock_objetivo − stock_actual, redondeo))",
      stock_objetivo_formula:
        hasWeekendDifferentiation
          ? `Σ consumo por día [${dailyBreakdown.map((d) => `${d.dayName}: ${d.usage.toFixed(1)}`).join(", ")}] + stock_seg = ${totalExpectedUsage.toFixed(1)} + ${safetyStock} = ${stockTarget.toFixed(1)}`
          : `${avgDailyUsage} × ${coverageDays} días + ${safetyStock} = ${stockTarget.toFixed(1)}`,
      stock_objetivo: stockTarget.toFixed(1),
      stock_actual: stockActual,
      total_uso_esperado: totalExpectedUsage.toFixed(1),
      diferencia: (stockTarget - stockActual).toFixed(1),
      antes_redondeo: rawSuggestion.toFixed(1),
      redondeo: roundingUnit,
      resultado: suggestedQty,
      daily_breakdown: dailyBreakdown,
    };

    recommendations.push({
      productId: product.id,
      productName: product.name,
      unit: product.unit,
      stockActual,
      avgDailyUsage,
      weekdayAvgUsage,
      weekendAvgUsage,
      coverageDays,
      coverageDayNumbers,
      dailyBreakdown,
      totalExpectedUsage,
      safetyStock,
      stockTarget,
      suggestedQty,
      roundingUnit,
      calculationDetail: JSON.stringify(detail),
    });
  }

  return recommendations.sort((a, b) => a.productName.localeCompare(b.productName));
}

// ─────────────────────────────────────────────────────────────────────────────
// SCHEDULE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Obtiene el calendario de entregas BLANCALUNA desde la DB.
 *
 * Estructura correcta según operación real:
 *   Lunes  → pedido llega miércoles  → cubre Mié+Jue  (2 días semana)
 *   Miércoles → pedido llega viernes → cubre Vie+Sáb+Dom (3 días fin de semana)  ← MÁS IMPORTANTE
 *   Jueves → pedido llega lunes      → cubre Lun+Mar  (2 días semana)
 */
export async function getDeliverySchedule(): Promise<Record<number, DeliveryConfig>> {
  const setting = await prisma.appSetting.findUnique({
    where: { key: "blancaluna_delivery_schedule" },
  });

  if (!setting) {
    return DEFAULT_SCHEDULE;
  }

  const parsed = JSON.parse(setting.value);

  // Migración: si el schedule guardado no tiene coverageDayNumbers, usar defaults
  for (const key of Object.keys(parsed)) {
    if (!parsed[key].coverageDayNumbers) {
      const def = DEFAULT_SCHEDULE[parseInt(key) as DayOfWeek];
      if (def) parsed[key].coverageDayNumbers = def.coverageDayNumbers;
    }
  }

  return parsed;
}

/** Schedule por defecto reflejando la operación real */
export const DEFAULT_SCHEDULE: Record<number, DeliveryConfig> = {
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
};
