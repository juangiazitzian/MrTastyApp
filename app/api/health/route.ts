import { authorize, db, failure, json } from '@/lib/server';
export const dynamic = 'force-dynamic';

/**
 * Diagnóstico de la conexión con la base.
 *
 * El resto de la app devuelve un error genérico a propósito: no queremos
 * mostrarle a nadie el detalle interno de una consulta fallida. Pero cuando la
 * app está recién desplegada ese mensaje no alcanza para saber si falta cargar
 * una variable, si el token no sirve o si nunca se corrieron las migraciones.
 *
 * Este endpoint responde esas tres preguntas y nada más. Informa si las
 * variables están presentes, nunca su contenido. Requiere sesión, como todo lo
 * demás.
 */
const REQUERIDAS = ['records', 'audit', 'sales_periods'];

export async function GET(request: Request) {
    try {
        await authorize(request);
        const variables = {
            TURSO_DATABASE_URL: process.env.TURSO_DATABASE_URL ? 'presente' : 'FALTA',
            TURSO_AUTH_TOKEN: process.env.TURSO_AUTH_TOKEN ? 'presente' : 'FALTA',
        };
        try {
            const r = await db().prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all<{
                name: string;
            }>();
            const tablas = r.results.map(t => t.name);
            const faltan = REQUERIDAS.filter(t => !tablas.includes(t));
            return json({
                variables,
                conecta: true,
                tablas,
                faltan,
                diagnostico: faltan.length
                    ? 'Conecta con la base, pero faltan tablas: ' + faltan.join(', ') + '. Hay que correr las migraciones.'
                    : 'Todo en orden: conecta con la base y están las tres tablas.',
            });
        }
        catch (e) {
            return json({
                variables,
                conecta: false,
                error: e instanceof Error ? e.message : String(e),
                diagnostico: 'No se pudo consultar la base. El campo error trae el motivo que devolvió Turso.',
            });
        }
    }
    catch (e) {
        return failure(e);
    }
}
