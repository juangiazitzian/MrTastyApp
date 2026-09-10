"use client";
import { useEffect, useMemo, useState, FormEvent } from 'react';
import { Plus, Upload, RefreshCw, FileText, Search, Download, Check, ExternalLink, Package, AlertCircle, Mail, Link2 } from 'lucide-react';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableHeader, TableHead, TableRow, TableCell, TableBody } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { categories, Count, forecast, Kind, safeCsv, schemas, signedAmount, skus, Sku, StoredRecord, suggestOrder, todayAR } from '@/lib/domain';
import snapshot from '@/data/reviewed.json';
import type { Finance } from '@/lib/imports';
const names: Record<string, string> = { balbin: 'Balbín', peron: 'Perón', both: 'Ambos', all: 'Ambos locales' };
const money = (n: number | null) => n === null ? 'Sin cargar' : new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
const number = (n: number | null) => n === null ? '—' : new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 }).format(n);
type ApiResponse = {
    error?: string;
    record: StoredRecord;
    records: StoredRecord[];
    duplicate?: boolean;
    text: string;
    suggestions: Record<string, unknown>;
    result: Record<string, unknown>;
    added: number;
    hasMore: boolean;
    counts: Count[];
    syncedAt: string;
    finances: Finance[];
};
export async function api(path: string, body?: unknown) { const r = await fetch(path, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : undefined); const d = await r.json() as ApiResponse; if (!r.ok)
    throw new Error(d.error || 'La operación falló'); return d; }
export function Choice({ value, onChange, options, label }: {
    value: string;
    onChange: (s: string) => void;
    options: readonly string[] | Record<string, string>;
    label: string;
}) { return <Select value={value} onValueChange={onChange}><SelectTrigger aria-label={label}><SelectValue placeholder={label}/></SelectTrigger><SelectContent>{(Array.isArray(options) ? options.map(x => [x, x]) : Object.entries(options)).map(([v, l]) => <SelectItem value={v} key={v}>{l}</SelectItem>)}</SelectContent></Select>; }
function Field({ label, children }: {
    label: string;
    children: React.ReactNode;
}) { return <label className="field"><span>{label}</span>{children}</label>; }
export function Note({ children }: {
    children: React.ReactNode;
}) { return <div className="notice"><AlertCircle size={17}/><div>{children}</div></div>; }
function Empty({ title, text }: {
    title: string;
    text: string;
}) { return <div className="empty-state"><FileText size={32}/><h2>{title}</h2><p>{text}</p></div>; }
function download(name: string, rows: unknown[][]) { const url = URL.createObjectURL(new Blob([safeCsv(rows)], { type: 'text/csv;charset=utf-8;' })); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url); }
export function useRecords(kind: string) { const [records, setRecords] = useState<StoredRecord[]>([]); const [error, setError] = useState(''); const [loading, setLoading] = useState(true); async function reload() { try {
    setLoading(true);
    const d = await api('/api/records?kind=' + kind);
    setRecords(d.records);
    setError('');
}
catch (e) {
    setError((e as Error).message);
}
finally {
    setLoading(false);
} } useEffect(() => { void reload(); }, [kind]); return { records, error, loading, reload }; }
function LoadError({ error }: {
    error: string;
}) { return error ? <Note>{error} {error.includes('sesión') && <a href="/signin-with-chatgpt?return_to=/" target="_top">Iniciar sesión</a>}</Note> : null; }
async function saveRecord(kind: Kind, payload: unknown, existing?: StoredRecord) { const parsed = schemas[kind].safeParse(payload); if (!parsed.success)
    throw new Error(parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(' · ')); return api('/api/records', { kind, payload: parsed.data, ...(existing ? { id: existing.id, version: existing.version } : {}) }); }
