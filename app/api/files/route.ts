import { authorize, bucket, db, failure, get, HttpError, json, put } from '@/lib/server';
export const dynamic = 'force-dynamic';
export async function POST(request: Request) { try {
    const user = await authorize(request, true);
    if (Number(request.headers.get('content-length') || 0) > 9 * 1024 * 1024)
        throw new HttpError(413, 'Máximo 8 MB por archivo');
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File) || file.size > 8 * 1024 * 1024 || file.size === 0)
        throw new HttpError(400, 'Elegí un archivo de hasta 8 MB');
    if (!['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/plain'].includes(file.type))
        throw new HttpError(400, 'Usá JPG, PNG, WebP, PDF o TXT');
    const bytes = await file.arrayBuffer();
    const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))).map(v => v.toString(16).padStart(2, '0')).join('');
    const existing = await db().prepare("SELECT id FROM records WHERE kind='file' AND dedupe=?").bind(hash).first<{
        id: string;
    }>();
    if (existing)
        return json({ record: await get(existing.id), duplicate: true });
    const id = crypto.randomUUID();
    const key = `documents/${id}`;
    await bucket().put(key, bytes, { httpMetadata: { contentType: file.type } });
    const record = await put(id, 'file', { name: file.name.slice(0, 180), mime: file.type, size: file.size, key, hash, ocrStatus: 'pending' }, user.userId, undefined, hash);
    return json({ record }, 201);
}
catch (e) {
    return failure(e);
} }
