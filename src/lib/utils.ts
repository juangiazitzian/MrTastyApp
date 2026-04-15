import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = "ARS"): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

export function formatDateShort(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
  }).format(d);
}

export function getMonthLabel(year: number, month: number): string {
  const d = new Date(year, month - 1, 1);
  return new Intl.DateTimeFormat("es-AR", {
    month: "long",
    year: "numeric",
  }).format(d);
}

export function getCurrentYearMonth(): { year: number; month: number } {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

/** Calcula los días de cobertura para un pedido según el día de la semana */
export function getCoverageDays(
  dayOfWeek: number,
  schedule: Record<number, { coverageDays: number; label: string }>
): { coverageDays: number; label: string } | null {
  return schedule[dayOfWeek] || null;
}

/** Redondea hacia arriba al múltiplo de roundingUnit */
export function roundUp(value: number, roundingUnit: number): number {
  if (roundingUnit <= 0) return value;
  return Math.ceil(value / roundingUnit) * roundingUnit;
}

export const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pendiente: { label: "Pendiente", color: "bg-yellow-100 text-yellow-800" },
  validado: { label: "Validado", color: "bg-green-100 text-green-800" },
  rechazado: { label: "Rechazado", color: "bg-red-100 text-red-800" },
  duplicado: { label: "Duplicado", color: "bg-gray-100 text-gray-600" },
  borrador: { label: "Borrador", color: "bg-blue-100 text-blue-800" },
  confirmado: { label: "Confirmado", color: "bg-green-100 text-green-800" },
  enviado: { label: "Enviado", color: "bg-purple-100 text-purple-800" },
};
