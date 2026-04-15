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
import { formatDate } from "@/lib/utils";

interface StockItem {
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
  confidence?: number;
}

export default function StockPage() {
  const { addToast } = useToast();
  const [stores, setStores] = useState<{ id: string; name: string }[]>([]);
  const [selectedStore, setSelectedStore] = useState("");
  const [products, setProducts] = useState<any[]>([]);
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Carga manual / revisión de foto
  const [showForm, setShowForm] = useState(false);
  const [formSource, setFormSource] = useState<"manual" | "foto">("manual");
  const [formItems, setFormItems] = useState<StockItem[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetch("/api/locales").then((r) => r.json()).then((s) => {
      setStores(s);
      if (s.length > 0) setSelectedStore(s[0].id);
    });
    fetch("/api/productos?supplierId=sup-blancaluna").then((r) => r.json()).then(setProducts);
  }, []);

  useEffect(() => {
    if (!selectedStore) return;
    setLoading(true);
    fetch(`/api/stock?storeId=${selectedStore}`)
      .then((r) => r.json())
      .then((data) => {
        setSnapshots(Array.isArray(data) ? data : []);
        setLoading(false);
      });
  }, [selectedStore]);

  const initManualForm = () => {
    setFormSource("manual");
    setFormItems(
      products.map((p: any) => ({
        productId: p.id,
        productName: p.name,
        quantity: 0,
        unit: p.unit,
      }))
    );
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

      // Mapear items parseados a productos conocidos
      const parsedItems: StockItem[] = data.parsed.items.map((item: any) => ({
        productId: item.resolvedProductId || "",
        productName: item.resolvedProductName || item.productName,
        quantity: item.quantity,
        unit: "",
        confidence: item.confidence,
      }));

      setFormSource("foto");
      setFormItems(parsedItems);
      setShowForm(true);
    } catch {
      addToast("Error procesando imagen", "error");
    }
    setUploading(false);
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
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId: selectedStore,
          source: formSource,
          items: validItems.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
          })),
        }),
      });

      if (res.ok) {
        addToast("Stock guardado", "success");
        setShowForm(false);
        // Recargar
        const data = await fetch(`/api/stock?storeId=${selectedStore}`).then((r) => r.json());
        setSnapshots(Array.isArray(data) ? data : []);
      }
    } catch {
      addToast("Error guardando stock", "error");
    }
  };

  return (
    <div>
      <PageHeader
        title="Stock"
        description="Snapshots de stock actual por local"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={initManualForm}>
              + Carga manual
            </Button>
            <label className="cursor-pointer">
              <Button disabled={uploading} asChild>
                <span>{uploading ? "Procesando..." : "📷 Desde foto"}</span>
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

      {/* Selector de local */}
      <div className="mb-6">
        <Select value={selectedStore} onChange={(e) => setSelectedStore(e.target.value)}>
          {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
      </div>

      {/* Stock actual (último snapshot) */}
      {snapshots.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Ultimo stock registrado</span>
              <Badge variant="info">{formatDate(snapshots[0].date)} — {snapshots[0].source}</Badge>
            </CardTitle>
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
                    <TableCell className="font-medium">{item.product?.name || "—"}</TableCell>
                    <TableCell className="text-right font-semibold">{item.quantity}</TableCell>
                    <TableCell className="text-sm text-gray-500">{item.product?.unit || ""}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Historial */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de snapshots</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-gray-400">Cargando...</p>
          ) : snapshots.length === 0 ? (
            <p className="text-gray-400 text-center py-4">
              Sin snapshots de stock. Carga tu primer stock.
            </p>
          ) : (
            <div className="space-y-2">
              {snapshots.map((snap: any) => (
                <div key={snap.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                  <div>
                    <p className="font-medium">{formatDate(snap.date)}</p>
                    <p className="text-sm text-gray-500">
                      {snap.items?.length || 0} productos — Fuente: {snap.source}
                    </p>
                  </div>
                  <Badge variant={snap.source === "foto" ? "info" : "default"}>
                    {snap.source}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de carga */}
      <Dialog open={showForm} onClose={() => setShowForm(false)}>
        <DialogHeader>
          <DialogTitle>
            {formSource === "foto" ? "Revisar stock desde foto" : "Carga manual de stock"}
          </DialogTitle>
        </DialogHeader>
        <DialogContent>
          {formSource === "foto" && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 text-sm text-yellow-800">
              ⚠️ Revisa y corrige los datos antes de guardar. El OCR puede tener errores.
            </div>
          )}

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {formItems.map((item, idx) => (
              <div key={idx} className="flex items-center gap-3 p-2 border rounded">
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
            Guardar stock
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
