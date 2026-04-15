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

function padDatePart(value: number): string {
  return value.toString().padStart(2, "0");
}

function dateParts(date: Date | string): { day: number; month: number; year: number } {
  if (typeof date === "string") {
    const match = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      return {
        year: Number(match[1]),
        month: Number(match[2]),
        day: Number(match[3]),
      };
    }
  }

  const d = typeof date === "string" ? new Date(date) : date;
  return {
    day: d.getDate(),
    month: d.getMonth() + 1,
    year: d.getFullYear(),
  };
}

export function formatDate(date: Date | string): string {
  const parts = dateParts(date);
  return `${padDatePart(parts.day)}/${padDatePart(parts.month)}/${parts.year}`;
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

export function getTodayInputDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${padDatePart(now.getMonth() + 1)}-${padDatePart(now.getDate())}`;
}

export function parseInputDate(date: string | Date): Date {
  if (date instanceof Date) return date;
  const match = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12);
  }
  return new Date(date);
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
