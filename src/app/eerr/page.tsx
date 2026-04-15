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
        title="EERR - Mercaderia"
        description="Resumen listo para completar el Estado de Resultados"
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
          <CardTitle className="flex items-center justify-between">
            <span>MERCADERIA — {getMonthLabel(selectedYear, selectedMonth)}</span>
            {data && (
              <span className="text-lg font-bold text-brand-600">
                {formatCurrency(data.grandTotal)}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="p-6 text-center text-gray-400">Cargando...</p>
          ) : !data?.items?.length ? (
            <p className="p-8 text-center text-gray-400">
              Sin datos de remitos para este periodo. Carga remitos primero.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Categoria EERR</TableHead>
                  <TableHead>Proveedores</TableHead>
                  <TableHead className="text-center">Remitos</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">% del total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((item) => (
                  <TableRow key={item.category}>
                    <TableCell className="font-medium">{item.category}</TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {item.suppliers.join(", ")}
                    </TableCell>
                    <TableCell className="text-center">{item.count}</TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(item.total)}
                    </TableCell>
                    <TableCell className="text-right text-sm text-gray-500">
                      {data.grandTotal > 0
                        ? ((item.total / data.grandTotal) * 100).toFixed(1) + "%"
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-gray-50 font-bold">
                  <TableCell colSpan={3}>TOTAL MERCADERIA</TableCell>
                  <TableCell className="text-right text-lg">
                    {formatCurrency(data.grandTotal)}
                  </TableCell>
                  <TableCell className="text-right">100%</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Info */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
        <p className="font-medium mb-1">Como usar esta vista</p>
        <p>
          Los totales se agrupan automaticamente segun el mapeo proveedor → categoria EERR.
          Podes ajustar los mapeos desde Configuracion → Proveedores.
          Usa &ldquo;Exportar para EERR&rdquo; para descargar un CSV listo para copiar a tu planilla.
        </p>
      </div>
    </div>
  );
}
