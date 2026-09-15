import { z } from 'zod';
export const locationSchema = z.enum(['balbin', 'peron']);
export const skuSchema = z.enum(['pan', 'papas', 'carne80', 'carne55', 'te-estuche', 'te-bolsa', 'te-balde', 'te-servilleta', 'te-pileta', 'te-parafinado']);
export const skus = [{ id: 'pan', label: 'Pan de hamburguesa', unit: 'unidades' }, { id: 'papas', label: 'Papas', unit: 'bolsas' }, { id: 'carne80', label: 'Carne de 80 g', unit: 'unidades' }, { id: 'carne55', label: 'Carne de 55 g', unit: 'unidades' }] as const;
export type Sku = typeof skus[number]['id'];

/**
 * Catálogo por proveedor.
 *
 * Estos insumos no están en la hoja «Conteo»: los cuentan los encargados. Por
 * eso su consumo no se lee de las planillas, se deduce de los propios conteos
 * semanales (ver `consumptionSegments`).
 *
 * Bultos y códigos salen de la planilla de pedido del proveedor. Los productos
 * genéricos de esa planilla quedan afuera a propósito: nunca se pidieron, y
 * listarlos sólo agregaría ruido a la pantalla de pedido.
 *
 * `leadDays` y `cycleDays` describen el ciclo real: el pedido se arma el jueves
 * junto con el conteo y la entrega llega el martes siguiente.
 */
export type SupplierItem = { id: string; label: string; product: string; code: string; pack: number; unit: string };
export type Supplier = {
    id: string;
    label: string;
    /** Días de la semana en que se pide, como los numera `getUTCDay` (0 = domingo). */
    orderDays: number[];
    /** Días hasta la entrega y días entre pedidos. `null` mientras no estén confirmados. */
    leadDays: number | null;
    cycleDays: number | null;
    items: SupplierItem[];
};
export const suppliers: Supplier[] = [{
    id: 'todo-envase',
    label: 'Todo Envase',
    orderDays: [4],
    leadDays: 5,
    cycleDays: 7,
    items: [
        { id: 'te-estuche', label: 'Estuches', product: 'SOBRE DE PAPAS CHICO MR TASTY', code: 'BOP PAC MRT BIO', pack: 1000, unit: 'unidades' },
        { id: 'te-bolsa', label: 'Bolsas grandes', product: 'BOLSA DELIVERY MR TASTY', code: 'BOP FCG MRT F9', pack: 400, unit: 'unidades' },
        { id: 'te-balde', label: 'Baldes', product: 'BALDE HAMBURGUESA MR TASTY', code: 'POL 15O MRT', pack: 200, unit: 'unidades' },
        { id: 'te-servilleta', label: 'Servilletas', product: 'SERVILLETA 33X33 ECOLOGICA MR TASTY 1,9 KG', code: 'SER 333 MRT TEC', pack: 1, unit: 'cajas' },
        { id: 'te-pileta', label: 'Piletas', product: 'ENSALADERA POLIPAPEL MR TASTY', code: 'POL ENS MRT', pack: 200, unit: 'unidades' },
        { id: 'te-parafinado', label: 'Papel parafinado', product: 'PAPEL PARAFINADO 30X40 MR TASTY', code: 'PAP 304 MRT', pack: 1000, unit: 'unidades' },
    ],
}, {
    // Estos dos proveedores todavía no tienen catálogo cargado. Se listan por su
    // calendario, que es lo único confirmado: sirve para avisar cuándo toca
    // pedir. Sin insumos, bulto ni plazo de entrega no se sugiere nada.
    id: 'cdp',
    label: 'CDP',
    orderDays: [1, 3, 5],
    leadDays: null,
    cycleDays: null,
    items: [],
}, {
    id: 'blancaluna',
    label: 'Blancaluna',
    orderDays: [1, 3, 5],
    leadDays: null,
    cycleDays: null,
    items: [],
}];
export const supplierItems = suppliers.flatMap(s => s.items.map(i => ({ ...i, supplier: s.label, supplierId: s.id })));
export type ConfiguredSupplier = Supplier & { leadDays: number; cycleDays: number };