export function Orders({ location, counts }: {
    location: string;
    counts: Count[];
}) {
    const loc = location === 'all' ? 'balbin' : location;
    const [chosen, setChosen] = useState(loc);
    const stock = useRecords('stock'), supply = useRecords('supply'), orders = useRecords('order');
    const [form, setForm] = useState<{
        kind: 'stock' | 'supply';
        sku: Sku;
    } | null>(null);
    const [saving, setSaving] = useState(false);
    const [confirmed, setConfirmed] = useState(true);
    const [draft, setDraft] = useState<Record<string, string>>({});
    useEffect(() => setChosen(loc), [loc]);
    const rows = skus.map(s => { const st = stock.records.filter(r => r.payload.location === chosen && r.payload.sku === s.id).sort((a, b) => String(b.payload.countedAt).localeCompare(String(a.payload.countedAt)))[0]; const sp = supply.records.find(r => r.payload.location === chosen && r.payload.sku === s.id); const p = sp?.payload; const fc = forecast(counts, chosen, s.id, p ? Number(p.leadDays) + Number(p.cycleDays) : 7); const stockFresh = !!st && Date.now() - Date.parse(String(st.payload.countedAt)) < 864e5; const qty = p && stockFresh && confirmed ? suggestOrder(fc.demand, Number(st!.payload.quantity), Number(p.incoming), Number(p.pack), Number(p.safetyPct)) : null; return { ...s, st, sp, fc, stockFresh, qty }; });
    function open(kind: 'stock' | 'supply', sku: Sku) { const row = rows.find(r => r.id === sku)!; setForm({ kind, sku }); setDraft(kind === 'stock' ? { quantity: '', countedAt: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16), notes: '' } : row.sp ? Object.fromEntries(Object.entries(row.sp.payload).map(([k, v]) => [k, String(v)])) : { supplier: '', pack: '', leadDays: '', cycleDays: '', safetyPct: '15', incoming: '0' }); }
    async function submit(e: FormEvent) { e.preventDefault(); if (!form)
        return; setSaving(true); try {
        const existing = form.kind === 'supply' ? rows.find(r => r.id === form.sku)?.sp : undefined;
        const payload = form.kind === 'stock' ? { location: chosen, sku: form.sku, quantity: Number(draft.quantity), countedAt: new Date(draft.countedAt).toISOString(), notes: draft.notes || '' } : { location: chosen, sku: form.sku, supplier: draft.supplier, pack: Number(draft.pack), leadDays: Number(draft.leadDays), cycleDays: Number(draft.cycleDays), safetyPct: Number(draft.safetyPct), incoming: Number(draft.incoming), confirmed: true };
        await saveRecord(form.kind, payload, existing);
        await (form.kind === 'stock' ? stock.reload() : supply.reload());
        setForm(null);
        toast.success('Guardado');
    }
    catch (e) {
        toast.error((e as Error).message);
    }
    finally {
        setSaving(false);
    } }
    async function createOrder() { setSaving(true); try {
        const lines = rows.filter(r => r.qty !== null && r.qty > 0).map(r => ({ sku: r.id, supplier: String(r.sp!.payload.supplier), quantity: r.qty!, unit: r.unit, pack: Number(r.sp!.payload.pack) }));
        await saveRecord('order', { location: chosen, lines, status: 'draft', createdFor: todayAR() });
        await orders.reload();
        download('pedido-' + chosen + '-' + todayAR() + '.csv', [['Local', 'Proveedor', 'Insumo', 'Cantidad', 'Unidad'], ...lines.map(l => [names[chosen], l.supplier, skus.find(s => s.id === l.sku)?.label, l.quantity, l.unit])]);
        toast.success('Borrador guardado y descargado');
    }
    catch (e) {
        toast.error((e as Error).message);
    }
    finally {
        setSaving(false);
    } }
    return <><div className="toolbar"><Choice label="Local para el pedido" value={chosen} onChange={setChosen} options={{ balbin: 'Balbín', peron: 'Perón' }}/><button className="primary" disabled={saving || !rows.some(r => r.qty !== null && r.qty > 0)} onClick={createOrder}><Download size={16}/> Guardar pedido</button></div><LoadError error={stock.error || supply.error}/><Note>El stock de las hojas antiguas no se usa porque figura como “STOCK MUNRO”. Registrá un conteo actual y completá proveedor, bulto y plazos para calcular cada pedido.</Note><label className="check-line"><Checkbox checked={confirmed} onCheckedChange={v => setConfirmed(v === true)}/>Confirmo que los valores de «Conteo» son consumos diarios.</label><section className="panel"><div className="panel-heading"><div><h2>Propuesta de compra · {names[chosen]}</h2><p>Consumos de las últimas 8 semanas, comparando el mismo día de la semana.</p></div></div><Table><TableHeader><TableRow><TableHead>Insumo</TableHead><TableHead>Promedio diario</TableHead><TableHead>Stock actual</TableHead><TableHead>Proveedor</TableHead><TableHead>Pedido sugerido</TableHead><TableHead>Completar</TableHead></TableRow></TableHeader><TableBody>{rows.map(r => <TableRow key={r.id}><TableCell><strong>{r.label}</strong><small className="cell-meta">{r.unit} · {r.fc.observations}/56 días válidos</small></TableCell><TableCell>{number(r.fc.mean)}<small className="cell-meta">Último: {r.fc.last || 'sin datos'}</small></TableCell><TableCell>{r.stockFresh ? number(Number(r.st!.payload.quantity)) : 'Sin conteo vigente'}</TableCell><TableCell>{String(r.sp?.payload.supplier || 'Sin configurar')}</TableCell><TableCell><strong>{r.qty === null ? 'Pendiente' : `${number(r.qty)} ${r.unit}`}</strong><small className="cell-meta">{!r.fc.reliable ? 'Historial insuficiente o desactualizado' : !confirmed ? 'Confirmar significado de Conteo' : !r.stockFresh ? 'Cargar stock de las últimas 24 h' : !r.sp ? 'Configurar proveedor' : `${r.sp.payload.leadDays} días de entrega + ${r.sp.payload.cycleDays} entre pedidos`}</small></TableCell><TableCell><div className="row-actions"><button onClick={() => open('stock', r.id)}>Stock</button><button onClick={() => open('supply', r.id)}>Proveedor</button></div></TableCell></TableRow>)}</TableBody></Table></section><details className="method"><summary>Cómo se calcula y cuándo se frena una sugerencia</summary><p>Pedido = demanda de los días de entrega y del intervalo entre pedidos, más el porcentaje de seguridad, menos stock e ingresos ya confirmados; se redondea hacia arriba al bulto del proveedor. El stock debe tener menos de 24 horas. Se exigen al menos 70% de días registrados en 8 semanas, dos observaciones por día de semana proyectado y consumo actualizado en los últimos 4 días. Faltantes, fechas duplicadas, «?» y turnos parciales no se consideran cero. Es una estimación: ajustá por promociones, feriados y vencimientos.</p></details><section className="panel"><div className="panel-heading"><h2>Pedidos guardados</h2></div>{orders.records.filter(r => r.payload.location === chosen).length ? <Table><TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Estado</TableHead><TableHead>Detalle</TableHead></TableRow></TableHeader><TableBody>{orders.records.filter(r => r.payload.location === chosen).map(r => <TableRow key={r.id}><TableCell>{String(r.payload.createdFor)}</TableCell><TableCell>Borrador</TableCell><TableCell>{(r.payload.lines as {
        sku: string;
        quantity: number;
    }[]).map(l => `${skus.find(s => s.id === l.sku)?.label}: ${l.quantity}`).join(' · ')}</TableCell></TableRow>)}</TableBody></Table> : <Empty title="Todavía no hay pedidos guardados" text="Las sugerencias se guardan como borrador. El envío al proveedor queda a cargo del equipo."/>}</section><Dialog open={!!form} onOpenChange={o => !o && setForm(null)}><DialogContent className="tasty-dialog"><DialogHeader><DialogTitle>{form?.kind === 'stock' ? 'Registrar stock' : 'Configurar proveedor'} · {skus.find(s => s.id === form?.sku)?.label}</DialogTitle><DialogDescription>{names[chosen]} · Completá los valores reales.</DialogDescription></DialogHeader><form onSubmit={submit} className="form-grid">{form?.kind === 'stock' ? <><Field label="Cantidad disponible"><input required type="number" min="0" step="any" value={draft.quantity} onChange={e => setDraft({ ...draft, quantity: e.target.value })}/></Field><Field label="Momento del conteo (hora local)"><input required type="datetime-local" value={draft.countedAt} onChange={e => setDraft({ ...draft, countedAt: e.target.value })}/></Field><Field label="Observaciones"><input value={draft.notes} onChange={e => setDraft({ ...draft, notes: e.target.value })}/></Field></> : <>{[['supplier', 'Proveedor'], ['pack', 'Unidades por bulto'], ['leadDays', 'Días hasta la entrega'], ['cycleDays', 'Días entre pedidos'], ['safetyPct', 'Colchón de seguridad (%)'], ['incoming', 'Unidades ya pedidas por recibir']].map(([k, l]) => <Field key={k} label={l}><input required type={k === 'supplier' ? 'text' : 'number'} min={k === 'pack' || k === 'cycleDays' ? 1 : 0} step="any" value={draft[k]} onChange={e => setDraft({ ...draft, [k]: e.target.value })}/></Field>)}</>}<button className="primary full" disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button></form></DialogContent></Dialog></>;
}
export function Invoices({ location, onChanged }: {
    location: string;
    onChanged: () => void;
}) {
    const { records, error, reload, loading } = useRecords('invoice');
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const [edit, setEdit] = useState<StoredRecord>();
    const [p, setP] = useState<Record<string, unknown>>({});
    const [busy, setBusy] = useState(false);
    const [text, setText] = useState('');
    const filtered = records.filter(r => (location === 'all' || r.payload.location === location) && `${r.payload.supplier} ${r.payload.number} ${r.payload.cuit}`.toLowerCase().includes(query.toLowerCase()));
    function start(r?: StoredRecord) { setEdit(r); setP(r ? r.payload : { location: location === 'all' ? 'balbin' : location, supplier: '', cuit: '', number: '', documentType: 'Factura A', date: '', category: 'Mercadería', amount: '', notes: '', status: 'draft' }); setText(''); setOpen(true); }
    function field(k: string, value: unknown) { setP(old => ({ ...old, [k]: value })); }
    async function upload(file: File) { setBusy(true); try {
        const form = new FormData();
        form.append('file', file);
        const r = await fetch('/api/files', { method: 'POST', body: form });
        const d = await r.json() as ApiResponse;
        if (!r.ok)
            throw new Error(d.error);
        field('fileId', d.record.id);
        toast.success(d.duplicate ? 'El archivo ya estaba guardado; se reutilizó.' : 'Comprobante guardado. Podés leerlo con OCR o completar los campos.');
    }
    catch (e) {
        toast.error((e as Error).message);
    }
    finally {
        setBusy(false);
    } }
    async function ocr() { setBusy(true); try {
        const d = await api('/api/google', { action: 'ocr', id: p.fileId });
        setText(d.text);
        setP(old => ({ ...old, ...Object.fromEntries(Object.entries(d.suggestions).filter(([k, v]) => !old[k] && v !== null && v !== '')) }));
        toast.success('Texto extraído. Revisá los campos contra el original.');
    }
    catch (e) {
        toast.error((e as Error).message);
    }
    finally {
        setBusy(false);
    } }
    async function save(e: FormEvent) { e.preventDefault(); setBusy(true); try {
        const saved = await saveRecord('invoice', { ...p, amount: Number(p.amount) }, edit);
        setEdit(saved.record);
        await reload();
        onChanged();
        if (p.status === 'reviewed') {
            try {
                const d = await api('/api/google', { action: 'invoice', id: saved.record.id });
                setEdit(d.record);
                await reload();
                toast.success('Factura revisada y registrada en Sheets');
            }
            catch (e) {
                toast.warning('Guardada en la app. Pendiente de Sheets: ' + (e as Error).message);
            }
        }
        else
            toast.success('Borrador guardado');
        setOpen(false);
    }
    catch (e) {
        toast.error((e as Error).message);
    }
    finally {
        setBusy(false);
    } }
    async function retry(r: StoredRecord) { setBusy(true); try {
        await api('/api/google', { action: 'invoice', id: r.id });
        await reload();
        toast.success('Registrada en Sheets');
    }
    catch (e) {
        toast.error((e as Error).message);
    }
    finally {
        setBusy(false);
    } }
    return <><div className="toolbar"><div className="search"><Search size={17}/><input aria-label="Buscar factura" placeholder="Proveedor, CUIT o número…" value={query} onChange={e => setQuery(e.target.value)}/></div><button className="primary" onClick={() => start()}><Plus size={17}/> Cargar factura</button></div><LoadError error={error}/><Note>Las facturas se contabilizan al marcarlas como revisadas. Las notas de crédito restan. Un mismo CUIT, tipo y número de comprobante no se puede cargar dos veces.</Note><section className="panel"><Table><TableHeader><TableRow><TableHead>Comprobante</TableHead><TableHead>Local</TableHead><TableHead>Fecha</TableHead><TableHead>Categoría</TableHead><TableHead>Importe</TableHead><TableHead>Estado</TableHead><TableHead>Acciones</TableHead></TableRow></TableHeader><TableBody>{filtered.map(r => <TableRow key={r.id}><TableCell><strong>{String(r.payload.supplier)}</strong><small className="cell-meta">{String(r.payload.number)}</small></TableCell><TableCell>{names[String(r.payload.location)]}</TableCell><TableCell>{String(r.payload.date)}</TableCell><TableCell>{String(r.payload.category)}</TableCell><TableCell>{money(signedAmount(r.payload))}</TableCell><TableCell><span className={'badge ' + (r.payload.syncedAt ? 'good' : 'warning')}>{r.payload.syncedAt ? 'En Sheets' : r.payload.status === 'reviewed' ? 'Revisada · por sincronizar' : 'Borrador'}</span></TableCell><TableCell><div className="row-actions"><button onClick={() => start(r)}>Ver / revisar</button>{r.payload.status === 'reviewed' && !r.payload.syncedAt && <button disabled={busy} onClick={() => retry(r)}>Sincronizar</button>}</div></TableCell></TableRow>)}</TableBody></Table>{!filtered.length && <Empty title={loading ? 'Cargando facturas…' : 'Tu archivo de facturas empieza acá'} text="Subí una foto o un PDF, revisá fecha, proveedor e importe y confirmá la categoría."/>}</section><Dialog open={open} onOpenChange={setOpen}><DialogContent className="tasty-dialog wide-dialog"><DialogHeader><DialogTitle>{edit ? 'Revisar comprobante' : 'Cargar comprobante'}</DialogTitle><DialogDescription>Guardá el original y verificá cada campo antes de contabilizar.</DialogDescription></DialogHeader><form className="form-grid" onSubmit={save}><div className="full upload-area"><Upload size={23}/><label>Elegir foto o PDF<input type="file" accept="image/jpeg,image/png,application/pdf" disabled={busy || !!p.syncedAt || !!p.syncLockedAt} onChange={e => e.target.files?.[0] && upload(e.target.files[0])}/></label><small>Hasta 8 MB por archivo</small>{!!p.fileId && <div className="inline-actions"><a href={'/api/files/' + p.fileId} target="_blank" rel="noreferrer">Ver original <ExternalLink size={14}/></a><button type="button" className="secondary" disabled={busy} onClick={ocr}>Extraer texto</button></div>}</div><Field label="Local"><Choice label="Local de la factura" value={String(p.location)} onChange={v => field('location', v)} options={{ balbin: 'Balbín', peron: 'Perón' }}/></Field><Field label="Proveedor"><input required value={String(p.supplier || '')} onChange={e => field('supplier', e.target.value)}/></Field><Field label="CUIT del proveedor"><input required inputMode="numeric" placeholder="11 dígitos" value={String(p.cuit || '')} onChange={e => field('cuit', e.target.value.replace(/\D/g, ''))}/></Field><Field label="Número de comprobante"><input required placeholder="00000-00000000" value={String(p.number || '')} onChange={e => field('number', e.target.value)}/></Field><Field label="Tipo"><Choice label="Tipo de comprobante" value={String(p.documentType)} onChange={v => field('documentType', v)} options={['Factura A', 'Factura B', 'Factura C', 'Ticket', 'Nota de crédito A', 'Nota de crédito B', 'Nota de crédito C']}/></Field><Field label="Fecha del comprobante"><input required type="date" value={String(p.date || '')} onChange={e => field('date', e.target.value)}/></Field><Field label="Categoría del EERR"><Choice label="Categoría" value={String(p.category)} onChange={v => field('category', v)} options={categories}/></Field><Field label="Importe total (ARS)"><input required type="number" step="0.01" min="0.01" value={String(p.amount ?? '')} onChange={e => field('amount', e.target.value)}/></Field><Field label="Observaciones"><textarea value={String(p.notes || '')} onChange={e => field('notes', e.target.value)}/></Field><Field label="Estado"><Choice label="Estado de revisión" value={String(p.status)} onChange={v => field('status', v)} options={{ draft: 'Borrador', reviewed: 'Revisada: incluir en resultados' }}/></Field>{text && <details className="full"><summary>Texto extraído para revisar</summary><pre className="ocr-text">{text}</pre></details>}{p.syncedAt || p.syncLockedAt ? <Note>{p.syncedAt ? 'Ya registrada en Sheets. El comprobante se conserva sin modificaciones.' : 'La sincronización comenzó. Cerrá esta ficha y reintentá sincronizar para confirmar el mismo comprobante en Sheets.'}</Note> : <button className="primary full" disabled={busy}>{busy ? 'Procesando…' : p.status === 'reviewed' ? 'Confirmar y registrar' : 'Guardar borrador'}</button>}</form></DialogContent></Dialog></>;
}
export function Results({ location, period, finances, initialTab = 'history' }: {
    initialTab?: string;
    location: string;
    period: string;
    finances: Finance[];
}) {
    const [tab, setTab] = useState(initialTab);
    const invoices = useRecords('invoice'), sales = useRecords('sale'), expenses = useRecords('expense');
    const [editingEntry, setEditingEntry] = useState<StoredRecord>();
    const [ledgerPeriod, setLedgerPeriod] = useState(todayAR().slice(0, 7));
    const [dialog, setDialog] = useState<'sale' | 'expense' | null>(null);
    const [p, setP] = useState<Record<string, unknown>>({});
    const [busy, setBusy] = useState(false);
    const historical = finances.filter(f => f.period === period && (location === 'all' || f.location === location));
    const filtered = (list: StoredRecord[]) => list.filter(r => (location === 'all' || r.payload.location === location) && String(r.payload.date).startsWith(ledgerPeriod));
    const inv = filtered(invoices.records).filter(r => r.payload.status === 'reviewed'), ss = filtered(sales.records), ee = filtered(expenses.records);
    const totalSales = ss.reduce((a, r) => a + Number(r.payload.amount), 0), totalExpense = inv.reduce((a, r) => a + signedAmount(r.payload), 0) + ee.reduce((a, r) => a + Number(r.payload.amount), 0);
    function start(kind: 'sale' | 'expense', existing?: StoredRecord) { setDialog(kind); setEditingEntry(existing); setP(existing ? existing.payload : { location: location === 'all' ? 'balbin' : location, date: todayAR(), channel: 'Mercado Pago', periodMode: 'monthly', category: 'Sueldos', description: '', amount: '', notes: '' }); }
    async function save(e: FormEvent) { e.preventDefault(); if (!dialog)
        return; setBusy(true); try {
        const saved = await saveRecord(dialog, { ...p, amount: Number(p.amount) }, editingEntry);
        await (dialog === 'sale' ? sales.reload() : expenses.reload());
        try {
            await api('/api/google', { action: 'entry', id: saved.record.id });
            await (dialog === 'sale' ? sales.reload() : expenses.reload());
            toast.success('Guardado en la app y en Sheets');
        }
        catch (e) {
            toast.warning('Guardado en la app. Pendiente de Sheets: ' + (e as Error).message);
        }
        setDialog(null);
    }
    catch (e) {
        toast.error((e as Error).message);
    }
    finally {
        setBusy(false);
    } }
    async function salesPhoto(file: File) { setBusy(true); try {
        const form = new FormData();
        form.append('file', file);
        const r = await fetch('/api/files', { method: 'POST', body: form });
        const d = await r.json() as ApiResponse;
        if (!r.ok)
            throw new Error(d.error);
        setP(old => ({ ...old, fileId: d.record.id }));
        try {
            const o = await api('/api/google', { action: 'ocr', id: d.record.id });
            setP(old => ({ ...old, notes: ('Texto extraído para revisar: ' + o.text).slice(0, 1000) }));
            toast.success('Foto guardada y texto extraído. Cargá el importe del canal elegido.');
        }
        catch (e) {
            toast.warning('Foto guardada. OCR pendiente: ' + (e as Error).message);
        }
    }
    catch (e) {
        toast.error((e as Error).message);
    }
    finally {
        setBusy(false);
    } }
    async function syncEntry(r: StoredRecord) { setBusy(true); try {
        await api('/api/google', { action: 'entry', id: r.id });
        await (r.kind === 'sale' ? sales.reload() : expenses.reload());
        toast.success('Sincronizado');
    }
    catch (e) {
        toast.error((e as Error).message);
    }
    finally {
        setBusy(false);
    } }
    function exportHistory() { download(`EERR-${location}-${period}.csv`, [['Local', 'Mes', 'Grupo', 'Concepto', 'Importe ARS', 'Archivo', 'Hoja', 'Celda'], ...historical.flatMap(f => [...f.channels.map(c => [names[f.location], f.period, 'Ventas', c.label, c.value, f.source.file, f.source.sheet, c.cell]), ...f.lines.map(l => [names[f.location], f.period, l.group, l.label, l.value, f.source.file, f.source.sheet, l.cell])])]); }
    const groups = categories.map(category => ({ category, value: inv.filter(r => r.payload.category === category).reduce((a, r) => a + signedAmount(r.payload), 0) + ee.filter(r => r.payload.category === category).reduce((a, r) => a + Number(r.payload.amount), 0) }));
    return <Tabs value={tab} onValueChange={setTab}><TabsList><TabsTrigger value="history">Histórico de las planillas</TabsTrigger><TabsTrigger value="ledger">Cierre desde la app</TabsTrigger></TabsList><TabsContent value="history"><div className="toolbar"><p className="muted">{period} · {names[location]}</p><button className="secondary" onClick={exportHistory}><Download size={16}/> Exportar detalle</button></div>{historical.length === 0 && <Empty title="No hay un EERR para este período" text="Elegí otro mes o local."/>}{historical.map(f => <section className="panel result-panel" key={f.id}><div className="panel-heading"><div><h2>{names[f.location]} · {f.period}</h2><p>{f.source.file} · {f.source.sheet}</p></div><span className={'badge ' + (f.complete ? 'good' : 'warning')}>{f.complete ? 'Cargado' : 'Requiere revisión'}</span></div>{f.flags.map(flag => <Note key={flag}>{flag}</Note>)}<Table><TableHeader><TableRow><TableHead>Concepto</TableHead><TableHead>Importe (ARS)</TableHead><TableHead>% sobre ventas</TableHead></TableRow></TableHeader><TableBody><TableRow className="total-row"><TableCell>Ventas declaradas</TableCell><TableCell>{money(f.revenue)}</TableCell><TableCell>{f.revenue ? '100%' : '—'}</TableCell></TableRow>{f.groups.map(g => <TableRow key={g.label}><TableCell>{g.label}</TableCell><TableCell>{money(g.value)}</TableCell><TableCell>{f.revenue && g.value !== null ? number(g.value / f.revenue * 100) + '%' : '—'}</TableCell></TableRow>)}<TableRow className="total-row"><TableCell>Resultado declarado</TableCell><TableCell>{f.complete ? money(f.profit) : 'Pendiente de validación'}</TableCell><TableCell>{f.complete && f.margin !== null ? number(f.margin * 100) + '%' : '—'}</TableCell></TableRow></TableBody></Table><details className="method"><summary>Ver importes y fórmulas de origen</summary><Table><TableHeader><TableRow><TableHead>Concepto</TableHead><TableHead>Importe</TableHead><TableHead>Celda</TableHead><TableHead>Fórmula original</TableHead></TableRow></TableHeader><TableBody>{f.lines.map(l => <TableRow key={l.cell}><TableCell>{l.label}</TableCell><TableCell>{money(l.value)}</TableCell><TableCell>{l.cell}</TableCell><TableCell className="formula-cell">{l.formula || 'Valor ingresado'}</TableCell></TableRow>)}</TableBody></Table></details></section>)}<Note>Las categorías siguen las planillas originales. Mercadería representa compras registradas, no costo de consumo ajustado por inventario. No se suman los nuevos comprobantes a estos meses para evitar contabilizarlos dos veces.</Note></TabsContent><TabsContent value="ledger"><div className="toolbar"><Field label="Período del nuevo cierre"><input type="month" value={ledgerPeriod} onChange={e => setLedgerPeriod(e.target.value)}/></Field><div className="inline-actions"><button className="secondary" onClick={() => start('expense')}><Plus size={15}/> Gasto manual</button><button className="primary" onClick={() => start('sale')}><Plus size={15}/> Cargar ventas</button></div></div><LoadError error={invoices.error || sales.error || expenses.error}/><Note>Cierre preliminar con facturas revisadas, gastos manuales y ventas cargadas en la app. Completá sueldos, alquiler, comisiones y demás gastos del mes. Una factura ya registrada no debe repetirse como gasto manual.</Note><div className="metrics ledger-metrics"><section className="metric"><span>Ventas cargadas</span><strong>{ss.length ? money(totalSales) : 'Sin cargar'}</strong></section><section className="metric"><span>Gastos registrados</span><strong>{money(totalExpense)}</strong></section><section className="metric metric-accent"><span>Resultado preliminar</span><strong>{ss.length ? money(totalSales - totalExpense) : 'Pendiente'}</strong></section></div><section className="panel"><div className="panel-heading"><h2>Estado de resultados · {ledgerPeriod}</h2><button className="secondary" onClick={() => download(`cierre-app-${location}-${ledgerPeriod}.csv`, [['Local', 'Período', 'Concepto', 'ARS', 'Estado'], [names[location], ledgerPeriod, 'Ventas', ss.length ? totalSales : null, 'Preliminar'], ...groups.map(g => [names[location], ledgerPeriod, g.category, g.value, 'Preliminar']), [names[location], ledgerPeriod, 'Resultado', ss.length ? totalSales - totalExpense : null, 'Preliminar']])}>Exportar CSV</button></div><Table><TableHeader><TableRow><TableHead>Concepto</TableHead><TableHead>Importe</TableHead></TableRow></TableHeader><TableBody>{groups.map(g => <TableRow key={g.category}><TableCell>{g.category}</TableCell><TableCell>{money(g.value)}</TableCell></TableRow>)}</TableBody></Table></section><section className="panel result-panel"><div className="panel-heading"><h2>Ventas y gastos manuales</h2></div>{[...ss, ...ee].length ? <Table><TableHeader><TableRow><TableHead>Local</TableHead><TableHead>Fecha</TableHead><TableHead>Concepto</TableHead><TableHead>Importe</TableHead><TableHead>Sheets</TableHead></TableRow></TableHeader><TableBody>{[...ss, ...ee].map(r => <TableRow key={r.id}><TableCell>{names[String(r.payload.location)]}</TableCell><TableCell>{String(r.payload.date)}</TableCell><TableCell>{String(r.payload.channel || r.payload.description)}</TableCell><TableCell>{money(Number(r.payload.amount))}</TableCell><TableCell>{r.payload.syncedAt ? 'Sincronizado' : <div className="row-actions">{!r.payload.syncLockedAt && <button disabled={busy} onClick={() => start(r.kind as 'sale' | 'expense', r)}>Editar</button>}<button disabled={busy} onClick={() => syncEntry(r)}>Sincronizar</button></div>}</TableCell></TableRow>)}</TableBody></Table> : <Empty title="Sin movimientos manuales" text="Podés registrar las ventas por canal y los gastos que no tienen una factura de proveedor."/>}</section><Dialog open={!!dialog} onOpenChange={v => !v && setDialog(null)}><DialogContent className="tasty-dialog"><DialogHeader><DialogTitle>{dialog === 'sale' ? 'Registrar ventas' : 'Registrar gasto manual'}</DialogTitle><DialogDescription>{dialog === 'sale' ? 'Elegí total mensual para las fotos de facturación. No se mezclan totales mensuales y diarios en un mismo canal.' : 'Usá esta carga para gastos sin factura ya registrada.'}</DialogDescription></DialogHeader><form className="form-grid" onSubmit={save}>{dialog === 'sale' && <div className="full upload-area"><Upload size={22}/><label>Foto de facturación<input type="file" accept="image/jpeg,image/png,application/pdf" onChange={e => e.target.files?.[0] && salesPhoto(e.target.files[0])}/></label>{!!p.fileId && <a href={'/api/files/' + p.fileId} target="_blank" rel="noreferrer">Ver original ↗</a>}</div>}<Field label="Local"><Choice label="Local" value={String(p.location)} onChange={v => setP({ ...p, location: v })} options={{ balbin: 'Balbín', peron: 'Perón' }}/></Field><Field label={dialog === 'sale' && p.periodMode === 'monthly' ? 'Mes de facturación' : 'Fecha'}><input required type={dialog === 'sale' && p.periodMode === 'monthly' ? 'month' : 'date'} value={String(p.date).slice(0, dialog === 'sale' && p.periodMode === 'monthly' ? 7 : 10)} onChange={e => setP({ ...p, date: e.target.value + (e.target.value.length === 7 ? '-01' : '') })}/></Field>{dialog === 'sale' ? <><Field label="Tipo de carga"><Choice label="Tipo de carga de ventas" value={String(p.periodMode)} onChange={v => setP({ ...p, periodMode: v })} options={{ monthly: 'Total del mes', daily: 'Total del día' }}/></Field><Field label="Canal"><Choice label="Canal" value={String(p.channel)} onChange={v => setP({ ...p, channel: v })} options={['Cta Cte / Efectivo', 'Pedidos YA Tarjeta', 'Pedidos YA Efectivo', 'Mercado Pago']}/></Field></> : <><Field label="Categoría"><Choice label="Categoría" value={String(p.category)} onChange={v => setP({ ...p, category: v })} options={categories}/></Field><Field label="Concepto"><input required value={String(p.description)} onChange={e => setP({ ...p, description: e.target.value })}/></Field></>}<Field label="Importe (ARS)"><input required type="number" min={dialog === 'sale' ? 0 : 0.01} step="0.01" value={String(p.amount)} onChange={e => setP({ ...p, amount: e.target.value })}/></Field><Field label="Observaciones"><textarea value={String(p.notes)} onChange={e => setP({ ...p, notes: e.target.value })}/></Field><button className="primary full" disabled={busy}>{busy ? 'Guardando…' : 'Guardar y sincronizar'}</button></form></DialogContent></Dialog></TabsContent></Tabs>;
}
export function Candidates({ location }: {
    location: string;
}) {
    const { records, error, reload, loading } = useRecords('candidate');
    const [query, setQuery] = useState('');
    const [stage, setStage] = useState('all');
    const [open, setOpen] = useState(false);
    const [edit, setEdit] = useState<StoredRecord>();
    const [p, setP] = useState<Record<string, unknown>>({});
    const [busy, setBusy] = useState(false);
    const [more, setMore] = useState(false);
    const [mailPeriod, setMailPeriod] = useState('180');
    const visible = records.filter(r => (location === 'all' || r.payload.location === location || r.payload.location === 'both') && (stage === 'all' || r.payload.stage === stage) && [r.payload.name, r.payload.role, r.payload.experience, r.payload.availability, r.payload.notes, r.payload.cvText].join(' ').toLowerCase().includes(query.toLowerCase()));
    function start(r?: StoredRecord) { setEdit(r); setP(r ? r.payload : { name: '', email: '', phone: '', location: location === 'all' ? 'both' : location, role: '', availability: '', experience: '', notes: '', stage: 'Nuevo' }); setOpen(true); }
    async function save(e: FormEvent) { e.preventDefault(); setBusy(true); try {
        await saveRecord('candidate', p, edit);
        await reload();
        setOpen(false);
        toast.success('Candidato guardado');
    }
    catch (e) {
        toast.error((e as Error).message);
    }
    finally {
        setBusy(false);
    } }
    async function sync() { setBusy(true); try {
        const d = await api('/api/google', { action: 'gmail', period: mailPeriod });
        setMore(d.hasMore);
        await reload();
        toast.success(`${d.added} correos nuevos importados${d.hasMore ? '. Quedan más resultados.' : ''}`);
    }
    catch (e) {
        toast.error((e as Error).message);
    }
    finally {
        setBusy(false);
    } }
    async function upload(file: File) { setBusy(true); try {
        const form = new FormData();
        form.append('file', file);
        const r = await fetch('/api/files', { method: 'POST', body: form });
        const d = await r.json() as ApiResponse;
        if (!r.ok)
            throw new Error(d.error);
        setP(old => ({ ...old, fileId: d.record.id }));
        toast.success('CV guardado');
    }
    catch (e) {
        toast.error((e as Error).message);
    }
    finally {
        setBusy(false);
    } }
    async function readMailCv() { if (!edit) return; setBusy(true); try {
        const d = await api('/api/google', { action: 'gmail-cv', id: edit.id });
        setEdit(d.record);
        setP(old => ({ ...old, cvText: d.text }));
        await reload();
        toast.success('Adjuntos leídos. El texto ya se puede buscar desde la lista.');
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); } }
    async function extract() { setBusy(true); try {
        const d = await api('/api/google', { action: 'ocr', id: p.fileId });
        setP(old => ({ ...old, notes: [old.notes, 'Texto del CV para revisar:', d.text.slice(0, 2500)].filter(Boolean).join('\n').slice(0, 3000) }));
        toast.success('Texto disponible para revisar');
    }
    catch (e) {
        toast.error((e as Error).message);
    }
    finally {
        setBusy(false);
    } }
    return <><div className="toolbar"><div className="search"><Search size={17}/><input placeholder="Nombre, experiencia o disponibilidad…" aria-label="Buscar candidatos" value={query} onChange={e => setQuery(e.target.value)}/></div><div className="inline-actions"><button className="secondary" disabled={busy} onClick={sync}><RefreshCw size={16}/> {more ? 'Traer más correos' : 'Importar de Gmail'}</button><button className="primary" onClick={() => start()}><Plus size={16}/> Agregar candidato</button></div></div><LoadError error={error}/><div className="toolbar"><Choice label="Antigüedad de los correos" value={mailPeriod} onChange={v => { setMailPeriod(v); setMore(false); }} options={{ '180': 'Últimos 6 meses', '365': 'Último año', all: 'Todo el historial' }}/><Choice label="Estado de candidatura" value={stage} onChange={setStage} options={{ all: 'Todos los estados', Nuevo: 'Nuevo', 'A revisar': 'A revisar', Entrevista: 'Entrevista', Seleccionado: 'Seleccionado', Archivado: 'Archivado' }}/><p className="muted">{visible.length} candidatos · {names[location]}</p></div><Note>Gmail: mrtastysanmiguel@gmail.com. Importación de correos relacionados con CV del período elegido, en tandas de 25. Abrí una ficha y usá «Leer adjuntos del correo» para incorporar el texto de sus CV al buscador. La selección la realiza el equipo.</Note><section className="panel"><Table><TableHeader><TableRow><TableHead>Candidato</TableHead><TableHead>Local</TableHead><TableHead>Puesto / disponibilidad</TableHead><TableHead>Estado</TableHead><TableHead>Origen</TableHead><TableHead /></TableRow></TableHeader><TableBody>{visible.map(r => <TableRow key={r.id}><TableCell><strong>{String(r.payload.name)}</strong><small className="cell-meta">{String(r.payload.email || 'Sin email')}</small></TableCell><TableCell>{names[String(r.payload.location)]}</TableCell><TableCell>{String(r.payload.role || 'A definir')}<small className="cell-meta">{String(r.payload.availability || 'Por consultar')}</small></TableCell><TableCell><span className="badge good">{String(r.payload.stage)}</span></TableCell><TableCell>{r.payload.gmailId ? <a href={`https://mail.google.com/mail/u/?authuser=mrtastysanmiguel%40gmail.com#all/${r.payload.gmailId}`} target="_blank" rel="noreferrer">Ver correo ↗</a> : 'Carga manual'}</TableCell><TableCell><button className="text-button" onClick={() => start(r)}>Abrir ficha</button></TableCell></TableRow>)}</TableBody></Table>{!visible.length && <Empty title={loading ? 'Cargando candidatos…' : 'Los próximos integrantes, en un solo lugar'} text="Activá Gmail o cargá un CV para buscarlo por experiencia y seguir su estado."/>}</section><Dialog open={open} onOpenChange={setOpen}><DialogContent className="tasty-dialog wide-dialog"><DialogHeader><DialogTitle>Ficha del candidato</DialogTitle><DialogDescription>Datos de contacto, experiencia y seguimiento del equipo.</DialogDescription></DialogHeader><form className="form-grid" onSubmit={save}>{[['name', 'Nombre'], ['email', 'Email'], ['phone', 'Teléfono'], ['role', 'Puesto'], ['availability', 'Disponibilidad']].map(([key, label]) => <Field key={key} label={label}><input required={key === 'name'} type={key === 'email' ? 'email' : 'text'} value={String(p[key] || '')} onChange={e => setP({ ...p, [key]: e.target.value })}/></Field>)}<Field label="Local"><Choice label="Local del candidato" value={String(p.location)} onChange={v => setP({ ...p, location: v })} options={{ both: 'Ambos', balbin: 'Balbín', peron: 'Perón' }}/></Field><Field label="Estado"><Choice label="Estado" value={String(p.stage)} onChange={v => setP({ ...p, stage: v })} options={['Nuevo', 'A revisar', 'Entrevista', 'Seleccionado', 'Archivado']}/></Field><Field label="Experiencia"><textarea value={String(p.experience || '')} onChange={e => setP({ ...p, experience: e.target.value })}/></Field><Field label="Notas del equipo / texto del CV"><textarea rows={5} value={String(p.notes || '')} onChange={e => setP({ ...p, notes: e.target.value })}/></Field>{!!p.gmailId && <div className="full upload-area"><Mail size={22}/><strong>CV recibido por correo</strong><small>{Array.isArray(p.attachmentNames) ? p.attachmentNames.join(' · ') : 'Adjuntos del correo original'}</small><button type="button" className="secondary" disabled={busy} onClick={readMailCv}>{p.cvText ? 'Verificar texto guardado' : 'Leer adjuntos del correo'}</button><a href={`https://mail.google.com/mail/u/?authuser=mrtastysanmiguel%40gmail.com#all/${p.gmailId}`} target="_blank" rel="noreferrer">Abrir correo original ↗</a></div>}{!!p.cvText && <details className="full"><summary>Texto de los adjuntos · disponible en el buscador</summary><pre className="ocr-text">{String(p.cvText)}</pre></details>}<Field label="Adjuntar CV"><input type="file" accept="application/pdf,image/jpeg,image/png,text/plain" onChange={e => e.target.files?.[0] && upload(e.target.files[0])}/></Field>{!!p.fileId && <div className="inline-actions full"><a href={'/api/files/' + p.fileId} target="_blank" rel="noreferrer">Ver CV</a><button type="button" className="secondary" onClick={extract} disabled={busy}>Extraer texto del CV</button></div>}<button className="primary full" disabled={busy}>{busy ? 'Guardando…' : 'Guardar ficha'}</button></form></DialogContent></Dialog></>;
}
export function Connections({ onCounts, onFinances, onConnected }: {
    onConnected: () => void;
    onCounts: (counts: Count[]) => void;
    onFinances: (finances: Finance[]) => void;
}) {
    const [url, setUrl] = useState('');
    const [secret, setSecret] = useState('');
    const [busy, setBusy] = useState(false);
    const [status, setStatus] = useState<Record<string, unknown> | null>(null);
    const [synced, setSynced] = useState('');
    async function run(action: 'status' | 'counts' | 'finances') { setBusy(true); try {
        const d = await api('/api/google', { action });
        if (action === 'counts') {
            onCounts(d.counts);
            setSynced(d.syncedAt);
            toast.success('Consumos actualizados desde Sheets');
        }
        else if (action === 'finances') {
            onFinances(d.finances);
            toast.success('Estados de resultados actualizados desde Sheets');
        }
        else {
            setStatus(d.result);
            onConnected();
            toast.success('Conexión verificada');
        }
    }
    catch (e) {
        toast.error((e as Error).message);
    }
    finally {
        setBusy(false);
    } }
    async function configure(e: FormEvent) { e.preventDefault(); setBusy(true); try {
        await api('/api/google', { action: 'configure', url, secret });
        setSecret('');
        toast.success('Conexión guardada. Verificá el acceso con el botón de prueba.');
    }
    catch (e) {
        toast.error((e as Error).message);
    }
    finally {
        setBusy(false);
    } }
    return <><Note>Los Sheets conservan sus permisos de Google. La conexión se autoriza desde una cuenta con acceso y los comprobantes se guardan en una pestaña nueva «Registro App» del EERR correspondiente. Las fórmulas e importes históricos se conservan.</Note><div className="connections-grid">{snapshot.sources.map(s => <section className="panel connection-card" key={s.id}><div className="connection-icon"><Link2 /></div><h2>Conteo · {names[s.location]}</h2><span className="badge good">Lectura verificada en esta tarea</span><p>Pestaña «Conteo» · último consumo importado: {s.lastDataDate}. Los blancos se conservan como datos faltantes.</p><a href={s.url} target="_blank" rel="noreferrer">Abrir Google Sheet <ExternalLink size={15}/></a></section>)}<section className="panel connection-card"><div className="connection-icon"><Mail /></div><h2>Currículums en Gmail</h2><span className="badge warning">{status ? 'Conexión configurada' : 'Requiere autorización'}</span><p>mrtastysanmiguel@gmail.com<br />Consulta de correos de CV, sin envío de mensajes.</p><a href="https://mail.google.com/mail/u/?authuser=mrtastysanmiguel%40gmail.com" target="_blank" rel="noreferrer">Abrir Gmail <ExternalLink size={15}/></a></section></div><section className="panel setup-panel"><div className="panel-heading"><div><h2>Activar la conexión privada con Google</h2><p>Una configuración inicial con la cuenta del local.</p></div></div><div className="setup-body"><ol><li>Dar acceso a los dos EERR a la cuenta del local, si todavía no lo tiene.</li><li>Instalar el conector de Google con los enlaces de los EERR y autorizarlo en esa cuenta.</li><li>Guardar aquí la URL del conector y su clave, y probar la conexión.</li></ol><div className="inline-actions"><a className="secondary" href="/google-setup.html" target="_blank" rel="noreferrer">Ver instrucciones y archivos</a><button className="secondary" disabled={busy} onClick={() => run('status')}>Probar conexión</button><button className="primary" disabled={busy} onClick={() => run('counts')}><RefreshCw size={15}/> Actualizar consumos</button><button className="secondary" disabled={busy} onClick={() => run('finances')}>Actualizar EERR</button></div>{synced && <p className="muted">Última actualización: {new Date(synced).toLocaleString('es-AR')}</p>}{status && <div className="connection-status"><strong>Cuenta verificada: {String(status.account)}</strong><p>Balbín: {String(status.balbin)} · Perón: {String(status.peron)}</p><p>EERR Balbín: {String(status.eerrBalbin)} · EERR Perón: {String(status.eerrPeron)}</p></div>}<form className="form-grid" onSubmit={configure}><Field label="URL del conector"><input required type="url" placeholder="https://script.google.com/macros/s/…/exec" value={url} onChange={e => setUrl(e.target.value)}/></Field><Field label="Clave privada del conector"><input required type="password" minLength={32} autoComplete="new-password" value={secret} onChange={e => setSecret(e.target.value)}/></Field><button className="primary" disabled={busy}>{busy ? 'Guardando…' : 'Guardar conexión'}</button></form><p className="muted">La clave se guarda en el servidor y no se vuelve a mostrar. Hasta completar esta conexión, podés trabajar con los datos importados y registrar movimientos en la app.</p></div></section></>;
}
