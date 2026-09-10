import { z } from 'zod';
import { schemas, invoiceDedupe, Kind } from '@/lib/domain';
import { authorize, db, failure, get, HttpError, json, list, put } from '@/lib/server';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) { try {
    await authorize(request);
    const kind = new URL(request.url).searchParams.get('kind') || 'invoice';
    if (!['invoice', 'candidate', 'stock', 'supply', 'order', 'sale', 'expense', 'file'].includes(kind))
        throw new HttpError(400, 'Tipo no permitido');
    return json({ records: await list(kind) });
}
catch (e) {
    return failure(e);
} }
export async function POST(request: Request) {
    try {
        const user = await authorize(request, true);
        if (Number(request.headers.get('content-length') || 0) > 50000)
            throw new HttpError(413, 'Registro demasiado grande');
        const input = z.object({ id: z.string().max(100).optional(), kind: z.enum(['invoice', 'candidate', 'stock', 'supply', 'order', 'sale', 'expense']), payload: z.unknown(), version: z.number().int().positive().optional() }).parse(await request.json());
        const kind = input.kind as Kind;
        const p = schemas[kind].parse(input.payload) as Record<string, unknown>;
        const old = input.id ? await get(input.id) : null;
        if (input.id && (!old || old.kind !== kind))
            throw new HttpError(404, 'Registro no encontrado');
        if (old && input.version === undefined)
            throw new HttpError(409, 'Falta la versión del registro');
        if (old?.payload.syncedAt)
            throw new HttpError(409, 'Este comprobante ya se exportó a Sheets. Corregilo con un ajuste para conservar el historial.');
        if (old?.payload.syncLockedAt)
            throw new HttpError(409, 'La sincronización ya comenzó. Reintentala para confirmar el registro en Sheets antes de realizar un ajuste.');
        if (kind === 'candidate' && old) {
            for (const key of ['gmailId', 'gmailDate', 'attachmentNames', 'cvText']) {
                if (old.payload[key] !== undefined) p[key] = old.payload[key];
            }
        }
        if (p.fileId) {
            const file = await get(String(p.fileId));
            if (file?.kind !== 'file')
                throw new HttpError(400, 'Archivo no encontrado');
        }
        if (kind === 'sale') {
            if (p.periodMode === 'monthly')
                p.date = String(p.date).slice(0, 7) + '-01';
            if (old && (old.payload.date !== p.date || old.payload.channel !== p.channel || old.payload.location !== p.location || old.payload.periodMode !== p.periodMode))
                throw new HttpError(409, 'La fecha, canal, local y modo de una venta registrada no se pueden cambiar.');
            const key = `${p.location}:${String(p.date).slice(0, 7)}:${p.channel}`;
            await db().prepare('INSERT INTO sales_periods(id,mode) VALUES(?,?) ON CONFLICT(id) DO NOTHING').bind(key, p.periodMode).run();
            const mode = await db().prepare('SELECT mode FROM sales_periods WHERE id=?').bind(key).first<{
                mode: string;
            }>();
            if (mode?.mode !== p.periodMode)
                throw new HttpError(409, 'Este canal ya tiene otro modo de carga en el mes. No se pueden mezclar totales mensuales y ventas diarias.');
        }
        const dedupe = kind === 'invoice' ? invoiceDedupe(p) : kind === 'supply' ? `${p.location}:${p.sku}` : kind === 'sale' ? `${p.location}:${p.date}:${p.channel}` : kind === 'candidate' && p.gmailId ? String(p.gmailId) : null;
        const saved = await put(input.id || crypto.randomUUID(), kind, p, user.userId, input.version, dedupe);
        return json({ record: saved }, old ? 200 : 201);
    }
    catch (e) {
        return failure(e);
    }
}
