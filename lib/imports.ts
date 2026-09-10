import type { Count } from './domain';
export function normalizeCounts(values: unknown[][], location: string): Count[] {
    const result: Count[] = [];
    for (let i = 2; i < values.length; i++) {
        const row = values[i];
        const amounts = Array.from({ length: 4 }, (_, j) => typeof row[j + 1] === 'number' && Number.isFinite(row[j + 1]) ? row[j + 1] as number : null);
        if (amounts.every(x => x === null))
            continue;
        let date: string;
        const flags: string[] = [];
        if (typeof row[0] === 'number')
            date = new Date(Date.UTC(1899, 11, 30) + row[0] * 864e5).toISOString().slice(0, 10);
        else if (/^\d{4}-\d{2}-\d{2}/.test(String(row[0])))
            date = String(row[0]).slice(0, 10);
        else {
            const match = String(row[0]).match(/(\d{1,2})\s*\/\s*(\d{1,2})/);
            if (!match)
                continue;
            date = `2026-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
            flags.push('Fecha ingresada como texto');
        }
        const notes = row.slice(4, 6).filter(v => typeof v === 'string' && v.trim() && v !== '-').join(' ');
        if (notes)
            flags.push(notes);
        if (result.length && date < result[result.length - 1].date)
            flags.push('Fecha fuera de secuencia: verificar en Sheets');
        const valid = !flags.some(f => /[?]|SOLO AM|fuera de secuencia/.test(f)) && amounts.every(x => x === null || x >= 0);
        result.push({ id: `${location}-${i + 1}`, location, date, pan: amounts[0], papas: amounts[1], carne80: amounts[2], carne55: amounts[3], flags, sourceRow: i + 1, valid });
    }
    return result;
}
export function parseInvoiceText(text: string) {
    const cuit = text.match(/(?:C\.?U\.?I\.?T\.?)[\s:]+(\d{2}[- ]?\d{8}[- ]?\d)/i)?.[1]?.replace(/\D/g, '') || '';
    const number = text.match(/\b(\d{4,5})\s*[-–]\s*(\d{8})\b/);
    const date = text.match(/(?:fecha[^\d]{0,20})(\d{2})[/-](\d{2})[/-](\d{4})/i);
    const totalMatches = [...text.matchAll(/(?:importe\s+total|total\s+a\s+pagar|\btotal)\s*:?\s*\$?\s*([\d.]+,\d{2}|\d+\.\d{2})(?!\d)/gi)];
    const raw = totalMatches.at(-1)?.[1];
    const amount = raw ? (raw.includes(',') ? Number(raw.replaceAll('.', '').replace(',', '.')) : Number(raw)) : null;
    return { cuit, number: number ? `${number[1].padStart(5, '0')}-${number[2]}` : '', date: date ? `${date[3]}-${date[2]}-${date[1]}` : '', amount };
}
export type Finance = {
    id: string;
    location: string;
    period: string;
    revenue: number | null;
    expenses: number;
    profit: number | null;
    margin: number | null;
    complete: boolean;
    groups: {
        label: string;
        value: number | null;
        cell: string;
    }[];
    channels: {
        label: string;
        value: number | null;
        cell: string;
    }[];
    lines: {
        label: string;
        value: number | null;
        group: string;
        cell: string;
        formula: string | null;
    }[];
    flags: string[];
    source: {
        file: string;
        sheet: string;
        range: string;
        url?: string;
    };
};
export function normalizeFinances(sheets: {
    location: string;
    file: string;
    sheet: string;
    values: unknown[][];
    formulas: string[][];
    url: string;
}[]): Finance[] {
    const result: Finance[] = [];
    const monthMap: Record<string, string> = { DICIEMBRE: '12', ENERO: '01', FEBRERO: '02', MARZO: '03', ABRIL: '04', MAYO: '05', JUNIO: '06', JULIO: '07', AGOSTO: '08', SEPTIEMBRE: '09', OCTUBRE: '10', NOVIEMBRE: '11' };
    const headers: Record<string, string> = { 'MERCADERIA': 'Mercadería', 'SUELDOS': 'Sueldos', 'GASTOS DE LOCAL': 'Gastos del local', 'IMPUESTOS, GASTOS BANCARIOS Y COMISIONES': 'Impuestos y comisiones', 'GASTOS DE MANTENIMIENTO': 'Mantenimiento' };
    for (const s of sheets) {
        if (!/^EERR?\s/.test(s.sheet) || s.sheet.includes('OG') || s.sheet.startsWith('EERR App'))
            continue;
        const monthName = Object.keys(monthMap).find(k => s.sheet.includes(k));
        const yearMatch = s.sheet.match(/\b(20\d{2}|\d{2})\b/);
        if (!monthName || !yearMatch)
            continue;
        const year = yearMatch[1].length === 2 ? '20' + yearMatch[1] : yearMatch[1], period = year + '-' + monthMap[monthName];
        const val = (i: number): number | null => typeof s.values[i]?.[1] === 'number' ? s.values[i][1] as number : null;
        const text = (i: number) => String(s.values[i]?.[0] ?? '').trim();
        const idx = (label: string) => s.values.findIndex((_, i) => text(i).toLowerCase() === label.toLowerCase());
        const salesIdx = idx('VENTAS'), profitIdx = idx('Utilidad');
        if (salesIdx < 0 || profitIdx < 0)
            continue;
        const flags: string[] = [], lines: Finance['lines'] = [], groups: Finance['groups'] = [];
        for (const [header, label] of Object.entries(headers)) {
            const h = idx(header);
            let total = -1;
            for (let i = h + 1; h >= 0 && i < s.values.length; i++)
                if (text(i).toLowerCase() === 'subtotal') {
                    total = i;
                    break;
                }
            if (h < 0 || total < 0) {
                flags.push('Falta sección ' + label);
                continue;
            }
            const value = val(total);
            groups.push({ label, value, cell: 'B' + (total + 1) });
            let sum = 0;
            for (let i = h + 1; i < total; i++) {
                const v = val(i);
                sum += v ?? 0;
                lines.push({ label: text(i), group: label, value: v, cell: 'B' + (i + 1), formula: s.formulas[i]?.[1] || null });
            }
            if (value === null || Math.abs(value - sum) > 1)
                flags.push('Revisar subtotal de ' + label);
        }
        const channels = ['Cta Cte / Efectivo', 'Pedidos YA Tarjeta', 'Pedidos YA Efectivo', 'Mercado Pago'].map(label => { const i = idx(label); return { label, value: i < 0 ? null : val(i), cell: i < 0 ? '' : 'B' + (i + 1) }; });
        const revenue = val(salesIdx), expenses = groups.reduce((a, g) => a + (g.value ?? 0), 0), profit = val(profitIdx);
        if (revenue === null || revenue <= 0 || channels.every(c => c.value === null))
            flags.push('Faltan ventas del período.');
        for (const core of ['CDP', 'Sueldos', 'Alquiler']) {
            const line = lines.find(l => l.label.toLowerCase() === core.toLowerCase());
            if (!line || line.value === null)
                flags.push('Falta gasto principal: ' + core);
        }
        if (!lines.some(l => /pan|bread|harina/i.test(l.label) && l.value !== null))
            flags.push('Falta compra de pan.');
        if (revenue !== null && Math.abs(revenue - channels.reduce((a, c) => a + (c.value ?? 0), 0)) > 1)
            flags.push('Las ventas declaradas no coinciden con sus canales.');
        if (revenue !== null && profit !== null && Math.abs(revenue - expenses - profit) > 1)
            flags.push('La utilidad no reconcilia con los subtotales.');
        if (profit === null)
            flags.push('Falta la utilidad calculada del período.');
        if (sheets.some(o => o.location === s.location && o.sheet.includes(monthName) && o.sheet.includes('OG')))
            flags.push('Hay más de una versión del mes; validar el cierre definitivo.');
        const complete = flags.length === 0 && profit !== null;
        result.push({ id: s.location + '-' + period, location: s.location, period, revenue: revenue && revenue > 0 ? revenue : null, expenses, profit: complete ? profit : null, margin: complete && revenue ? profit! / revenue : null, complete, groups, channels, lines, flags, source: { file: s.file, sheet: s.sheet, range: 'A1:C100', url: s.url } });
    }
    return result;
}
