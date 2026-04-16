"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";
import { LineChart } from "@/components/charts/line-chart";
import { BarChart } from "@/components/charts/bar-chart";
import { formatCurrency, getCurrentYearMonth } from "@/lib/utils";

interface SummaryData {
  grandTotal: number;
  totalRemitos: number;
  bySupplier: { supplierName: string; total: number; count: number }[];
  byStore: { storeName: string; total: number; count: number }[];
}

interface TrendPoint {
  key: string;
  label: string;
  value: number;
}

const monthNames = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const quickLinks = [
  {
    href: "/remitos",
    label: "Remitos",
    desc: "Cargar y revisar",
    color: "from-brand-500/20 to-brand-500/5",
    border: "border-brand-500/20",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    href: "/eerr",
    label: "EERR",
    desc: "Resumen mensual",
    color: "from-gold-500/20 to-gold-500/5",
    border: "border-gold-500/20",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    href: "/stock",
    label: "Stock",
    desc: "Inventario actual",
    color: "from-sky-500/20 to-sky-500/5",
    border: "border-sky-500/20",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
  },
  {
    href: "/pedidos",
    label: "Pedido BL",
    desc: "Sugerencia Blancaluna",
    color: "from-emerald-500/20 to-emerald-500/5",
    border: "border-emerald-500/20",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
      </svg>
    ),
  },
];

const SUPPLIER_COLORS = [
  "hsl(25, 90%, 55%)",
  "hsl(45, 90%, 55%)",
  "hsl(200, 80%, 55%)",
  "hsl(140, 70%, 50%)",
  "hsl(280, 70%, 60%)",
  "hsl(0, 70%, 60%)",
  "hsl(170, 70%, 50%)",
  "hsl(320, 70%, 60%)",
];

