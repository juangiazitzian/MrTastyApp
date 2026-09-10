import { z } from 'zod';
import { authorize, bridge, bucket, failure, get, HttpError, json, put, syncRecord } from '@/lib/server';
import { normalizeCounts, normalizeFinances, parseInvoiceText } from '@/lib/imports';
export const dynamic = 'force-dynamic';
const inputSchema = z.discriminatedUnion('action', [
    z.object({ action: z.literal('configure'), url: z.string().regex(/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/), secret: z.string().min(32).max(256) }),
    z.object({ action: z.enum(['status', 'counts', 'finances']) }),
    z.object({ action: z.literal('gmail'), period: z.enum(['180', '365', 'all']).default('180') }),
    z.object({ action: z.enum(['ocr', 'invoice', 'entry', 'gmail-cv']), id: z.string().max(100) })
]);
export async function POST(request: Request) {
    try {
        const user = await authorize(request, true);
        const input = inputSchema.parse(await request.json());
        if (input.action === 'configure') {
            const old = await get('google-bridge');
            await put('google-bridge', 'integration', { url: input.url, secret: input.secret }, user.userId, old?.version);
            return json({ configured: true });
        }
        if (input.action === 'status')
            return json({ result: await bridge('status') });
        if (input.action === 'finances') {
            const response = await bridge('finances') as {
                sheets: Parameters<typeof normalizeFinances>[0];
            };
            const finances = normalizeFinances(response.sheets);
            if (!finances.some(f => f.location === 'balbin') || !finances.some(f => f.location === 'peron'))
                throw new HttpError(502, 'No se encontraron estados de resultados válidos de ambos locales. Se conserva la importación anterior.');
            const syncedAt = new Date().toISOString();
            const old = await get('finances-live');
            await put('finances-live', 'snapshot', { finances, syncedAt }, user.userId, old?.version);
            return json({ finances, syncedAt });
        }
        if (input.action === 'entry') {
            return json({ record: await syncRecord(input.id, 'entry', user.userId) });
        }
        if (input.action === 'counts') {
            const response = await bridge('counts') as {
                locations: {
                    location: string;
                    values: unknown[][];
                }[];
            };
            if (!response.locations?.some(x => x.location === 'balbin') || !response.locations.some(x => x.location === 'peron'))
                throw new HttpError(502, 'La respuesta no contiene los dos locales');
            const counts = response.locations.flatMap(x => normalizeCounts(x.values, x.location));
            const syncedAt = new Date().toISOString();
            const old = await get('counts-live');
            await put('counts-live', 'snapshot', { counts, syncedAt }, user.userId, old?.version);
            return json({ counts, syncedAt });
        }
        if (input.action === 'ocr') {
            const file = await get(input.id);
            if (!file || file.kind !== 'file')
                throw new HttpError(404, 'Archivo no encontrado');
            if (file.payload.ocrText)
                return json({ text: file.payload.ocrText, suggestions: parseInvoiceText(String(file.payload.ocrText)) });
            const obj = await bucket().get(String(file.payload.key));
            if (!obj)
                throw new HttpError(404, 'Archivo no encontrado');
            const bytes = new Uint8Array(await obj.arrayBuffer());
            let raw = '';
            for (let i = 0; i < bytes.length; i += 8192)
                raw += String.fromCharCode(...bytes.subarray(i, i + 8192));
            const result = await bridge('ocr', { name: file.payload.name, mime: file.payload.mime, base64: btoa(raw), id: file.id }) as {
                text: string;
            };
            if (typeof result.text !== 'string')
                throw new HttpError(502, 'Google no devolvió texto');
            const text = result.text.slice(0, 50000);
            await put(file.id, 'file', { ...file.payload, ocrText: text, ocrStatus: 'review' }, user.userId, file.version, String(file.payload.hash));
            return json({ text, suggestions: parseInvoiceText(text) });
        }
        if (input.action === 'invoice') {
            return json({ record: await syncRecord(input.id, 'invoice', user.userId) });
        }
        if (input.action === 'gmail-cv') {
            const record = await get(input.id);
            if (!record || record.kind !== 'candidate' || !record.payload.gmailId) throw new HttpError(400, 'Candidato sin correo de origen');
            if (record.payload.cvText) return json({ record, text: record.payload.cvText });
            const result = await bridge('gmail-cv', { messageId: record.payload.gmailId }) as { text: string };
            if (typeof result.text !== 'string' || !result.text.trim()) throw new HttpError(502, 'No se encontró texto legible en los adjuntos. Revisá el correo original.');
            const text = result.text.slice(0, 40000);
            const saved = await put(record.id, 'candidate', { ...record.payload, cvText: text }, user.userId, record.version, String(record.payload.gmailId));
            return json({ record: saved, text });
        }
        if (input.action === 'gmail') {
            const cursorId = 'gmail-cursor-' + input.period;
            const cursor = await get(cursorId);
            const result = await bridge('gmail', { pageToken: cursor?.payload.nextPageToken || '', period: input.period }) as {
                candidates: {
                    messageId: string;
                    name: string;
                    email: string;
                    subject: string;
                    date: string;
                    text: string;
                    attachmentNames: string[];
                }[];
                nextPageToken?: string;
            };
            let added = 0;
            for (const c of result.candidates) {
                if (!c.messageId || !c.email)
                    continue;
                const id = 'gmail-' + c.messageId;
                if (await get(id))
                    continue;
                await put(id, 'candidate', { name: c.name || c.email, email: c.email, phone: '', location: 'both', role: '', availability: '', experience: '', notes: (c.subject + '\n' + c.text).slice(0, 3000), stage: 'Nuevo', gmailId: c.messageId, gmailDate: c.date, attachmentNames: c.attachmentNames }, user.userId, undefined, c.messageId);
                added++;
            }
            await put(cursorId, 'integration', { nextPageToken: result.nextPageToken || '', syncedAt: new Date().toISOString() }, user.userId, cursor?.version);
            return json({ added, hasMore: !!result.nextPageToken });
        }
        throw new HttpError(400, 'Acción no permitida');
    }
    catch (e) {
        return failure(e);
    }
}
