"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/layout/page-header";
import { useToast } from "@/components/ui/toast";
import { formatDate, getTodayInputDate } from "@/lib/utils";

const ADJUSTMENT_TYPES = [
  { value: "merma", label: "Merma / pérdida", sign: -1, color: "text-red-400" },
  { value: "vencimiento", label: "Vencimiento", sign: -1, color: "text-orange-400" },
  { value: "rotura", label: "Rotura / daño", sign: -1, color: "text-red-400" },
  { value: "ajuste_negativo", label: "Ajuste negativo", sign: -1, color: "text-amber-400" },
  { value: "ajuste_positivo", label: "Ajuste positivo", sign: 1, color: "text-emerald-400" },
  { value: "transferencia", label: "Transferencia entre locales", sign: -1, color: "text-sky-400" },
];

function getTypeInfo(type: string) {
  return ADJUSTMENT_TYPES.find((t) => t.value === type) ?? ADJUSTMENT_TYPES[0];
}

export default function MermasPage() {
  const { addToast } = useToast();
  const [stores, setStores] = useState<{ id: string; name: string }[]>([]);
  const [products, setProducts] = useState<{ id: string; name: string; unit: string }[]>([]);
  const [adjustments, setAdjustments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterStore, setFilterStore] = useState("all");
  const [filterProduct, setFilterProduct] = useState("all");

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    storeId: "",
    productId: "",
    date: getTodayInputDate(),
    quantity: "",
    type: "merma",
    reason: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const loadAdjustments = async () => {
    setLoading(true);
    const params = new URLSearchParams({ limit: "100" });
    if (filterStore !== "all") params.set("storeId", filterStore);
    if (filterProduct !== "all") params.set("productId", filterProduct);
    const data = await fetch(`/api/stock/ajustes?${params}`).then((r) => r.json());
    setAdjustments(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => {
    fetch("/api/locales").then((r) => r.json()).then((s) => {
      setStores(s);
      if (s.length > 0) setForm((f) => ({ ...f, storeId: s[0].id }));
    });
    fetch("/api/productos").then((r) => r.json()).then(setProducts);
  }, []);

  useEffect(() => {
    loadAdjustments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStore, filterProduct]);

  const openForm = () => {
    setForm({
      storeId: stores[0]?.id || "",
      productId: products[0]?.id || "",
      date: getTodayInputDate(),
      quantity: "",
      type: "merma",
      reason: "",
      notes: "",
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.storeId || !form.productId || !form.quantity) {
      addToast("Completá todos los campos obligatorios", "error");
      return;
    }

    const typeInfo = getTypeInfo(form.type);
    const quantityAbs = Math.abs(parseFloat(form.quantity));
    const quantitySigned = quantityAbs * typeInfo.sign;

    setSaving(true);
    try {
      const res = await fetch("/api/stock/ajustes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          quantity: quantitySigned,
        }),
      });

      if (res.ok) {
        addToast("Ajuste registrado", "success");
        setShowForm(false);
        loadAdjustments();
      } else {
        const data = await res.json();
        addToast(data.error || "Error guardando ajuste", "error");
      }
    } catch {
      addToast("Error de conexión", "error");
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("¿Eliminar este ajuste?")) return;
    const res = await fetch(`/api/stock/ajustes?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      addToast("Ajuste eliminado", "success");
      loadAdjustments();
    } else {
      addToast("Error eliminando ajuste", "error");
    }
  };

  // Totales
  const totalMermas = adjustments
    .filter((a) => a.quantity < 0)
    .reduce((sum, a) => sum + Math.abs(a.quantity), 0);
  const totalPositivos = adjustments
    .filter((a) => a.quantity > 0)
    .reduce((sum, a) => sum + a.quantity, 0);

  return (
    <div>
      <PageHeader
        title="Mermas y Ajustes"
        description="Registro de pérdidas, vencimientos y ajustes de stock"
        icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        }
        actions={
          <Button onClick={openForm}>+ Registrar ajuste</Button>
        }
      />

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-6">
        <Select
          value={filterStore}
          onChange={(e) => setFilterStore(e.target.value)}
          className="w-48"
        >
          <option value="all">Todos los locales</option>
          {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
        <Select
          value={filterProduct}
          onChange={(e) => setFilterProduct(e.target.value)}
          className="w-48"
        >
          <option value="all">Todos los productos</option>
          {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="rounded-xl border p-4" style={{ background: "hsl(25, 10%, 10%)", borderColor: "hsl(25, 8%, 17%)" }}>
          <p className="text-xs text-white/40 uppercase tracking-wide mb-1">Total mermas</p>
          <p className="text-2xl font-bold text-red-400">−{totalMermas.toLocaleString("es-AR")}</p>
          <p className="text-xs text-white/30 mt-1">unidades perdidas</p>
        </div>
        <div className="rounded-xl border p-4" style={{ background: "hsl(25, 10%, 10%)", borderColor: "hsl(25, 8%, 17%)" }}>
          <p className="text-xs text-white/40 uppercase tracking-wide mb-1">Ajustes positivos</p>
          <p className="text-2xl font-bold text-emerald-400">+{totalPositivos.toLocaleString("es-AR")}</p>
          <p className="text-xs text-white/30 mt-1">unidades ajustadas</p>
        </div>
      </div>

      {/* Tabla */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de ajustes</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 rounded bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : adjustments.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-3xl mb-3">✅</p>
              <p className="text-white/40 text-sm">Sin ajustes registrados</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Local</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Cantidad</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {adjustments.map((adj) => {
                  const typeInfo = getTypeInfo(adj.type);
                  const isNeg = adj.quantity < 0;
                  return (
                    <TableRow key={adj.id}>
                      <TableCell className="whitespace-nowrap">{formatDate(adj.date)}</TableCell>
                      <TableCell className="text-white/60">{adj.store?.name}</TableCell>
                      <TableCell>{adj.product?.name}</TableCell>
                      <TableCell>
                        <Badge
                          variant="default"
                          className={typeInfo.color}
                        >
                          {typeInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell
                        className={`font-bold ${isNeg ? "text-red-400" : "text-emerald-400"}`}
                      >
                        {isNeg ? "" : "+"}
                        {adj.quantity} {adj.product?.unit}
                      </TableCell>
                      <TableCell className="text-white/50 text-sm">
                        {adj.reason || <span className="text-white/20">—</span>}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(adj.id)}
                          className="text-white/30 hover:text-red-400"
                        >
                          ✕
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Form dialog */}
      <Dialog open={showForm} onClose={() => setShowForm(false)}>
        <DialogHeader>
          <DialogTitle>Registrar ajuste de stock</DialogTitle>
        </DialogHeader>
        <DialogContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-white/50 mb-1.5 uppercase tracking-wide">Local *</label>
                <Select
                  value={form.storeId}
                  onChange={(e) => setForm({ ...form, storeId: e.target.value })}
                >
                  {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Select>
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1.5 uppercase tracking-wide">Fecha *</label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-white/50 mb-1.5 uppercase tracking-wide">Producto *</label>
              <Select
                value={form.productId}
                onChange={(e) => setForm({ ...form, productId: e.target.value })}
              >
                <option value="">— Seleccionar producto —</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>
                ))}
              </Select>
            </div>

            <div>
              <label className="block text-xs text-white/50 mb-1.5 uppercase tracking-wide">Tipo de ajuste *</label>
              <Select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                {ADJUSTMENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </Select>
            </div>

            <div>
              <label className="block text-xs text-white/50 mb-1.5 uppercase tracking-wide">Cantidad *</label>
              <Input
                type="number"
                min="0"
                step="0.5"
                placeholder="Ej: 5"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              />
              <p className="text-xs text-white/30 mt-1">
                El signo se aplica automáticamente según el tipo ({getTypeInfo(form.type).sign > 0 ? "positivo" : "negativo"})
              </p>
            </div>

            <div>
              <label className="block text-xs text-white/50 mb-1.5 uppercase tracking-wide">Motivo</label>
              <Input
                placeholder="Ej: Se cayó el envase, estaba vencido…"
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs text-white/50 mb-1.5 uppercase tracking-wide">Notas adicionales</label>
              <Input
                placeholder="Notas opcionales"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Guardando..." : "Registrar ajuste"}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
