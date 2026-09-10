import { authorize, failure, get, json, list } from '@/lib/server';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) { try {
    const user = await authorize(request);
    const [counts, finances, bridge, invoices, sales] = await Promise.all([get('counts-live'), get('finances-live'), get('google-bridge'), list('invoice'), list('sale')]);
    return json({ user: { name: user.displayName }, counts: counts?.payload ?? null, finances: finances?.payload ?? null, googleConfigured: !!bridge, invoices, sales });
}
catch (e) {
    return failure(e);
} }
