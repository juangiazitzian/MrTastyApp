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
import { formatDate, getTodayInputDate } from "@/lib/utils";

interface StockItem {
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
  confidence?: number;
}

function toInputDate(date: string): string {
  const match = date.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : getTodayInputDate();
}

export default function StockPage() {
  const { addToast } = useToast();
  const [stores, setStores] = useState<{ id: string; name: string }[]>([]);
  const [selectedStore, setSelectedStore] = useState("");
  const [products, setProducts] = useState<any[]>([]);
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editingSnapshotId, setEditingSnapshotId] = useState<string | null>(null);
  const [formSource, setFormSource] = useState<"manual" | "foto">("manual");
  const [formItems, setFormItems] = useState<StockItem[]>([]);
  const [formDate, setFormDate] = useState<string>(getTodayInputDate());
  const [formNotes, setFormNotes] = useState("");
  const [uploading, setUploading] = useState(false);

  const loadSnapshots = async (storeId: string) => {
    setLoading(true);
    const data = await fetch(`/api/stock?storeId=${storeId}`).then((r) => r.json());
    setSnapshots(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => {
    fetch("/api/locales").then((r) => r.json()).then((s) => {
      setStores(s);
      if (s.length > 0) setSelectedStore(s[0].id);
    });
    fetch("/api/productos?supplierId=sup-blancaluna").then((r) => r.json()).then(setProducts);
  }, []);

  useEffect(() => {
    if (!selectedStore) return;
    loadSnapshots(selectedStore).catch(() => setLoading(false));
  }, [selectedStore]);

  const buildEmptyItems = () =>
    products.map((p: any) => ({
      productId: p.id,
      productName: p.name,
      quantity: 0,
      unit: p.unit,
    }));

  const initManualForm = () => {
    setEditingSnapshotId(null);
    setFormSource("manual");
    setFormDate(getTodayInputDate());
    setFormNotes("");
    setFormItems(buildEmptyItems());
    setShowForm(true);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", "stock");

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();

      if (data.error) {
        addToast(data.error, "error");
        setUploading(false);
        return;
      }

      const parsedItems: StockItem[] = data.parsed.items.map((item: any) => ({
        productId: item.resolvedProductId || "",
        productName: item.resolvedProductName || item.productName,
        quantity: item.quantity,
        unit: "",
        confidence: item.confidence,
      }));

      setEditingSnapshotId(null);
      setFormSource("foto");
      setFormDate(getTodayInputDate());
      setFormNotes("");
      setFormItems(parsedItems);
      setShowForm(true);
    } catch {
      addToast("Error procesando imagen", "error");
    }
    setUploading(false);
    e.target.value = "";
  };

  const handleEditSnapshot = (snapshot: any) => {
    const quantityByProduct = new Map<string, number>();
    for (const item of snapshot.items || []) {
      quantityByProduct.set(item.productId, item.quantity);
    }

    setEditingSnapshotId(snapshot.id);
    setFormSource(snapshot.source === "foto" ? "foto" : "manual");
    setFormDate(toInputDate(snapshot.date));
    setFormNotes(snapshot.notes || "");
    setFormItems(
      products.map((p: any) => ({
        productId: p.id,
        productName: p.name,
        quantity: quantityByProduct.get(p.id) || 0,
        unit: p.unit,
      }))
    );
    setShowForm(true);
  };

  const handleSaveSnapshot = async () => {
    if (!selectedStore) {
      addToast("Selecciona un local", "error");
      return;
    }

    const validItems = formItems.filter((i) => i.productId && i.quantity > 0);
    if (validItems.length === 0) {
      addToast("Agrega al menos un producto con cantidad", "error");
      return;
    }

    try {
      const res = await fetch("/api/stock", {
        method: editingSnapshotId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingSnapshotId,
          storeId: selectedStore,
          source: formSource,
          date: formDate,
          notes: formNotes || null,
          items: validItems.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
          })),
        }),
      });

      if (res.ok) {
        addToast(editingSnapshotId ? "Stock actualizado" : "Stock guardado", "success");
        setShowForm(false);
        setEditingSnapshotId(null);
        await loadSnapshots(selectedStore);
      } else {
        const data = await res.json();
        addToast(data.error || "Error guardando stock", "error");
      }
    } catch {
      addToast("Error guardando stock", "error");
    }
  };

  const handleDeleteSnapshot = async (snapshot: any) => {
    if (!window.confirm(`Eliminar carga de stock del ${formatDate(snapshot.date)}?`)) return;

    const res = await fetch(`/api/stock?id=${snapshot.id}`, { method: "DELETE" });
    if (res.ok) {
      addToast("Carga de stock eliminada", "success");
      await loadSnapshots(selectedStore);
    } else {
      addToast("No se pudo eliminar la carga", "error");
    }
  };

  return (
    <div>
      <PageHeader
        title="Stock"
        description="Snapshots de stock actual por local"
        icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        }
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={initManualForm}>
              + Carga manual
            </Button>
            <label className="cursor-pointer">
              <Button disabled={uploading} className="pointer-events-none">
                {uploading ? "Procesando..." : "Desde foto"}
              </Button>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
                disabled={uploading}
              />
            </label>
          </div>
        }
      />

      <div className="mb-6">
        <Select value={selectedStore} onChange={(e) => setSelectedStore(e.target.value)}>
          {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
      </div>

      {snapshots.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <CardTitle>Ultimo stock registrado</CardTitle>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="info">{formatDate(snapshots[0].date)} - {snapshots[0].source}</Badge>
                <Button size="sm" variant="outline" onClick={() => handleEditSnapshot(snapshots[0])}>
                  Editar
                </Button>
                <Button size="sm" variant="ghost" onClick={() => handleDeleteSnapshot(snapshots[0])}>
                  Eliminar
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead>Unidad</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {snapshots[0].items?.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.product?.name || "-"}</TableCell>
                    <TableCell className="text-right font-semibold">{item.quantity}</TableCell>
                    <TableCell className="text-sm text-white/40">{item.product?.unit || ""}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Historial de snapshots</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-white/30 text-sm">Cargando...</p>
          ) : snapshots.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-white/40 text-sm">
                Sin snapshots de stock. Carga tu primer inventario.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {snapshots.map((snap: any) => (
                <div
                  key={snap.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg transition-colors"
                  style={{ border: "1px solid hsl(25, 8%, 18%)", background: "hsl(25, 8%, 12%)" }}
                >
                  <div>
                    <p className="font-medium text-white/80">{formatDate(snap.date)}</p>
                    <p className="text-xs text-white/40 mt-0.5">
                      {snap.items?.length || 0} productos - Fuente: {snap.source}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={snap.source === "foto" ? "info" : "default"}>
                      {snap.source}
                    </Badge>
                    <Button size="sm" variant="outline" onClick={() => handleEditSnapshot(snap)}>
                      Editar
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDeleteSnapshot(snap)}>
                      Eliminar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showForm} onClose={() => setShowForm(false)}>
        <DialogHeader>
          <DialogTitle>
            {editingSnapshotId
              ? "Editar carga de stock"
              : formSource === "foto"
                ? "Revisar stock desde foto"
                : "Carga manual de stock"}
          </DialogTitle>
        </DialogHeader>
        <DialogContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold text-white/50 uppercase tracking-wide mb-1.5">
                Fecha del stock
              </label>
              <Input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/50 uppercase tracking-wide mb-1.5">
                Fuente
              </label>
              <Select value={formSource} onChange={(e) => setFormSource(e.target.value as "manual" | "foto")}>
                <option value="manual">Manual</option>
                <option value="foto">Foto</option>
              </Select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/50 uppercase tracking-wide mb-1.5">
                Notas
              </label>
              <Input
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Opcional"
              />
            </div>
          </div>

          {formSource === "foto" && !editingSnapshotId && (
            <div className="bg-amber-500/10 border border-amber-500/25 rounded-lg p-3 mb-4 text-sm text-amber-300">
              Revisa y corrige los datos antes de guardar. El OCR puede cometer errores.
            </div>
          )}

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {formItems.map((item, idx) => (
              <div
                key={`${item.productId || item.productName}-${idx}`}
                className="flex items-center gap-3 p-2 rounded-lg"
                style={{ border: "1px solid hsl(25, 8%, 18%)", background: "hsl(25, 8%, 12%)" }}
              >
                <div className="flex-1">
                  {formSource === "foto" ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{item.productName}</span>
                      {item.confidence !== undefined && item.confidence < 0.8 && (
                        <Badge variant="warning">Verificar</Badge>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm font-medium">{item.productName}</span>
                  )}
                </div>
                {formSource === "foto" && !item.productId && (
                  <Select
                    className="w-40"
                    value={item.productId}
                    onChange={(e) => {
                      const newItems = [...formItems];
                      newItems[idx] = { ...item, productId: e.target.value };
                      setFormItems(newItems);
                    }}
                  >
                    <option value="">Vincular...</option>
                    {products.map((p: any) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </Select>
                )}
                <Input
                  type="number"
                  value={item.quantity || ""}
                  onChange={(e) => {
                    const newItems = [...formItems];
                    newItems[idx] = { ...item, quantity: parseFloat(e.target.value) || 0 };
                    setFormItems(newItems);
                  }}
                  className="w-24 text-right"
                  placeholder="0"
                />
              </div>
            ))}
          </div>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowForm(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSaveSnapshot}>
            {editingSnapshotId ? "Actualizar stock" : "Guardar stock"}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
