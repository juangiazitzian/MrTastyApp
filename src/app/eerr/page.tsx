"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { PageHeader } from "@/components/layout/page-header";
import { useToast } from "@/components/ui/toast";
import { formatCurrency, getCurrentYearMonth, getMonthLabel } from "@/lib/utils";

interface EerrItem {
  category: string;
  section: string;
  total: number;
  count: number;
  suppliers: string[];
}

interface EerrData {
  month: number;
  year: number;
  grandTotal: number;
  items: EerrItem[];
}

export default function EerrPage() {
  const { addToast } = useToast();
  const { year, month } = getCurrentYearMonth();
  const [selectedMonth, setSelectedMonth] = useState(month);
  const [selectedYear, setSelectedYear] = useState(year);
  const [storeId, setStoreId] = useState("all");
  const [stores, setStores] = useState<{ id: string; name: string }[]>([]);
  const [data, setData] = useState<EerrData | null>(null);
  const [loading, setLoading] = useState(true);

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

    fetch(`/api/eerr?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [selectedMonth, selectedYear, storeId]);

  const handleExportCSV = () => {
    const params = new URLSearchParams({
      month: selectedMonth.toString(),
      year: selectedYear.toString(),
      format: "csv",
    });
    if (storeId !== "all") params.set("storeId", storeId);
    window.open(`/api/eerr/export?${params}`, "_blank");
    addToast("Exportando CSV...", "info");
  };

  const handleExportJSON = async () => {
    const params = new URLSearchParams({
      month: selectedMonth.toString(),
      year: selectedYear.toString(),
      format: "json",
    });
    if (storeId !== "all") params.set("storeId", storeId);

    const res = await fetch(`/api/eerr/export?${params}`);
    const jsonData = await res.json();

    // Generar Excel-like CSV con BOM para que Excel lo abra bien
    let csv = "\uFEFF"; // BOM
    csv += `Estado de Resultados - ${jsonData.monthLabel} ${jsonData.year}\n`;
    csv += `Seccion: MERCADERIA\n\n`;
    csv += `Categoria,Monto\n`;
    for (const item of jsonData.eerrData) {
      csv += `"${item.category}",${item.total.toFixed(2)}\n`;
    }
    const total = jsonData.eerrData.reduce((s: number, i: any) => s + i.total, 0);
    csv += `\nTOTAL MERCADERIA,${total.toFixed(2)}\n`;

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `EERR_MERCADERIA_${jsonData.monthLabel}_${jsonData.year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    addToast("Archivo descargado", "success");
  };

  return (
    <div>
      <PageHeader
        title="EERR — Mercadería"
        description="Resumen listo para completar el Estado de Resultados"
        icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        }
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportCSV}>
              Exportar CSV
            </Button>
            <Button onClick={handleExportJSON}>
              Exportar para EERR
            </Button>
          </div>
        }
      />

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-6">
        <Select value={selectedMonth.toString()} onChange={(e) => setSelectedMonth(parseInt(e.target.value))}>
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i + 1} value={i + 1}>{getMonthLabel(selectedYear, i + 1)}</option>
          ))}
        </Select>
        <Select value={selectedYear.toString()} onChange={(e) => setSelectedYear(parseInt(e.target.value))}>
          {[year - 1, year, year + 1].map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </Select>
        <Select value={storeId} onChange={(e) => setStoreId(e.target.value)}>
          <option value="all">Consolidado (todos los locales)</option>
          {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
      </div>

      {/* Vista EERR */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>MERCADERIA — {getMonthLabel(selectedYear, selectedMonth)}</CardTitle>
            {data && (
              <span className="text-lg font-bold text-brand-400">
                {formatCurrency(data.grandTotal)}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="p-8 text-center text-white/30">Cargando...</p>
          ) : !data?.items?.length ? (
            <div className="p-10 text-center">
              <p className="text-4xl mb-3">📊</p>
              <p className="text-white/40 text-sm">
                Sin datos para este periodo. Cargá remitos primero.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categoría EERR</TableHead>
                  <TableHead>Proveedores</TableHead>
                  <TableHead className="text-center">Remitos</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((item) => {
                  const pct = data.grandTotal > 0 ? (item.total / data.grandTotal) * 100 : 0;
                  return (
                    <TableRow key={item.category}>
                      <TableCell className="font-semibold text-white/90">{item.category}</TableCell>
                      <TableCell className="text-sm text-white/40">
                        {item.suppliers.join(", ")}
                      </TableCell>
                      <TableCell className="text-center text-white/50">{item.count}</TableCell>
                      <TableCell className="text-right font-bold text-brand-400">
                        {formatCurrency(item.total)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-1 rounded-full bg-white/5 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-brand-500 to-gold-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs text-white/40 w-10 text-right">
                            {pct.toFixed(1)}%
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                <TableRow>
                  <TableCell colSpan={3} className="font-bold text-white uppercase tracking-wide text-xs">
                    Total Mercadería
                  </TableCell>
                  <TableCell className="text-right text-lg font-bold text-brand-400">
                    {formatCurrency(data.grandTotal)}
                  </TableCell>
                  <TableCell className="text-right text-white/40 text-xs">100%</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Info */}
      <div className="mt-6 rounded-xl border border-sky-500/20 bg-sky-500/8 p-4 text-sm text-sky-300/80">
        <p className="font-semibold text-sky-300 mb-1">💡 Cómo usar esta vista</p>
        <p className="text-sky-400/70">
          Los totales se agrupan automáticamente según el mapeo proveedor → categoría EERR.
          Podés ajustar los mapeos desde Configuración → Proveedores.
          Usá &ldquo;Exportar para EERR&rdquo; para descargar un CSV listo para copiar a tu planilla.
        </p>
      </div>
    </div>
  );
}