export default function DashboardPage() {
  const { year, month } = getCurrentYearMonth();
  const [selectedMonth, setSelectedMonth] = useState(month);
  const [selectedYear, setSelectedYear] = useState(year);
  const [storeId, setStoreId] = useState("all");
  const [stores, setStores] = useState<{ id: string; name: string }[]>([]);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [trendLoading, setTrendLoading] = useState(true);

  useEffect(() => {
    fetch("/api/locales").then((r) => r.json()).then(setStores);
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({
      month: selectedMonth.toString(),
      year: selectedYear.toString(),
    });
    if (storeId !== "all") params.set("storeId", storeId);
    fetch(`/api/remitos/summary?${params}`)
      .then((r) => r.json())
      .then((data) => { setSummary(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [selectedMonth, selectedYear, storeId]);

  useEffect(() => {
    setTrendLoading(true);
    const params = new URLSearchParams({ months: "12" });
    if (storeId !== "all") params.set("storeId", storeId);
    fetch(`/api/remitos/trend?${params}`)
      .then((r) => r.json())
      .then((data) => { setTrend(data.trend || []); setTrendLoading(false); })
      .catch(() => setTrendLoading(false));
  }, [storeId]);

  const dayOfWeek = new Date().getDay();
  const isOrderDay = [1, 3, 5].includes(dayOfWeek);
  const dayNames: Record<number, string> = { 1: "Lunes", 3: "Miércoles", 5: "Viernes" };

  const grandTotalPercent = summary?.byStore?.length
    ? Math.max(...summary.byStore.map((s) => s.total))
    : 0;

  const supplierBarData = (summary?.bySupplier ?? []).map((s, i) => ({
    label: s.supplierName,
    value: s.total,
    color: SUPPLIER_COLORS[i % SUPPLIER_COLORS.length],
  }));

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description={`${monthNames[selectedMonth - 1]} ${selectedYear}`}
        icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <Select
              value={selectedMonth.toString()}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="w-36"
            >
              {monthNames.map((name, i) => (
                <option key={i + 1} value={i + 1}>{name}</option>
              ))}
            </Select>
            <Select
              value={selectedYear.toString()}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="w-24"
            >
              {[year - 1, year, year + 1].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </Select>
            <Select
              value={storeId}
              onChange={(e) => setStoreId(e.target.value)}
              className="w-44"
            >
              <option value="all">Todos los locales</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </Select>
          </div>
        }
      />

      {/* Order day banner */}
      {isOrderDay && (
        <div className="mb-6 rounded-xl border border-brand-500/30 bg-brand-500/10 p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center">
              <span className="w-2 h-2 rounded-full bg-brand-400 animate-pulse inline-block" />
            </div>
            <div>
              <p className="font-semibold text-brand-300 text-sm">
                Hoy es {dayNames[dayOfWeek]} — día de pedido BLANCALUNA
              </p>
              <p className="text-xs text-brand-400/70">
                Generá la sugerencia de pedido para tus locales
              </p>
            </div>
          </div>
          <Link href="/pedidos">
            <Button size="sm" className="whitespace-nowrap">Ir a Pedidos →</Button>
          </Link>
        </div>
      )}

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total del mes", value: loading ? null : formatCurrency(summary?.grandTotal || 0), icon: "💰", color: "text-brand-400" },
          { label: "Remitos cargados", value: loading ? null : String(summary?.totalRemitos || 0), icon: "📄", color: "text-gold-400" },
          { label: "Proveedores", value: loading ? null : String(summary?.bySupplier?.length || 0), icon: "🏭", color: "text-sky-400" },
          { label: "Locales", value: loading ? null : String(summary?.byStore?.length || 0), icon: "📍", color: "text-emerald-400" },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-xl border p-5"
            style={{ background: "hsl(25, 10%, 10%)", borderColor: "hsl(25, 8%, 17%)" }}
          >
            <p className="text-xs text-white/40 font-medium uppercase tracking-wide mb-3">
              {kpi.label}
            </p>
            {loading ? (
              <div className="h-7 w-24 rounded bg-white/5 animate-pulse" />
            ) : (
              <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
            )}
          </div>
        ))}
      </div>

      {/* ── CHART: Tendencia 12 meses ── */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Evolución de compras — últimos 12 meses</CardTitle>
            <span className="text-xs text-white/30">Mercadería total (ARS)</span>
          </div>
        </CardHeader>
        <CardContent>
          {trendLoading ? (
            <div className="h-44 rounded-lg bg-white/3 animate-pulse" />
          ) : (
            <LineChart
              data={trend}
              height={180}
              formatValue={(v) =>
                v >= 1_000_000
                  ? `$${(v / 1_000_000).toFixed(1)}M`
                  : v >= 1_000
                  ? `$${(v / 1_000).toFixed(0)}k`
                  : `$${v}`
              }
              color="hsl(25, 90%, 55%)"
              showArea
            />
          )}
        </CardContent>
      </Card>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
        {/* Totales por proveedor — con gráfico */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Totales por proveedor</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex justify-between items-center">
                    <div className="h-4 w-32 rounded bg-white/5 animate-pulse" />
                    <div className="h-4 w-20 rounded bg-white/5 animate-pulse" />
                  </div>
                ))}
              </div>
            ) : !summary?.bySupplier?.length ? (
              <div className="text-center py-10">
                <p className="text-4xl mb-3">📄</p>
                <p className="text-white/40 text-sm mb-4">Sin remitos este mes</p>
                <Link href="/remitos">
                  <Button variant="outline" size="sm">Cargar primer remito</Button>
                </Link>
              </div>
            ) : (
              <>
                {/* Gráfico de barras horizontal */}
                <BarChart
                  data={supplierBarData}
                  height={Math.max(120, supplierBarData.length * 36 + 40)}
                  horizontal
                  formatValue={(v) =>
                    v >= 1_000_000
                      ? `$${(v / 1_000_000).toFixed(1)}M`
                      : v >= 1_000
                      ? `$${(v / 1_000).toFixed(0)}k`
                      : `$${v}`
                  }
                  className="mb-4"
                />
                {/* Lista detallada */}
                <div className="space-y-2 border-t pt-3" style={{ borderColor: "hsl(25, 8%, 17%)" }}>
                  {summary.bySupplier.map((s, i) => (
                    <div key={s.supplierName} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ background: SUPPLIER_COLORS[i % SUPPLIER_COLORS.length] }}
                        />
                        <p className="text-sm text-white/70">{s.supplierName}</p>
                        <span className="text-xs text-white/30">{s.count} rem.</span>
                      </div>
                      <p className="text-sm font-bold" style={{ color: SUPPLIER_COLORS[i % SUPPLIER_COLORS.length] }}>
                        {formatCurrency(s.total)}
                      </p>
                    </div>
                  ))}
                  <div className="border-t pt-2 flex justify-between font-bold text-white" style={{ borderColor: "hsl(25, 8%, 17%)" }}>
                    <span className="text-sm">Total</span>
                    <span className="text-brand-400">{formatCurrency(summary.grandTotal)}</span>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Totales por local */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Por local</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <div key={i} className="h-16 rounded-lg bg-white/5 animate-pulse" />
                ))}
              </div>
            ) : !summary?.byStore?.length ? (
              <p className="text-white/30 text-sm text-center py-8">Sin datos</p>
            ) : (
              <>
                <BarChart
                  data={(summary?.byStore ?? []).map((s, i) => ({
                    label: s.storeName.replace("San Miguel ", ""),
                    value: s.total,
                    color: ["hsl(25, 90%, 55%)", "hsl(200, 80%, 55%)"][i % 2],
                  }))}
                  height={120}
                  formatValue={(v) =>
                    v >= 1_000_000
                      ? `$${(v / 1_000_000).toFixed(1)}M`
                      : v >= 1_000
                      ? `$${(v / 1_000).toFixed(0)}k`
                      : `$${v}`
                  }
                  className="mb-4"
                />
                <div className="space-y-3">
                  {summary.byStore.map((s, idx) => {
                    const pct = grandTotalPercent > 0 ? (s.total / grandTotalPercent) * 100 : 0;
                    const colors = ["from-brand-500 to-gold-500", "from-sky-500 to-sky-400"];
                    return (
                      <div
                        key={s.storeName}
                        className="p-3 rounded-lg"
                        style={{ background: "hsl(25, 8%, 13%)", border: "1px solid hsl(25, 8%, 20%)" }}
                      >
                        <div className="flex justify-between mb-2">
                          <p className="text-sm font-medium text-white/70 truncate pr-2">{s.storeName}</p>
                          <Badge variant="default" className="shrink-0">{s.count} rem.</Badge>
                        </div>
                        <p className="text-lg font-bold text-white mb-2">{formatCurrency(s.total)}</p>
                        <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${colors[idx % colors.length]}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick access */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-white/25 mb-3">
          Acceso rápido
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {quickLinks.map((link) => (
            <Link key={link.href} href={link.href} className="block group">
              <div
                className={`rounded-xl border p-4 bg-gradient-to-br ${link.color} ${link.border} transition-all duration-150 group-hover:scale-[1.02] group-hover:shadow-lg`}
              >
                <div className="text-white/60 mb-3 group-hover:text-white/80 transition-colors">
                  {link.icon}
                </div>
                <p className="font-semibold text-white text-sm">{link.label}</p>
                <p className="text-xs text-white/40 mt-0.5">{link.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
