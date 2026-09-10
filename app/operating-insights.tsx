"use client";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Choice } from './workflows';
import { Count, forecast, skus, Sku } from '@/lib/domain';
import type { Finance } from '@/lib/imports';
const names: Record<string, string> = { balbin: 'Balbín', peron: 'Perón' };
const format = (n: number) => new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(n);
const costs = ['Mercadería', 'Sueldos', 'Gastos del local', 'Impuestos y comisiones', 'Mantenimiento'];
const colors = ['#F28E19', '#252525', '#94724e', '#bec1c5', '#ead5b7'];
export function OperatingInsights({ location, period, counts, finances }: {
    location: string;
    period: string;
    counts: Count[];
    finances: Finance[];
}) {
    const reducedMotion = useReducedMotion();
    const [sku, setSku] = useState<Sku>('pan');
    const records = finances.filter(f => f.period === period && (location === 'all' || location === f.location));
    const expenseData = records.map(f => ({ local: names[f.location], ...Object.fromEntries(f.groups.map(g => [g.label, g.value])) }));
    const forecasts = Object.fromEntries(['balbin', 'peron'].map(loc => [loc, forecast(counts, loc, sku, 7)]));
    const weekly = [1, 2, 3, 4, 5, 6, 0].map((d, i) => ({ day: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'][i], ...Object.fromEntries(['balbin', 'peron'].map(loc => [loc, forecasts[loc].weekday[d].n >= 2 ? forecasts[loc].weekday[d].mean : null])) }));
    return <div className="insights-grid"><section className="panel"><div className="panel-heading"><div><h2>En qué se va el gasto</h2><p>Gastos registrados por categoría · {period}</p></div></div><div className="cost-chart"><ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 500, height: 260 }}><BarChart data={expenseData} layout="vertical" margin={{ top: 5, right: 20, bottom: 10, left: 0 }}><CartesianGrid horizontal={false} stroke="#eeeeee"/><XAxis type="number" axisLine={false} tickLine={false} tickFormatter={v => format(v / 1e6) + ' M'} tick={{ fontSize: 12, fill: '#888' }}/><YAxis dataKey="local" type="category" axisLine={false} tickLine={false} width={65} tick={{ fontSize: 13, fill: '#555' }}/><Tooltip formatter={v => '$ ' + format(Number(v))}/><Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 12, paddingTop: 16 }}/>{costs.map((g, i) => <Bar isAnimationActive={!reducedMotion} key={g} dataKey={g} fill={colors[i]} stackId="expense" maxBarSize={33} animationDuration={650}/>)}</BarChart></ResponsiveContainer></div><p className="chart-note">Mercadería refleja compras de las planillas. El cierre puede requerir ajustes de inventario.</p></section><section className="panel"><div className="panel-heading"><div><h2>El ritmo de la semana</h2><p>Consumo medio por día · últimas 8 semanas</p></div><Choice label="Insumo del gráfico" value={sku} onChange={v => setSku(v as Sku)} options={Object.fromEntries(skus.map(s => [s.id, s.label]))}/></div><div className="cost-chart"><ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 500, height: 260 }}><BarChart data={weekly} margin={{ top: 5, right: 18, bottom: 0, left: 0 }}><CartesianGrid vertical={false} stroke="#eeeeee"/><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }}/><YAxis axisLine={false} tickLine={false} width={45} tick={{ fontSize: 12, fill: '#888' }}/><Tooltip formatter={v => format(Number(v)) + ' ' + skus.find(s => s.id === sku)!.unit}/><Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 12, paddingTop: 16 }}/>{['balbin', 'peron'].filter(l => location === 'all' || l === location).map((l, i) => <Bar isAnimationActive={!reducedMotion} key={l} name={names[l]} dataKey={l} fill={l === 'balbin' ? '#F28E19' : '#252525'} radius={[3, 3, 0, 0]} maxBarSize={19} animationDuration={650}/>)}</BarChart></ResponsiveContainer></div><p className="chart-note">{['balbin', 'peron'].filter(l => location === 'all' || l === location).map(l => names[l] + ': ' + forecasts[l].observations + '/56 días válidos').join(' · ')}. Los faltantes no cuentan como cero.</p></section></div>;
}
