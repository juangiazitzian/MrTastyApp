import { z } from 'zod';
export const locationSchema = z.enum(['balbin', 'peron']);
export const skuSchema = z.enum(['pan', 'papas', 'carne80', 'carne55']);
export const skus = [{ id: 'pan', label: 'Pan de hamburguesa', unit: 'unidades' }, { id: 'papas', label: 'Papas', unit: 'bolsas' }, { id: 'carne80', label: 'Carne de 80 g', unit: 'unidades' }, { id: 'carne55', label: 'Carne de 55 g', unit: 'unidades' }] as const;
export type Sku = typeof skus[number]['id'];
export const categories = ['Mercadería', 'Sueldos', 'Gastos del local', 'Impuestos y comisiones', 'Mantenimiento'] as const;
export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(s => { const d = new Date(s + 'T12:00:00Z'); return !isNaN(+d) && d.toISOString().slice(0, 10) === s; }, 'Fecha inválida');
const amount = z.number().finite().min(0).max(1e12);
export const schemas = {
    invoice: z.object({ location: locationSchema, supplier: z.string().trim().min(1).max(160), cuit: z.string().regex(/^\d{11}$/, 'CUIT: 11 dígitos'), number: z.string().trim().regex(/^\d{4,5}-\d{8}$/, 'Número: 00000-00000000'), documentType: z.enum(['Factura A', 'Factura B', 'Factura C', 'Ticket', 'Nota de crédito A', 'Nota de crédito B', 'Nota de crédito C']), date: isoDate, category: z.enum(categories), amount: amount.positive(), notes: z.string().max(3000).default(''), fileId: z.string().max(100).optional(), status: z.enum(['draft', 'reviewed']).default('draft') }),
    candidate: z.object({ name: z.string().trim().min(1).max(180), email: z.string().email().max(200).or(z.literal('')), phone: z.string().max(40), location: z.enum(['balbin', 'peron', 'both']), role: z.string().max(80), availability: z.string().max(120), experience: z.string().max(3000), notes: z.string().max(3000), stage: z.enum(['Nuevo', 'A revisar', 'Entrevista', 'Seleccionado', 'Archivado']), fileId: z.string().max(100).optional(), gmailId: z.string().max(100).optional() }),
    stock: z.object({ location: locationSchema, sku: skuSchema, quantity: amount, countedAt: z.string().datetime().refine(s => Date.parse(s) <= Date.now() + 300000, 'El conteo no puede ser futuro'), notes: z.string().max(500).default('') }),
    supply: z.object({ location: locationSchema, sku: skuSchema, supplier: z.string().trim().min(1).max(160), pack: z.number().int().min(1).max(10000), leadDays: z.number().int().min(0).max(14), cycleDays: z.number().int().min(1).max(14), safetyPct: z.number().min(0).max(100), incoming: amount, confirmed: z.literal(true) }),
    order: z.object({ location: locationSchema, lines: z.array(z.object({ sku: skuSchema, supplier: z.string().min(1), quantity: amount.positive(), unit: z.string(), pack: z.number().positive() })).min(1).max(20), status: z.literal('draft'), createdFor: isoDate }),
    sale: z.object({ location: locationSchema, date: isoDate, periodMode: z.enum(['monthly', 'daily']).default('monthly'), channel: z.enum(['Cta Cte / Efectivo', 'Pedidos YA Tarjeta', 'Pedidos YA Efectivo', 'Mercado Pago']), amount: amount, fileId: z.string().max(100).optional(), notes: z.string().max(1000).default('') }),
    expense: z.object({ location: locationSchema, date: isoDate, category: z.enum(categories), description: z.string().trim().min(1).max(180), amount: amount.positive(), notes: z.string().max(1000).default('') }),
} as const;
export type Kind = keyof typeof schemas;
export type StoredRecord = {
    id: string;
    kind: string;
    payload: Record<string, unknown>;
    version: number;
    createdAt: string;
    updatedAt: string;
};
export type Count = {
    id: string;
    location: string;
    date: string;
    pan: number | null;
    papas: number | null;
    carne80: number | null;
    carne55: number | null;
    flags: string[];
    sourceRow: number;
    valid: boolean;
};
export function todayAR(now = new Date()) { return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now); }
export function forecast(counts: Count[], location: string, sku: Sku, days: number, start = todayAR()) {
    const startMs = Date.parse(start + 'T12:00:00Z');
    const lower = startMs - 56 * 864e5;
    const rows = counts.filter(r => r.location === location && r.valid && typeof r[sku] === 'number' && r[sku]! >= 0 && Date.parse(r.date + 'T12:00:00Z') >= lower && Date.parse(r.date + 'T12:00:00Z') < startMs);
    const byDate = new Map<string, Count[]>();
    for (const r of rows)
        byDate.set(r.date, [...(byDate.get(r.date) || []), r]);
    const unique = rows.filter(r => byDate.get(r.date)?.length === 1);
    const weekday = Array.from({ length: 7 }, (_, dow) => { const sample = unique.filter(r => new Date(r.date + 'T12:00:00Z').getUTCDay() === dow); return { dow, n: sample.length, mean: sample.length ? sample.reduce((a, r) => a + r[sku]!, 0) / sample.length : null }; });
    const forecastDays = Array.from({ length: days }, (_, i) => { const d = new Date(startMs + i * 864e5); return { date: d.toISOString().slice(0, 10), ...weekday[d.getUTCDay()] }; });
    const coverage = unique.length / 56;
    const last = unique.map(r => r.date).sort().at(-1) ?? null;
    const fresh = last !== null && (startMs - Date.parse(last + 'T12:00:00Z')) <= 4 * 864e5;
    const reliable = coverage >= 0.7 && fresh && forecastDays.every(d => d.n >= 2 && d.mean !== null);
    const demand = reliable ? forecastDays.reduce((a, d) => a + (d.mean || 0), 0) : null;
    return { mean: unique.length ? unique.reduce((a, r) => a + r[sku]!, 0) / unique.length : null, days: forecastDays, weekday, observations: unique.length, coverage, last, demand, reliable };
}
export function suggestOrder(demand: number | null, stock: number | null, incoming: number, pack: number, safetyPct: number) { if (demand === null || stock === null)
    return null; return Math.ceil(Math.max(0, demand * (1 + safetyPct / 100) - stock - incoming) / pack) * pack; }
export function invoiceDedupe(p: Record<string, unknown>) { return `${p.cuit}:${p.documentType}:${String(p.number).replace(/\D/g, '').padStart(13, '0')}`; }
export function signedAmount(p: Record<string, unknown>) { return Number(p.amount) * (String(p.documentType).startsWith('Nota de crédito') ? -1 : 1); }
export function safeCsv(rows: unknown[][]) { return '\uFEFF' + rows.map(row => row.map(v => { const s = String(v ?? ''); return '"' + (typeof v !== 'number' && /^[=+\-@\t\r]/.test(s) ? "'" + s : s).replaceAll('"', '""') + '"'; }).join(';')).join('\r\n'); }
