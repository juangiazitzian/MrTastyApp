"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  source: "manual" | "remitos" | "mixto";
}

interface EerrSection {
  name: string;
  kind: "income" | "expense";
  total: number;
  items: EerrItem[];
}

interface EerrData {
  month: number;
  year: number;
  storeId: string;
  sections: EerrSection[];
  salesTotal: number;
  expenseTotal: number;
  profit: number;
  profitPercentage: number;
}

function rowKey(section: string, category: string) {
  return `${section}:::${category}`;
}

export default function EerrPage() {
  const { addToast } = useToast();
  const { year, month } = getCurrentYearMonth();
  const [selectedMonth, setSelectedMonth] = useState(month);
  const [selectedYear, setSelectedYear] = useState(year);
  const [storeId, setStoreId] = useState("all");
  const [stores, setStores] = useState<{ id: string; name: string }[]>([]);
  const [data, setData] = useState<EerrData | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
        const nextDrafts: Record<string, string> = {};
        for (const section of d.sections || []) {
          for (const item of section.items || []) {
            if (item.source === "manual") {
              nextDrafts[rowKey(section.name, item.category)] = item.total ? String(item.total) : "";
            }
          }
        }
        setDrafts(nextDrafts);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [selectedMonth, selectedYear, storeId]);

  const handleExportCSV = () => {
    if (!data) return;

    let csv = "\uFEFF";
    csv += `Estado de Resultados,${getMonthLabel(selectedYear, selectedMonth)}\n`;
    csv += `Seccion,Categoria,Monto,Porcentaje sobre ventas,Origen\n`;
    for (const section of data.sections) {
      for (const item of section.items) {
        const pct = data.salesTotal > 0 ? item.total / data.salesTotal : 0;
        csv += `"${section.name}","${item.category}",${item.total.toFixed(2)},${pct.toFixed(4)},"${item.source}"\n`;
      }
      const sectionPct = data.salesTotal > 0 ? section.total / data.salesTotal : 0;
      csv += `"${section.name}","SubTotal",${section.total.toFixed(2)},${sectionPct.toFixed(4)},"subtotal"\n`;
    }
    csv += `\n"RESULTADO","Ventas",${data.salesTotal.toFixed(2)},1,\n`;
    csv += `"RESULTADO","Gastos",${data.expenseTotal.toFixed(2)},${(data.salesTotal > 0 ? data.expenseTotal / data.salesTotal : 0).toFixed(4)},\n`;
    csv += `"RESULTADO","Utilidad",${data.profit.toFixed(2)},${data.profitPercentage.toFixed(4)},\n`;

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `EERR_${selectedYear}_${String(selectedMonth).padStart(2, "0")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    addToast("CSV descargado", "success");
  };

  const handleSaveEntries = async () => {
    if (!data) return;

    const entries = data.sections.flatMap((section) =>
      section.items
        .filter((item) => item.source === "manual")
        .map((item) => ({
          year: selectedYear,
          month: selectedMonth,
          storeId,
          section: section.name,
          category: item.category,
          amount: Number(drafts[rowKey(section.name, item.category)] || 0),
        }))
    );

    setSaving(true);
    try {
      const res = await fetch("/api/eerr", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "entries", entries }),
      });

      if (res.ok) {
        addToast("EERR guardado", "success");
        const params = new URLSearchParams({
          month: selectedMonth.toString(),
          year: selectedYear.toString(),
        });
        if (storeId !== "all") params.set("storeId", storeId);
        const nextData = await fetch(`/api/eerr?${params}`).then((r) => r.json());
        setData(nextData);
      } else {
        addToast("No se pudo guardar el EERR", "error");
      }
    } catch {
      addToast("Error guardando EERR", "error");
    }
    setSaving(false);
  };

  return (
    <div>
      <PageHeader
        title="EERR completo"
        description="Estado de Resultados mensual con remitos y cargas manuales"
        icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        }
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportCSV} disabled={!data}>
              Exportar CSV
            </Button>
            <Button onClick={handleSaveEntries} disabled={saving || !data}>
              {saving ? "Guardando..." : "Guardar EERR"}
            </Button>
          </div>
        }
      />

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

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-white/40 uppercase tracking-wide font-medium">Ventas</p>
            <p className="text-xl font-bold text-emerald-400 mt-1">{formatCurrency(data?.salesTotal || 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-white/40 uppercase tracking-wide font-medium">Gastos</p>
            <p className="text-xl font-bold text-brand-400 mt-1">{formatCurrency(data?.expenseTotal || 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-white/40 uppercase tracking-wide font-medium">Utilidad</p>
            <p className={`text-xl font-bold mt-1 ${(data?.profit || 0) >= 0 ? "text-gold-400" : "text-red-400"}`}>
              {formatCurrency(data?.profit || 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-white/40 uppercase tracking-wide font-medium">Porcentaje</p>
            <p className={`text-xl font-bold mt-1 ${(data?.profitPercentage || 0) >= 0 ? "text-gold-400" : "text-red-400"}`}>
              {((data?.profitPercentage || 0) * 100).toFixed(1)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <Card>
          <CardContent>
            <p className="p-8 text-center text-white/30">Cargando...</p>
          </CardContent>
        </Card>
      ) : !data?.sections?.length ? (
        <Card>
          <CardContent>
            <p className="p-8 text-center text-white/30">Sin datos para este periodo.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          {data.sections.map((section) => (
            <Card key={section.name}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{section.name}</CardTitle>
                  <span className="text-lg font-bold text-brand-400">{formatCurrency(section.total)}</span>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Concepto</TableHead>
                      <TableHead>Origen</TableHead>
                      <TableHead className="text-center">Remitos</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                      <TableHead className="text-right">% ventas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {section.items.map((item) => {
                      const key = rowKey(section.name, item.category);
                      const pct = data.salesTotal > 0 ? (item.total / data.salesTotal) * 100 : 0;
                      const isManual = item.source === "manual";

                      return (
                        <TableRow key={key}>
                          <TableCell className="font-medium text-white/85">
                            {item.category}
                            {item.suppliers.length > 0 && (
                              <p className="text-xs text-white/30 mt-0.5">{item.suppliers.join(", ")}</p>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className={`badge ${isManual ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800"}`}>
                              {isManual ? "Manual" : item.source === "mixto" ? "Mixto" : "Remitos"}
                            </span>
                          </TableCell>
                          <TableCell className="text-center text-white/50">{item.count || "-"}</TableCell>
                          <TableCell className="text-right">
                            {isManual ? (
                              <Input
                                type="number"
                                step="0.01"
                                value={drafts[key] || ""}
                                onChange={(e) => setDrafts((current) => ({ ...current, [key]: e.target.value }))}
                                className="w-32 text-right inline-block"
                                placeholder="0.00"
                              />
                            ) : (
                              <span className="font-bold text-brand-400">{formatCurrency(item.total)}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right text-white/40">{pct.toFixed(1)}%</TableCell>
                        </TableRow>
                      );
                    })}
                    <TableRow>
                      <TableCell colSpan={3} className="font-bold text-white uppercase tracking-wide text-xs">
                        SubTotal
                      </TableCell>
                      <TableCell className="text-right text-lg font-bold text-brand-400">
                        {formatCurrency(section.total)}
                      </TableCell>
                      <TableCell className="text-right text-white/40 text-xs">
                        {data.salesTotal > 0 ? ((section.total / data.salesTotal) * 100).toFixed(1) : "0.0"}%
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="mt-6 rounded-xl border border-sky-500/20 bg-sky-500/8 p-4 text-sm text-sky-300/80">
        <p className="font-semibold text-sky-300 mb-1">Uso</p>
        <p className="text-sky-400/70">
          Mercaderia se completa desde remitos. Ventas, sueldos, gastos, impuestos y mantenimiento se cargan manualmente por mes y por local/consolidado.
        </p>
      </div>
    </div>
  );
}
