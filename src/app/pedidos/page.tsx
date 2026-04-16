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

interface DayBreakdown {
  day: number;
  dayName: string;
  usage: number;
  isWeekend: boolean;
}

interface RecommendationItem {
  productId: string;
  productName: string;
  unit: string;
  stockActual: number;
  avgDailyUsage: number;
  weekdayAvgUsage: number | null;
  weekendAvgUsage: number | null;
  coverageDays: number;
  coverageDayNumbers: number[];
  dailyBreakdown: DayBreakdown[];
  totalExpectedUsage: number;
  safetyStock: number;
  stockTarget: number;
  suggestedQty: number;
  finalQty: number;
  roundingUnit: number;
  calculationDetail: string;
}

const DAY_NAMES: Record<number, string> = {
  0: "Dom",
  1: "Lun",
  2: "Mar",
  3: "Mié",
  4: "Jue",
  5: "Vie",
  6: "Sáb",
};

export default function PedidosPage() {
  const { addToast } = useToast();
  const [stores, setStores] = useState<{ id: string; name: string }[]>([]);
  const [selectedStore, setSelectedStore] = useState("");
  const [schedule, setSchedule] = useState<Record<number, { coverageDays: number; label: string; coverageDayNumbers?: number[] }>>({});
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Recomendación actual
  const [recommendation, setRecommendation] = useState<RecommendationItem[] | null>(null);
  const [coverageInfo, setCoverageInfo] = useState<{ days: number; label: string; coverageDayNumbers?: number[] } | null>(null);
  const [showDetail, setShowDetail] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [recalculating, setRecalculating] = useState(false);

  const handleRecalcularConsumo = async () => {
    if (!selectedStore) { addToast("Seleccioná un local", "error"); return; }
    if (!window.confirm("¿Recalcular consumo promedio desde los snapshots de stock?\nEsto sobreescribirá los promedios calculados automáticamente.")) return;
    setRecalculating(true);
    try {
      const res = await fetch("/api/stock/calcular-consumo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId: selectedStore }),
      });
      const data = await res.json();
      if (res.ok) {
        addToast(`Consumo recalculado: ${data.results?.length || 0} productos actualizados`, "success");
      } else {
        addToast(data.error || "Error: " + (data.error || "verificá que haya al menos 2 snapshots cargados"), "error");
      }
    } catch {
      addToast("Error de conexión", "error");
    }
    setRecalculating(false);
  };

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
      setCoverageInfo({
        days: data.coverageDays,
        label: data.coverageLabel,
        coverageDayNumbers: data.coverageDayNumbers ?? [],
      });
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
      <div className="flex flex-wrap gap-3 mb-4">
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

        <Button
          variant="outline"
          size="sm"
          onClick={handleRecalcularConsumo}
          disabled={recalculating}
          className="ml-auto text-white/50 hover:text-white/80"
          title="Recalcula el promedio diario de consumo a partir de snapshots de stock cargados"
        >
          {recalculating ? "Calculando…" : "↻ Recalcular consumo"}
        </Button>
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle>Pedido sugerido</CardTitle>
                <p className="text-xs text-white/40 mt-1">{coverageInfo.label}</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {coverageInfo.coverageDayNumbers?.map((dow) => (
                  <span
                    key={dow}
                    className={`text-xs font-semibold px-2 py-1 rounded-md ${
                      [5, 6, 0].includes(dow)
                        ? "bg-brand-500/20 text-brand-400 border border-brand-500/30"
                        : "bg-white/8 text-white/50 border border-white/10"
                    }`}
                  >
                    {["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"][dow]}
                    {[5, 6, 0].includes(dow) && " 🔥"}
                  </span>
                ))}
                <Badge variant="info">{coverageInfo.days} días</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="text-right">Semana</TableHead>
                  <TableHead className="text-right">Finde 🔥</TableHead>
                  <TableHead className="text-right">Total esperado</TableHead>
                  <TableHead className="text-right">Objetivo</TableHead>
                  <TableHead className="text-right">Sugerido</TableHead>
                  <TableHead className="text-right">Pedir</TableHead>
                  <TableHead className="w-8"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recommendation.map((item) => {
                  const isDetailOpen = item.productId === showDetail;
                  const hasWeekendDiff = item.weekendAvgUsage !== null;
                  return (
                    <React.Fragment key={item.productId}>
                      <TableRow
                        className={isDetailOpen ? "bg-white/3" : ""}
                        style={{ cursor: "pointer" }}
                        onClick={() => setShowDetail(isDetailOpen ? null : item.productId)}
                      >
                        <TableCell className="font-semibold text-white/90">{item.productName}</TableCell>
                        <TableCell className="text-right">
                          <span className={item.stockActual === 0 ? "text-red-400 font-bold" : ""}>
                            {item.stockActual}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-white/50">
                          {(item.weekdayAvgUsage ?? item.avgDailyUsage).toFixed(1)}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={hasWeekendDiff ? "text-brand-400 font-semibold" : "text-white/30"}>
                            {(item.weekendAvgUsage ?? item.avgDailyUsage).toFixed(1)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-white/60">
                          {item.totalExpectedUsage?.toFixed(1) ?? "—"}
                        </TableCell>
                        <TableCell className="text-right text-white/50">
                          {item.stockTarget.toFixed(1)}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={item.suggestedQty > 0 ? "text-gold-400 font-bold" : "text-white/30"}>
                            {item.suggestedQty}
                          </span>
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
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
                        <TableCell className="text-center text-white/30">
                          {isDetailOpen ? "▲" : "▼"}
                        </TableCell>
                      </TableRow>

                      {/* Desglose inline por día */}
                      {isDetailOpen && (
                        <TableRow>
                          <TableCell
                            colSpan={9}
                            className="p-0"
                            style={{ background: "hsl(25, 8%, 8%)", borderTop: "1px solid hsl(25, 8%, 18%)" }}
                          >
                            <div className="p-5">
                              <p className="text-xs font-bold text-white/50 uppercase tracking-widest mb-3">
                                Desglose — {item.productName}
                              </p>

                              {/* Días cubiertos */}
                              <div className="flex flex-wrap gap-2 mb-4">
                                {item.dailyBreakdown?.map((d) => (
                                  <div
                                    key={d.day}
                                    className={`px-3 py-2 rounded-lg text-sm ${
                                      d.isWeekend
                                        ? "bg-brand-500/15 border border-brand-500/30"
                                        : "bg-white/5 border border-white/10"
                                    }`}
                                  >
                                    <p className={`font-semibold ${d.isWeekend ? "text-brand-300" : "text-white/60"}`}>
                                      {d.dayName} {d.isWeekend && "🔥"}
                                    </p>
                                    <p className={`text-lg font-bold mt-0.5 ${d.isWeekend ? "text-brand-400" : "text-white/70"}`}>
                                      {d.usage.toFixed(1)}
                                    </p>
                                  </div>
                                ))}
                                <div className="px-3 py-2 rounded-lg bg-gold-500/10 border border-gold-500/20 text-sm">
                                  <p className="text-xs font-semibold text-gold-400 uppercase tracking-wide">Total esperado</p>
                                  <p className="text-lg font-bold text-gold-400 mt-0.5">
                                    {item.totalExpectedUsage?.toFixed(1)}
                                  </p>
                                </div>
                              </div>

                              {/* Cálculo */}
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {[
                                  { label: "Stock actual",    val: item.stockActual,                      color: "text-white" },
                                  { label: "Uso esperado",    val: item.totalExpectedUsage?.toFixed(1),   color: "text-brand-400" },
                                  { label: "Stock seguridad", val: item.safetyStock,                      color: "text-white/60" },
                                  { label: "Pedir",           val: item.suggestedQty,                     color: "text-gold-400" },
                                ].map((row) => (
                                  <div
                                    key={row.label}
                                    className="p-3 rounded-lg"
                                    style={{ background: "hsl(25, 10%, 13%)", border: "1px solid hsl(25, 8%, 20%)" }}
                                  >
                                    <p className="text-xs text-white/40 uppercase tracking-wide mb-1">{row.label}</p>
                                    <p className={`text-xl font-bold ${row.color}`}>{row.val ?? "—"}</p>
                                  </div>
                                ))}
                              </div>
                              <p className="mt-3 text-xs text-white/25 font-mono">
                                pedido = max(0, roundUp(uso_esperado + stock_seguridad − stock_actual, {item.roundingUnit}))
                                = max(0, roundUp({item.totalExpectedUsage?.toFixed(1)} + {item.safetyStock} − {item.stockActual}, {item.roundingUnit}))
                                = {item.suggestedQty}
                              </p>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
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
