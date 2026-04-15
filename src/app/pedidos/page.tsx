"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { PageHeader } from "@/components/layout/page-header";
import { useToast } from "@/components/ui/toast";
import { formatDate, STATUS_LABELS } from "@/lib/utils";

interface RecommendationItem {
  productId: string;
  productName: string;
  unit: string;
  stockActual: number;
  avgDailyUsage: number;
  coverageDays: number;
  safetyStock: number;
  stockTarget: number;
  suggestedQty: number;
  finalQty: number;
  roundingUnit: number;
  calculationDetail: string;
}

const DAY_NAMES: Record<number, string> = {
  0: "Domingo",
  1: "Lunes",
  2: "Martes",
  3: "Miercoles",
  4: "Jueves",
  5: "Viernes",
  6: "Sabado",
};

export default function PedidosPage() {
  const { addToast } = useToast();
  const [stores, setStores] = useState<{ id: string; name: string }[]>([]);
  const [selectedStore, setSelectedStore] = useState("");
  const [schedule, setSchedule] = useState<Record<number, { coverageDays: number; label: string }>>({});
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Recomendación actual
  const [recommendation, setRecommendation] = useState<RecommendationItem[] | null>(null);
  const [coverageInfo, setCoverageInfo] = useState<{ days: number; label: string } | null>(null);
  const [showDetail, setShowDetail] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const today = new Date();
  const dayOfWeek = today.getDay();
  const isOrderDay = Object.keys(schedule).map(Number).includes(dayOfWeek);

  useEffect(() => {
    fetch("/api/locales").then((r) => r.json()).then((s) => {
      setStores(s);
      if (s.length > 0) setSelectedStore(s[0].id);
    });
    fetch("/api/pedidos?action=schedule").then((r) => r.json()).then(setSchedule);
  }, []);

  useEffect(() => {
    if (!selectedStore) return;
    fetch(`/api/pedidos?storeId=${selectedStore}`)
      .then((r) => r.json())
      .then(setOrders);
  }, [selectedStore]);

  const generateRecommendation = async (dayOverride?: number) => {
    if (!selectedStore) {
      addToast("Selecciona un local", "error");
      return;
    }

    const day = dayOverride ?? dayOfWeek;
    setLoading(true);

    try {
      const res = await fetch(
        `/api/pedidos?action=recommend&storeId=${selectedStore}&dayOfWeek=${day}`
      );
      const data = await res.json();

      if (data.error) {
        addToast(data.error, "error");
        setLoading(false);
        return;
      }

      const items = data.items.map((item: any) => ({
        ...item,
        finalQty: item.suggestedQty,
      }));

      setRecommendation(items);
      setCoverageInfo({ days: data.coverageDays, label: data.coverageLabel });
    } catch {
      addToast("Error generando recomendacion", "error");
    }
    setLoading(false);
  };

  const handleSaveOrder = async () => {
    if (!recommendation || !coverageInfo || !selectedStore) return;

    setSaving(true);
    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + coverageInfo.days);

    try {
      const res = await fetch("/api/pedidos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId: selectedStore,
          orderDate: today.toISOString(),
          deliveryDate: deliveryDate.toISOString(),
          coverageDays: coverageInfo.days,
          status: "confirmado",
          items: recommendation.map((item) => ({
            productId: item.productId,
            stockActual: item.stockActual,
            avgDailyUsage: item.avgDailyUsage,
            coverageDays: item.coverageDays,
            safetyStock: item.safetyStock,
            stockTarget: item.stockTarget,
            suggestedQty: item.suggestedQty,
            finalQty: item.finalQty,
            roundingUnit: item.roundingUnit,
            calculationDetail: item.calculationDetail,
          })),
        }),
      });

      if (res.ok) {
        addToast("Pedido confirmado y guardado", "success");
        setRecommendation(null);
        // Recargar historial
        const data = await fetch(`/api/pedidos?storeId=${selectedStore}`).then((r) => r.json());
        setOrders(data);
      }
    } catch {
      addToast("Error guardando pedido", "error");
    }
    setSaving(false);
  };

  return (
    <div>
      <PageHeader
        title="Pedido BLANCALUNA"
        description="Generador de pedido sugerido basado en stock y consumo"
      />

      {/* Selector de local y día */}
      <div className="flex flex-wrap gap-3 mb-6">
        <Select value={selectedStore} onChange={(e) => setSelectedStore(e.target.value)}>
          {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>

        <div className="flex gap-2">
          {Object.entries(schedule).map(([day, config]) => (
            <Button
              key={day}
              variant={parseInt(day) === dayOfWeek ? "default" : "outline"}
              size="sm"
              onClick={() => generateRecommendation(parseInt(day))}
              disabled={loading}
            >
              {DAY_NAMES[parseInt(day)]} ({config.coverageDays}d)
            </Button>
          ))}
        </div>
      </div>

      {/* Estado actual */}
      {isOrderDay && !recommendation && (
        <div className="mb-6 bg-brand-50 border border-brand-200 rounded-lg p-4">
          <p className="font-semibold text-brand-800">
            Hoy es {DAY_NAMES[dayOfWeek]} — dia de pedido
          </p>
          <p className="text-sm text-brand-600 mb-3">
            Cobertura: {schedule[dayOfWeek]?.label} ({schedule[dayOfWeek]?.coverageDays} dias)
          </p>
          <Button onClick={() => generateRecommendation()} disabled={loading}>
            {loading ? "Calculando..." : "Generar pedido sugerido"}
          </Button>
        </div>
      )}

      {!isOrderDay && !recommendation && (
        <div className="mb-6 bg-gray-50 border rounded-lg p-4">
          <p className="text-gray-600">
            Hoy es {DAY_NAMES[dayOfWeek]}. Los dias de pedido configurados son:{" "}
            {Object.entries(schedule).map(([d, c]) => `${DAY_NAMES[parseInt(d)]}`).join(", ")}.
          </p>
          <p className="text-sm text-gray-400 mt-1">
            Podes generar un pedido igualmente usando los botones de arriba.
          </p>
        </div>
      )}

      {/* Recomendación generada */}
      {recommendation && coverageInfo && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Pedido sugerido — {coverageInfo.label}</span>
              <Badge variant="info">{coverageInfo.days} dias de cobertura</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-right">Stock actual</TableHead>
                  <TableHead className="text-right">Uso diario</TableHead>
                  <TableHead className="text-right">Objetivo</TableHead>
                  <TableHead className="text-right">Sugerido</TableHead>
                  <TableHead className="text-right">Pedir</TableHead>
                  <TableHead>Detalle</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recommendation.map((item) => (
                  <TableRow key={item.productId}>
                    <TableCell className="font-medium">{item.productName}</TableCell>
                    <TableCell className="text-right">{item.stockActual}</TableCell>
                    <TableCell className="text-right text-gray-500">
                      {item.avgDailyUsage.toFixed(1)}
                    </TableCell>
                    <TableCell className="text-right text-gray-500">
                      {item.stockTarget.toFixed(1)}
                    </TableCell>
                    <TableCell className="text-right">{item.suggestedQty}</TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        value={item.finalQty}
                        onChange={(e) => {
                          const newRec = recommendation.map((r) =>
                            r.productId === item.productId
                              ? { ...r, finalQty: parseFloat(e.target.value) || 0 }
                              : r
                          );
                          setRecommendation(newRec);
                        }}
                        className="w-20 text-right h-8 inline-block"
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowDetail(item.productId === showDetail ? null : item.productId)}
                      >
                        📊
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Detalle del cálculo */}
            {showDetail && (
              <div className="border-t bg-gray-50 p-4">
                {(() => {
                  const item = recommendation.find((i) => i.productId === showDetail);
                  if (!item) return null;
                  let detail: any = {};
                  try { detail = JSON.parse(item.calculationDetail); } catch {}
                  return (
                    <div className="text-sm space-y-1">
                      <p className="font-semibold">{item.productName} — Detalle del calculo</p>
                      <p><strong>Formula:</strong> {detail.formula}</p>
                      <p><strong>Stock objetivo:</strong> {detail.stock_objetivo}</p>
                      <p><strong>Stock actual:</strong> {detail.stock_actual}</p>
                      <p><strong>Diferencia:</strong> {detail.diferencia?.toFixed(1)}</p>
                      <p><strong>Antes de redondeo:</strong> {detail.antes_redondeo?.toFixed(1)}</p>
                      <p><strong>Redondeo:</strong> {detail.redondeo}</p>
                      <p><strong>Resultado:</strong> {detail.resultado}</p>
                    </div>
                  );
                })()}
              </div>
            )}
          </CardContent>

          <div className="p-4 border-t flex justify-between items-center">
            <p className="text-sm text-gray-500">
              Podes editar las cantidades antes de confirmar
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setRecommendation(null)}>
                Descartar
              </Button>
              <Button onClick={handleSaveOrder} disabled={saving}>
                {saving ? "Guardando..." : "Confirmar pedido"}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Historial de pedidos */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de pedidos</CardTitle>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <p className="text-gray-400 text-center py-4">Sin pedidos registrados</p>
          ) : (
            <div className="space-y-3">
              {orders.map((order: any) => {
                const st = STATUS_LABELS[order.status] || STATUS_LABELS.borrador;
                return (
                  <div key={order.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-medium">
                          Pedido del {formatDate(order.orderDate)}
                        </p>
                        <p className="text-sm text-gray-500">
                          {order.store?.name} — {order.coverageDays} dias de cobertura
                        </p>
                      </div>
                      <span className={`badge ${st.color}`}>{st.label}</span>
                    </div>
                    {order.items && (
                      <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                        {order.items.map((item: any) => (
                          <div key={item.id} className="bg-gray-50 rounded px-3 py-2 text-sm">
                            <p className="font-medium">{item.product?.name}</p>
                            <div className="flex justify-between text-xs text-gray-500">
                              <span>Sugerido: {item.suggestedQty}</span>
                              <span className="font-semibold text-gray-800">Final: {item.finalQty}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