/** Un proveedor sólo calcula pedidos si tiene catálogo, bulto y plazos cargados. */
export function isConfigured(s: Supplier): s is ConfiguredSupplier {
    return s.items.length > 0 && s.leadDays !== null && s.cycleDays !== null;
}

export const weekdayNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

/** «Se pide lunes, miércoles y viernes». */
export function weekdaysLabel(days: number[]) {
    const n = days.map(d => weekdayNames[d]);
    return n.length > 1 ? n.slice(0, -1).join(', ') + ' y ' + n[n.length - 1] : n[0] ?? '';
}

/**
 * Cuándo toca el próximo pedido, listo para mostrar.
 *
 * `tone` describe la urgencia y cada pantalla decide cómo pintarla.
 */
export function nextOrderLabel(orderDays: number[], from = todayAR()) {
    const next = nextOrderDate(orderDays, from);
    if (!next)
        return null;
    if (next.days === 0)
        return { ...next, text: 'Se pide hoy', tone: 'today' as const };
    if (next.days === 1)
        return { ...next, text: 'Se pide mañana', tone: 'tomorrow' as const };
    const d = new Date(next.date + 'T12:00:00Z');
    return { ...next, text: `${weekdayNames[d.getUTCDay()]} ${d.getUTCDate()}/${d.getUTCMonth() + 1}`, tone: 'later' as const };
}

/**
 * Próxima fecha de pedido de un proveedor, contando desde hoy inclusive.
 *
 * `days` en cero significa que hoy es día de pedido. Devuelve null si el
 * proveedor no tiene calendario cargado.
 */
