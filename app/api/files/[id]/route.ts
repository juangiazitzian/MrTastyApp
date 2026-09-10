import { authorize, bucket, failure, get, HttpError } from '@/lib/server';
export const dynamic = 'force-dynamic';
export async function GET(request: Request, { params }: {
    params: Promise<{
        id: string;
    }>;
}) { try {
    await authorize(request);
    const { id } = await params;
    const file = await get(id);
    if (!file || file.kind !== 'file')
        throw new HttpError(404, 'Archivo no encontrado');
    const object = await bucket().get(String(file.payload.key));
    if (!object)
        throw new HttpError(404, 'Archivo no disponible');
    const mime = String(file.payload.mime);
    return new Response(object.body, { headers: { 'Content-Type': mime, 'Content-Disposition': `${mime.startsWith('image/') || mime === 'application/pdf' ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(String(file.payload.name))}`, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; sandbox" } });
}
catch (e) {
    return failure(e);
} }
