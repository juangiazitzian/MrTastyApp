"use client";
import { ArrowUpRight, ReceiptText } from 'lucide-react';
import { useRecords, Note } from './workflows';
import { signedAmount, todayAR } from '@/lib/domain';

const money = (n: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);

export function LedgerOverview({ location, onOpen }: { location: string; onOpen: () => void }) {
    const invoices = useRecords('invoice'), sales = useRecords('sale'), expenses = useRecords('expense');
    const period = todayAR().slice(0, 7);
    const relevant = [...invoices.records, ...sales.records, ...expenses.records].filter(r =>
        (location === 'all' || r.payload.location === location) && String(r.payload.date).startsWith(period) &&
        (r.kind !== 'invoice' || r.payload.status === 'reviewed'));
    const sold = relevant.filter(r => r.kind === 'sale');
    const revenue = sold.reduce((a, r) => a + Number(r.payload.amount), 0);
    const costs = relevant.filter(r => r.kind !== 'sale').reduce((a, r) => a + (r.kind === 'invoice' ? signedAmount(r.payload) : Number(r.payload.amount)), 0);
    const error = invoices.error || sales.error || expenses.error;
    const loading = invoices.loading || sales.loading || expenses.loading;
    return <section className="panel live-overview"><div className="panel-heading"><div><h2><ReceiptText size={18}/> Este mes en la app</h2><p>{period} · movimientos cargados por el equipo · {location === 'all' ? 'Ambos locales' : location === 'balbin' ? 'Balbín' : 'Perón'}</p></div><button className="text-button" onClick={onOpen}>Abrir cierre <ArrowUpRight size={15}/></button></div>
        {error ? <Note>{error}</Note> : <><div className="live-numbers"><div><span>Ventas cargadas</span><strong>{loading ? '…' : sold.length ? money(revenue) : 'Sin cargar'}</strong></div><div><span>Gastos registrados</span><strong>{loading ? '…' : money(costs)}</strong></div><div><span>Resultado preliminar</span><strong>{loading ? '…' : sold.length ? money(revenue - costs) : 'Pendiente'}</strong></div></div><p className="footnote">{relevant.length} movimientos · {relevant.filter(r => !r.payload.syncedAt).length} por sincronizar con Sheets. Incluye facturas revisadas, ventas y gastos manuales de la app; falta completar y revisar el mes antes del cierre.</p></>}
    </section>;
}
