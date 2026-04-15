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
        icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
          </svg>
        }
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
        <div className="mb-6 rounded-xl border border-brand-500/30 bg-brand-500/10 p-5 flex items-center justify-between gap-4">
          <div>
            <p className="font-bold text-brand-300">
              Hoy es {DAY_NAMES[dayOfWeek]} — día de pedido
            </p>
            <p className="text-sm text-brand-400/70 mt-0.5">
              Cobertura: {schedule[dayOfWeek]?.label} ({schedule[dayOfWeek]?.coverageDays} días)
            </p>
          </div>
          <Button onClick={() => generateRecommendation()} disabled={loading} className="whitespace-nowrap">
            {loading ? "Calculando..." : "Generar pedido →"}
          </Button>
        </div>
      )}

      {!isOrderDay && !recommendation && (
        <div
          className="mb-6 rounded-xl border p-4"
          style={{ borderColor: "hsl(25, 8%, 18%)", background: "hsl(25, 10%, 10%)" }}
        >
          <p className="text-white/60 text-sm">
            Hoy es <span className="text-white/80 font-medium">{DAY_NAMES[dayOfWeek]}</span>.
            Los días de pedido configurados son:{" "}
            <span className="text-brand-400 font-medium">
              {Object.entries(schedule).map(([d]) => DAY_NAMES[parseInt(d)]).join(", ")}
            </span>
          </p>
          <p className="text-xs text-white/30 mt-1">
            Podés generar un pedido igual usando los botones de arriba.
          </p>
        </div>
      )}

      {/* Recomendación generada */}
      {recommendation && coverageInfo && (
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Pedido sugerido — {coverageInfo.label}</CardTitle>
              <Badge variant="info">{coverageInfo.days} días de cobertura</Badge>
            </div>
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
                    <TableCell className="text-right text-white/40">
                      {item.avgDailyUsage.toFixed(1)}
                    </TableCell>
                    <TableCell className="text-right text-white/40">
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
              <div
                className="border-t p-5"
                style={{ borderColor: "hsl(25, 8%, 18%)", background: "hsl(25, 8%, 8%)" }}
              >
                {(() => {
                  const item = recommendation.find((i) => i.productId === showDetail);
                  if (!item) return null;
                  let detail: any = {};
                  try { detail = JSON.parse(item.calculationDetail); } catch {}
                  return (
                    <div className="text-sm">
                      <p className="font-bold text-white mb-3">
                        {item.productName} — Detalle del cálculo
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                          { label: "Stock objetivo", val: detail.stock_objetivo },
                          { label: "Stock actual",   val: detail.stock_actual },
                          { label: "Diferencia",     val: detail.diferencia?.toFixed(1) },
                          { label: "Resultado",      val: detail.resultado },
                        ].map((row) => (
                          <div
                            key={row.label}
                            className="p-3 rounded-lg"
                            style={{ background: "hsl(25, 10%, 13%)", border: "1px solid hsl(25, 8%, 20%)" }}
                          >
                            <p className="text-xs text-white/40 uppercase tracking-wide mb-1">{row.label}</p>
                            <p className="text-lg font-bold text-brand-400">{row.val ?? "—"}</p>
                          </div>
                        ))}
                      </div>
                      {detail.formula && (
                        <p className="mt-3 text-xs text-white/30 font-mono bg-white/5 rounded px-3 py-2">
                          {detail.formula}
                        </p>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </CardContent>

          <div
            className="p-5 border-t flex justify-between items-center"
            style={{ borderColor: "hsl(25, 8%, 18%)" }}
          >
            <p className="text-sm text-white/40">
              Podés editar las cantidades antes de confirmar
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setRecommendation(null)}>
                Descartar
              </Button>
              <Button onClick={handleSaveOrder} disabled={saving}>
                {saving ? "Guardando..." : "✓ Confirmar pedido"}
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
            <div className="text-center py-8">
              <p className="text-3xl mb-3">🛒</p>
              <p className="text-white/40 text-sm">Sin pedidos registrados todavía</p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order: any) => {
                const st = STATUS_LABELS[order.status] || STATUS_LABELS.borrador;
                return (
                  <div
                    key={order.id}
                    className="rounded-xl p-4"
                    style={{ border: "1px solid hsl(25, 8%, 18%)", background: "hsl(25, 8%, 12%)" }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-semibold text-white/80">
                          Pedido del {formatDate(order.orderDate)}
                        </p>
                        <p className="text-xs text-white/40 mt-0.5">
                          {order.store?.name} · {order.coverageDays} días de cobertura
                        </p>
                      </div>
                      <span className={`badge ${st.color}`}>{st.label}</span>
                    </div>
                    {order.items && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                        {order.items.map((item: any) => (
                          <div
                            key={item.id}
                            className="rounded-lg px-3 py-2 text-sm"
                            style={{ background: "hsl(25, 8%, 9%)", border: "1px solid hsl(25, 8%, 16%)" }}
                          >
                            <p className="font-medium text-white/70 text-xs truncate mb-1">{item.product?.name}</p>
                            <div className="flex justify-between text-xs">
                              <span className="text-white/30">Sug: {item.suggestedQty}</span>
                              <span className="font-bold text-brand-400">→ {item.finalQty}</span>
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