export function nextOrderDate(orderDays: number[], from = todayAR()) {
    if (!orderDays.length)
        return null;
    const base = Date.parse(from + 'T12:00:00Z');
    for (let i = 0; i < 14; i++) {
        const d = new Date(base + i * 864e5);
        if (orderDays.includes(d.getUTCDay()))
            return { date: d.toISOString().slice(0, 10), days: i };
    }
    return null;
}
export const categories = ['Mercadería', 'Sueldos', 'Gastos del local', 'Impuestos y comisiones', 'Mantenimiento'] as const;
export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(s => { const d = new Date(s + 'T12:00:00Z'); return !isNaN(+d) && d.toISOString().slice(0, 10) === s; }, 'Fecha inválida');
const amount = z.number().finite().min(0).max(1e12);
export const schemas = {
    invoice: z.object({ location: locationSchema, supplier: z.string().trim().min(1).max(160), cuit: z.string().regex(/^\d{11}$/, 'CUIT: 11 dígitos'), number: z.string().trim().regex(/^\d{4,5}-\d{8}$/, 'Número: 00000-00000000'), documentType: z.enum(['Factura A', 'Factura B', 'Factura C', 'Ticket', 'Nota de crédito A', 'Nota de crédito B', 'Nota de crédito C']), date: isoDate, category: z.enum(categories), amount: amount.positive(), notes: z.string().max(3000).default(''), fileId: z.string().max(100).optional(), status: z.enum(['draft', 'reviewed']).default('draft') }),
    candidate: z.object({ name: z.string().trim().min(1).max(180), email: z.string().email().max(200).or(z.literal('')), phone: z.string().max(40), location: z.enum(['balbin', 'peron', 'both']), role: z.string().max(80), availability: z.string().max(120), experience: z.string().max(3000), notes: z.string().max(3000), stage: z.enum(['Nuevo', 'A revisar', 'Entrevista', 'Seleccionado', 'Archivado']), fileId: z.string().max(100).optional(), gmailId: z.string().max(100).optional() }),
    stock: z.object({ location: locationSchema, sku: skuSchema, quantity: amount, countedAt: z.string().datetime().refine(s => Date.parse(s) <= Date.now() + 300000, 'El conteo no puede ser futuro'), notes: z.string().max(500).default('') }),
    supply: z.object({ location: locationSchema, sku: skuSchema, supplier: z.string().trim().min(1).max(160), pack: z.number().int().min(1).max(10000), leadDays: z.number().int().min(0).max(14), cycleDays: z.number().int().min(1).max(14), safetyPct: z.number().min(0).max(100), incoming: amount, confirmed: z.literal(true) }),
    // `deliveredAt` cierra el círculo del consumo: sin la fecha en que entró la
    // mercadería no se puede saber cuánto se usó entre dos conteos. Si falta, la
    // pantalla la estima sumando el plazo de entrega del proveedor.
    order: z.object({ location: locationSchema, lines: z.array(z.object({ sku: skuSchema, supplier: z.string().min(1), quantity: amount.positive(), unit: z.string(), pack: z.number().positive() })).min(1).max(20), status: z.enum(['draft', 'received']), createdFor: isoDate, deliveredAt: isoDate.optional() }),
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
export type StockPoint = { at: string; quantity: number };
export type DeliveryPoint = { at: string; quantity: number };
export type ConsumptionSegment = { from: string; to: string; days: number; received: number; used: number; perDay: number; valid: boolean };

/**
 * Consumo entre conteos consecutivos.
 *
 * De un conteo al siguiente: lo que había, más lo que entró, menos lo que
 * quedó. Es la única forma de medir el consumo de estos insumos, que no pasan
 * por la hoja «Conteo».
 *
 * Un tramo con consumo negativo significa que apareció stock sin entrega que
 * lo explique: un conteo mal cargado o una entrega sin registrar. Se marca
 * inválido y se excluye del promedio en vez de recortarlo a cero, que
 * ensuciaría la media y con ella la sugerencia.
 */
export function consumptionSegments(stock: StockPoint[], deliveries: DeliveryPoint[]): ConsumptionSegment[] {
    const points = [...stock].sort((a, b) => a.at.localeCompare(b.at));
    const segments: ConsumptionSegment[] = [];
    for (let i = 1; i < points.length; i++) {
        const from = points[i - 1], to = points[i];
        const days = Math.round((Date.parse(to.at) - Date.parse(from.at)) / 864e5);
        if (days <= 0)
            continue;
        const received = deliveries.filter(d => d.at > from.at && d.at <= to.at).reduce((a, d) => a + d.quantity, 0);
        const used = from.quantity + received - to.quantity;
        segments.push({ from: from.at, to: to.at, days, received, used, perDay: used / days, valid: used >= 0 });
    }
    return segments;
}

/**
 * Uso medio diario sobre los tramos válidos.
 *
 * Pondera por días y no por tramo: dos conteos separados por dos semanas pesan
 * el doble que uno de una semana, que es lo correcto si algún jueves se saltea.
 *
 * `preliminary` avisa que la media todavía se apoya en pocas semanas. No se
 * oculta la sugerencia por eso, pero la pantalla lo dice.
 */
export function averageDailyUse(segments: ConsumptionSegment[]) {
    const valid = segments.filter(s => s.valid);
    const days = valid.reduce((a, s) => a + s.days, 0);
    const used = valid.reduce((a, s) => a + s.used, 0);
    return { perDay: days ? used / days : null, weeks: valid.length, days, discarded: segments.length - valid.length, preliminary: valid.length < 3 };
}

export function suggestOrder(demand: number | null, stock: number | null, incoming: number, pack: number, safetyPct: number) { if (demand === null || stock === null)
    return null; return Math.ceil(Math.max(0, demand * (1 + safetyPct / 100) - stock - incoming) / pack) * pack; }
export function invoiceDedupe(p: Record<string, unknown>) { return `${p.cuit}:${p.documentType}:${String(p.number).replace(/\D/g, '').padStart(13, '0')}`; }
export function signedAmount(p: Record<string, unknown>) { return Number(p.amount) * (String(p.documentType).startsWith('Nota de crédito') ? -1 : 1); }
export function safeCsv(rows: unknown[][]) { return '\uFEFF' + rows.map(row => row.map(v => { const s = String(v ?? ''); return '"' + (typeof v !== 'number' && /^[=+\-@\t\r]/.test(s) ? "'" + s : s).replaceAll('"', '""') + '"'; }).join(';')).join('\r\n'); }
