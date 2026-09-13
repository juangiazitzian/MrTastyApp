import { auth } from '@/auth';
import { database } from './db';
import { bucket } from './blob';
import type { StoredRecord } from './domain';
export class HttpError extends Error {
    constructor(public status: number, message: string) { super(message); }
}
export function db() { return database(); }
export { bucket };
export async function authorize(request: Request, write = false) {
    const session = await auth();
    const email = session?.user?.email;
    if (!email)
        throw new HttpError(401, 'Iniciá sesión para guardar o consultar registros.');
    // Se conserva la forma que ya esperaba el resto de la app.
    const user = { userId: email, displayName: session?.user?.name ?? email, email };
    if (write) {
        const origin = request.headers.get('origin');
        if (!origin || origin !== new URL(request.url).origin)
            throw new HttpError(403, 'Origen no permitido.');
    }
    return user;
}
export function json(value: unknown, status = 200) { return Response.json(value, { status, headers: { 'Cache-Control': 'no-store' } }); }
export function failure(e: unknown) { if (e instanceof HttpError)
    return json({ error: e.message }, e.status); if (e instanceof Error && e.name === 'ZodError')
    return json({ error: 'Revisá los campos. ' + e.message }, 400); console.error('Tasty operation failed', e instanceof Error ? e.message : 'unknown'); return json({ error: 'No pudimos completar la operación. Tus datos ingresados se conservaron.' }, 500); }
export async function list(kind: string): Promise<StoredRecord[]> { const r = await db().prepare('SELECT id,kind,payload,version,created_at AS createdAt,updated_at AS updatedAt FROM records WHERE kind=? ORDER BY updated_at DESC LIMIT 10001').bind(kind).all(); if (r.results.length > 10000)
    throw new HttpError(413, 'Hay más de 10.000 registros. Se requiere ampliar la consulta por período; no se muestran totales parciales.'); return r.results.map(r => ({ ...r, payload: JSON.parse(String(r.payload)) })) as StoredRecord[]; }
export async function get(id: string) { const r = await db().prepare('SELECT id,kind,payload,version,created_at AS createdAt,updated_at AS updatedAt FROM records WHERE id=?').bind(id).first(); return r ? { ...r, payload: JSON.parse(String(r.payload)) } as StoredRecord : null; }
export async function put(id: string, kind: string, payload: unknown, actor: string, version?: number, dedupe: string | null = null) {
    const now = new Date().toISOString();
    let statement;
    if (version !== undefined)
        statement = db().prepare('UPDATE records SET payload=?,version=version+1,updated_at=?,dedupe=? WHERE id=? AND kind=? AND version=?').bind(JSON.stringify(payload), now, dedupe, id, kind, version);
    else
        statement = db().prepare('INSERT INTO records(id,kind,payload,dedupe,version,created_at,updated_at) VALUES(?,?,?,?,1,?,?)').bind(id, kind, JSON.stringify(payload), dedupe, now, now);
    try {
        const r = await statement.run();
        if (r.meta.changes === 0)
            throw new HttpError(409, 'El registro cambió en otra sesión. Actualizá la lista antes de guardarlo.');
    }
    catch (e) {
        if (String(e).includes('UNIQUE constraint'))
            throw new HttpError(409, 'Este comprobante o registro ya está cargado. Revisá la lista para evitar duplicarlo.');
        throw e;
    }
    await db().prepare('INSERT INTO audit(id,record_id,action,actor,at) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(), id, version === undefined ? 'create' : 'update', actor, now).run();
    return get(id);
}
export async function bridge(action: string, payload: unknown = {}) {
    const config = await get('google-bridge');
    if (!config)
        throw new HttpError(409, 'Falta activar la conexión con Google en Conexiones.');
    const { url, secret } = config.payload as {
        url: string;
        secret: string;
    };
    if (!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url))
        throw new HttpError(400, 'La URL de Google Apps Script no es válida.');
    const body = { action, payload, timestamp: Date.now(), nonce: crypto.randomUUID() };
    const message = JSON.stringify(body);
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const signature = Array.from(new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message)))).map(x => x.toString(16).padStart(2, '0')).join('');
    let r: Response;
    try {
        r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message, signature }), signal: AbortSignal.timeout(90000) });
    }
    catch {
        throw new HttpError(502, 'Google no respondió a tiempo. Podés reintentar sin duplicar el registro.');
    }
    if (!r.ok)
        throw new HttpError(502, 'Google rechazó la conexión. Revisá su autorización.');
    let d;
    try {
        d = await r.json() as {
            ok: boolean;
            error?: string;
            result: unknown;
        };
    }
    catch {
        throw new HttpError(502, 'Google devolvió una página de acceso. Revisá la implementación de Apps Script.');
    }
    if (!d.ok)
        throw new HttpError(502, d.error || 'Falló la operación en Google.');
    return d.result;
}

// A retried export must send the same immutable payload, even if Google timed out.
export async function syncRecord(id: string, action: 'invoice' | 'entry', actor: string) {
    let record = await get(id);
    if (!record || (action === 'invoice' ? record.kind !== 'invoice' || record.payload.status !== 'reviewed' : !['sale', 'expense'].includes(record.kind)))
        throw new HttpError(400, 'Primero guardá y revisá el registro.');
    if (record.payload.syncedAt) return record;
    if (!await get('google-bridge')) throw new HttpError(409, 'Falta activar la conexión con Google en Conexiones.');
    const row = await db().prepare('SELECT dedupe FROM records WHERE id=?').bind(id).first<{ dedupe: string | null }>();
    if (!record.payload.syncLockedAt) {
        record = await put(id, record.kind, { ...record.payload, syncLockedAt: new Date().toISOString() }, actor, record.version, row?.dedupe ?? null);
        if (!record) throw new HttpError(404, 'Registro no encontrado');
    }
    const result = await bridge(action, { id, kind: record.kind, ...record.payload }) as { sheetUrl: string };
    const latest = await get(id);
    if (latest?.payload.syncedAt) return latest;
    return put(id, record.kind, { ...record.payload, syncedAt: new Date().toISOString(), sheetUrl: result.sheetUrl }, actor, record.version, row?.dedupe ?? null);
}
