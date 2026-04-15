"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";
import { formatCurrency, getMonthLabel, getCurrentYearMonth } from "@/lib/utils";

interface SummaryData {
  grandTotal: number;
  totalRemitos: number;
  bySupplier: {
    supplierName: string;
    total: number;
    count: number;
  }[];
  byStore: {
    storeName: string;
    total: number;
    count: number;
  }[];
}

export default function DashboardPage() {
  const { year, month } = getCurrentYearMonth();
  const [selectedMonth, setSelectedMonth] = useState(month);
  const [selectedYear, setSelectedYear] = useState(year);
  const [storeId, setStoreId] = useState("all");
  const [stores, setStores] = useState<{ id: string; name: string }[]>([]);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/locales")
      .then((r) => r.json())
      .then(setStores);
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
      .then((data) => {
        setSummary(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [selectedMonth, selectedYear, storeId]);

  const dayOfWeek = new Date().getDay();
  const isOrderDay = [1, 3, 5].includes(dayOfWeek);
  const dayNames: Record<number, string> = {
    1: "Lunes",
    3: "Miercoles",
    5: "Viernes",
  };

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description={`Resumen de ${getMonthLabel(selectedYear, selectedMonth)}`}
      />

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-6">
        <Select
          value={selectedMonth.toString()}
          onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
        >
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              {getMonthLabel(selectedYear, i + 1)}
            </option>
          ))}
        </Select>
        <Select
          value={selectedYear.toString()}
          onChange={(e) => setSelectedYear(parseInt(e.target.value))}
        >
          {[year - 1, year, year + 1].map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </Select>
        <Select value={storeId} onChange={(e) => setStoreId(e.target.value)}>
          <option value="all">Todos los locales</option>
          {stores.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </Select>
      </div>

      {/* Acceso rápido a pedido BLANCALUNA */}
      {isOrderDay && (
        <div className="mb-6 bg-brand-50 border border-brand-200 rounded-lg p-4 flex items-center justify-between">
          <div>
            <p className="font-semibold text-brand-800">
              Hoy es {dayNames[dayOfWeek]} — dia de pedido BLANCALUNA
            </p>
            <p className="text-sm text-brand-600">
              Genera la sugerencia de pedido para tu local
            </p>
          </div>
          <Link href="/pedidos">
            <Button>Ir a Pedidos</Button>
          </Link>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total del mes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {loading ? "..." : formatCurrency(summary?.grandTotal || 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Remitos cargados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {loading ? "..." : summary?.totalRemitos || 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Proveedores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {loading ? "..." : summary?.bySupplier?.length || 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Locales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {loading ? "..." : summary?.byStore?.length || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Totales por proveedor */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Totales por proveedor</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-gray-400">Cargando...</p>
            ) : !summary?.bySupplier?.length ? (
              <div className="text-center py-8">
                <p className="text-gray-400 mb-3">Sin remitos este mes</p>
                <Link href="/remitos">
                  <Button variant="outline" size="sm">Cargar remito</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {summary.bySupplier.map((s) => (
                  <div key={s.supplierName} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{s.supplierName}</p>
                      <p className="text-xs text-gray-400">{s.count} remito{s.count > 1 ? "s" : ""}</p>
                    </div>
                    <p className="font-semibold">{formatCurrency(s.total)}</p>
                  </div>
                ))}
                <div className="border-t pt-3 flex justify-between font-bold">
                  <span>Total</span>
                  <span>{formatCurrency(summary.grandTotal)}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Totales por local</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-gray-400">Cargando...</p>
            ) : !summary?.byStore?.length ? (
              <p className="text-gray-400 text-center py-8">Sin datos</p>
            ) : (
              <div className="space-y-3">
                {summary.byStore.map((s) => (
                  <div key={s.storeName} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{s.storeName}</p>
                      <p className="text-xs text-gray-400">{s.count} remito{s.count > 1 ? "s" : ""}</p>
                    </div>
                    <p className="font-semibold">{formatCurrency(s.total)}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Links rápidos */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
        <Link href="/remitos" className="block">
          <Card className="hover:border-brand-300 transition-colors cursor-pointer text-center p-4">
            <p className="text-2xl mb-1">📄</p>
            <p className="text-sm font-medium">Remitos</p>
          </Card>
        </Link>
        <Link href="/eerr" className="block">
          <Card className="hover:border-brand-300 transition-colors cursor-pointer text-center p-4">
            <p className="text-2xl mb-1">📊</p>
            <p className="text-sm font-medium">EERR</p>
          </Card>
        </Link>
        <Link href="/stock" className="block">
          <Card className="hover:border-brand-300 transition-colors cursor-pointer text-center p-4">
            <p className="text-2xl mb-1">📦</p>
            <p className="text-sm font-medium">Stock</p>
          </Card>
        </Link>
        <Link href="/pedidos" className="block">
          <Card className="hover:border-brand-300 transition-colors cursor-pointer text-center p-4">
            <p className="text-2xl mb-1">🛒</p>
            <p className="text-sm font-medium">Pedido BL</p>
          </Card>
        </Link>
      </div>
    </div>
  );
}
