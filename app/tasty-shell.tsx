"use client";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useTheme } from "@/hooks/use-theme";
import { useChartColors } from "@/hooks/use-chart-colors";
import { useEffect, useState } from 'react';
import { Toaster } from 'sonner';
import { Orders, Invoices, Results, Candidates, Connections } from './workflows';
import type { Finance } from '@/lib/imports';
import { Count } from '@/lib/domain';
import { LayoutDashboard, Package, ReceiptText, ChartNoAxesCombined, Users, Link2, Store, ArrowUpRight, ArrowDownRight, ChevronRight, Sun, Moon } from 'lucide-react';
import { Sidebar, SidebarProvider, SidebarContent, SidebarHeader, SidebarFooter, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarTrigger } from '@/components/ui/sidebar';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import data from '@/data/reviewed.json';
import { LedgerOverview } from './ledger-overview';
import { OperatingInsights } from './operating-insights';
const names: Record<string, string> = { balbin: 'Balbín', peron: 'Perón', all: 'Ambos locales' };
const money = (n: number | null) => n === null ? 'Sin datos' : new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
const compact = (n: number | null) => n === null ? 'Pendiente' : `$ ${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 }).format(n / 1e6)} M`;
const pct = (n: number | null) => n === null ? 'Pendiente' : new Intl.NumberFormat('es-AR', { style: 'percent', maximumFractionDigits: 1 }).format(n);
const months: Record<string, string> = { '12': 'Dic', '01': 'Ene', '02': 'Feb', '03': 'Mar', '04': 'Abr', '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Ago', '09': 'Sep', '10': 'Oct', '11': 'Nov' };
const periodLabel = (p: string) => `${months[p.slice(5)]} ${p.slice(0, 4)}`;
const nav = [{ id: 'dashboard', label: 'Resumen', icon: LayoutDashboard }, { id: 'orders', label: 'Pedidos y stock', icon: Package }, { id: 'invoices', label: 'Facturas', icon: ReceiptText }, { id: 'results', label: 'Estado de resultados', icon: ChartNoAxesCombined }, { id: 'people', label: 'Candidatos', icon: Users }, { id: 'connections', label: 'Conexiones', icon: Link2 }];
export default function TastyShell() {
    const reducedMotion = useReducedMotion();
    const { dark, toggle: toggleTheme } = useTheme();
    const chartColors = useChartColors();
    const [resultMode, setResultMode] = useState('history');
    function showResults(mode: string) { setResultMode(mode); setView('results'); }
    const [view, setView] = useState('dashboard');
    const [location, setLocation] = useState('all');
    const [period, setPeriod] = useState('2026-07');
    const [counts, setCounts] = useState<Count[]>(data.counts);
    const [finances, setFinances] = useState<Finance[]>(data.finances);
    const [connected, setConnected] = useState(false);
    const [needsLogin, setNeedsLogin] = useState(false);
    useEffect(() => { fetch('/api/state').then(async (r) => { if (r.status === 401) {
        setNeedsLogin(true);
        return;
    } if (r.ok) {
        const d = await r.json() as {
            counts: {
                counts: Count[];
            } | null;
            finances: {
                finances: Finance[];
            } | null;
            googleConfigured: boolean;
        };
        setConnected(d.googleConfigured);
        if (d.counts?.counts)
            setCounts(d.counts.counts);
        if (d.finances?.finances)
            setFinances(d.finances.finances);
    } }).catch(() => { }); }, []);
    useEffect(() => { const context = (document as Document & {
        modelContext?: {
            registerTool: (tool: unknown, options: {
                signal: AbortSignal;
            }) => unknown;
        };
    }).modelContext; if (!context?.registerTool)
        return; const lifecycle = new AbortController(); try {
        Promise.resolve(context.registerTool({ name: 'navigate_tasty', title: 'Abrir sección de Tasty', description: 'Cambia la sección visible. No crea registros ni envía pedidos.', inputSchema: { type: 'object', properties: { view: { type: 'string', enum: nav.map(n => n.id) } }, required: ['view'], additionalProperties: false }, annotations: { readOnlyHint: false }, execute: (input: {
                view: string;
            }) => { if (!nav.some(n => n.id === input.view))
                throw new Error('Sección inválida'); setView(input.view); return { view: input.view }; } }, { signal: lifecycle.signal })).catch(() => { });
    }
    catch { } return () => lifecycle.abort(); }, []);
    useEffect(() => { if (!connected)
        return; let active = true; const refresh = async () => { try {
        const r = await fetch('/api/google', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'counts' }) });
        if (r.ok) {
            const d = await r.json() as {
                counts: Count[];
            };
            if (active)
                setCounts(d.counts);
        }
    }
    catch { } }; void refresh(); const interval = setInterval(refresh, 15 * 60 * 1000); return () => { active = false; clearInterval(interval); }; }, [connected]);
    const records = finances.filter(f => f.period === period && (location === 'all' || f.location === location));
    const complete = records.length === (location === 'all' ? 2 : 1) && records.every(f => f.complete);
    const revenue = records.length && records.every(f => f.revenue !== null) ? records.reduce((a, f) => a + (f.revenue || 0), 0) : null;
    const expenses = records.reduce((a, f) => a + f.expenses, 0);
    const profit = complete ? records.reduce((a, f) => a + (f.profit || 0), 0) : null;
    const previousDate = new Date(period + '-01T12:00:00Z'); previousDate.setUTCMonth(previousDate.getUTCMonth() - 1);
    const previousPeriod = previousDate.toISOString().slice(0, 7);
    const latestComplete = Array.from(new Set(finances.map(f => f.period))).sort().reverse().find(p => finances.filter(f => f.period === p && f.complete).length === 2);
    const incompletePeriod = finances.filter(f => !f.complete).map(f => f.period).sort().at(-1);
    const previous = finances.filter(f => f.period === previousPeriod && (location === 'all' || f.location === location));
    const previousRevenue = previous.length === records.length && previous.every(f => f.complete) ? previous.reduce((a, f) => a + (f.revenue || 0), 0) : null;
    const delta = revenue && previousRevenue ? (revenue - previousRevenue) / previousRevenue : null;
    const chart = Array.from(new Set(finances.map(f => f.period))).filter(p => p <= period).sort().slice(-6).map(p => ({ period: periodLabel(p), ...Object.fromEntries(['balbin', 'peron'].map(loc => [loc, finances.find(f => f.period === p && f.location === loc)?.revenue ?? null])) }));
    return <SidebarProvider><Sidebar className="tasty-sidebar"><SidebarHeader><div className="official-brand"><img src="/brand/logo.png" alt="Mr. Tasty" width="142" height="66"/><span>OPERACIONES</span></div></SidebarHeader><SidebarContent><div className="nav-label">SAN MIGUEL</div><SidebarMenu>{nav.map(n => <SidebarMenuItem key={n.id}><SidebarMenuButton isActive={view === n.id} onClick={() => setView(n.id)}><n.icon /><span>{n.label}</span>{view === n.id && <ChevronRight className="ml-auto"/>}</SidebarMenuButton></SidebarMenuItem>)}</SidebarMenu></SidebarContent><SidebarFooter><div className="store-note"><Store size={18}/><div>MR. TASTY SAN MIGUEL<small>Balbín & Perón</small></div></div><div className="owner"><span>MT</span><div>Gestión Mr Tasty<small>San Miguel, Buenos Aires</small></div></div></SidebarFooter></Sidebar><div className="workspace"><header className="topbar"><div className="breadcrumb"><SidebarTrigger /><span>Operaciones</span><ChevronRight size={14}/><strong>{nav.find(n => n.id === view)?.label}</strong></div><div className="top-actions"><span className="snapshot-tag">Gestión de Balbín y Perón</span><button className="icon-button" onClick={toggleTheme} aria-label={dark ? "Cambiar a tema claro" : "Cambiar a tema oscuro"} title={dark ? "Tema claro" : "Tema oscuro"}>{dark ? <Sun size={16}/> : <Moon size={16}/>}</button><button className="quick-action" onClick={() => setView("invoices")}><ReceiptText size={16}/> Cargar factura</button></div></header><main className="content" key={view}><div className="page-heading"><div><div className="eyebrow">SAN MIGUEL / CENTRO DE OPERACIONES</div><h1>{nav.find(n => n.id === view)?.label}</h1><p>{view === 'dashboard' ? 'Los números de tus locales y lo que necesita atención.' : 'Balbín y Perón · Mr Tasty'}</p></div><div className="filters"><Select value={location} onValueChange={setLocation}><SelectTrigger aria-label="Local"><Store size={16}/><SelectValue /></SelectTrigger><SelectContent>{Object.entries(names).map(([key, name]) => <SelectItem value={key} key={key}>{name}</SelectItem>)}</SelectContent></Select><Select value={period} onValueChange={setPeriod}><SelectTrigger aria-label="Mes"><SelectValue /></SelectTrigger><SelectContent>{Array.from(new Set(finances.map(f => f.period))).reverse().map(p => <SelectItem value={p} key={p}>{periodLabel(p)}</SelectItem>)}</SelectContent></Select></div></div>
 {needsLogin && <div className="notice"><div>Para guardar registros, <a href="/login">iniciá sesión</a>.</div></div>} {view === 'dashboard' ? <><div className="period-note"><span className="status-dot"/> {period === latestComplete ? `${periodLabel(period)} es el último mes comparable con ventas y gastos cargados en ambos locales.` : 'Los importes corresponden a las planillas importadas.'}<button onClick={() => showResults('history')}>Ver detalle <ArrowUpRight size={15}/></button></div><div className="metrics"><Metric title="Facturación" value={compact(revenue)} subtitle="Ventas declaradas · ARS" delta={delta}/><Metric title="Gastos registrados" value={compact(expenses)} subtitle="Según categorías del EERR"/><Metric title="Resultado del mes" value={compact(profit)} subtitle={complete ? 'Utilidad declarada en las planillas' : 'Faltan datos o validaciones'} accent/><Metric title="Margen sobre ventas" value={pct(profit !== null && revenue ? profit / revenue : null)} subtitle="Resultado / facturación"/></div><div className="main-grid"><section className="panel chart-panel"><div className="panel-heading"><div><h2>Cómo viene la facturación</h2><p>Comparación mensual por local · pesos argentinos</p></div><span className="subtle">Últimos {chart.length} meses</span></div><div className="chart"><ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 700, height: 280 }}><BarChart data={chart} barGap={7} margin={{ top: 15, right: 16, left: 0, bottom: 0 }}><CartesianGrid vertical={false} stroke={chartColors.grid}/><XAxis dataKey="period" axisLine={false} tickLine={false} tick={{ fill: chartColors.axis, fontSize: 13 }}/><YAxis tickFormatter={v => `${v / 1e6} M`} axisLine={false} tickLine={false} width={55} tick={{ fill: chartColors.axis, fontSize: 12 }}/><Tooltip formatter={v => money(Number(v))} cursor={{ fill: chartColors.cursor }}/><Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 13, paddingTop: 10 }}/>{(location === 'all' || location === 'balbin') && <Bar isAnimationActive={!reducedMotion} name="Balbín" dataKey="balbin" fill={chartColors.balbin} radius={[5, 5, 0, 0]} maxBarSize={32}/>} {(location === 'all' || location === 'peron') && <Bar isAnimationActive={!reducedMotion} name="Perón" dataKey="peron" fill={chartColors.peron} radius={[5, 5, 0, 0]} maxBarSize={32}/>}</BarChart></ResponsiveContainer></div></section><section className="panel attention"><div className="panel-heading"><h2>Para revisar</h2><span className="count-badge">3</span></div><Action index="01" title={incompletePeriod ? `Revisar cierre de ${periodLabel(incompletePeriod)}` : "Revisar el último cierre"} text="Comprobá importes faltantes y alertas de conciliación." onClick={() => { if (incompletePeriod) setPeriod(incompletePeriod); showResults('history'); }}/><Action index="02" title="Confirmar stock disponible" text="El stock histórico tiene referencias a Munro." onClick={() => setView('orders')}/><Action index="03" title={connected ? "Revisar las conexiones" : "Activar las conexiones"} text="Sheets, facturas y la bandeja de Gmail." onClick={() => setView('connections')}/></section></div><section className="panel"><div className="panel-heading"><div><h2>Local por local</h2><p>La misma lectura para los dos equipos.</p></div><button className="text-button" onClick={() => showResults('history')}>Abrir resultados <ArrowUpRight size={16}/></button></div><Table><TableHeader><TableRow><TableHead>Local</TableHead><TableHead>Facturación</TableHead><TableHead>Gastos</TableHead><TableHead>Resultado</TableHead><TableHead>Margen</TableHead><TableHead>Estado</TableHead></TableRow></TableHeader><TableBody>{records.map(f => <TableRow key={f.id}><TableCell><div className="location-cell"><span className={'local-icon ' + f.location}><Store size={19}/></span><div><strong>{names[f.location]}</strong><small>{f.location === 'balbin' ? 'San Miguel 1' : 'San Miguel 2'}</small></div></div></TableCell><TableCell>{money(f.revenue)}</TableCell><TableCell>{money(f.expenses)}</TableCell><TableCell className="positive">{f.complete ? money(f.profit) : 'Pendiente'}</TableCell><TableCell>{f.complete ? pct(f.margin) : 'Pendiente'}</TableCell><TableCell><span className={'badge ' + (f.complete ? 'good' : 'warning')}>{f.complete ? 'Cargado' : 'Por revisar'}</span></TableCell></TableRow>)}</TableBody></Table></section><OperatingInsights location={location} period={period} counts={counts} finances={finances}/><LedgerOverview location={location} onOpen={() => showResults('ledger')}/><div className="footnote">Fuente: EERR importados y actualizaciones de Sheets cuando están activas. “Cargado” indica presencia de datos, no un cierre contable aprobado. Los meses incompletos conservan sus alertas.</div></> : view === 'orders' ? <Orders location={location} counts={counts}/> : view === 'invoices' ? <Invoices location={location} onChanged={() => { }}/> : view === 'results' ? <Results location={location} period={period} finances={finances} initialTab={resultMode}/> : view === 'people' ? <Candidates location={location}/> : <Connections onCounts={setCounts} onFinances={setFinances} onConnected={() => setConnected(true)}/>} 
 </main><Toaster richColors position="bottom-right"/></div></SidebarProvider>;
}
function Metric({ title, value, subtitle, delta, accent }: {
    title: string;
    value: string;
    subtitle: string;
    delta?: number | null;
    accent?: boolean;
}) { return <section className={'metric ' + (accent ? 'metric-accent' : '')}><span>{title}</span><strong>{value}</strong><div>{delta !== undefined && delta !== null && <span className={'delta ' + (delta >= 0 ? 'positive' : 'negative')}>{delta >= 0 ? <ArrowUpRight size={14}/> : <ArrowDownRight size={14}/>} {pct(Math.abs(delta))} vs. mes anterior</span>}<small>{subtitle}</small></div></section>; }
function Action({ index, title, text, onClick }: {
    index: string;
    title: string;
    text: string;
    onClick: () => void;
}) { return <button className="action-row" onClick={onClick}><span>{index}</span><div><strong>{title}</strong><p>{text}</p></div><ChevronRight size={17}/></button>; }
