"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { PageHeader } from "@/components/layout/page-header";
import { useToast } from "@/components/ui/toast";
import { formatCurrency, formatDate, getCurrentYearMonth, getMonthLabel, STATUS_LABELS } from "@/lib/utils";

interface Remito {
  id: string;
  storeId: string;
  supplierId: string | null;
  supplierRaw: string | null;
  noteNumber: string | null;
  date: string;
  total: number;
  currency: string;
  status: string;
  imageUrl: string | null;
  store: { id: string; name: string };
  supplier: { id: string; name: string } | null;
  items: any[];
}

export default function RemitosPage() {
  const { addToast } = useToast();
  const { year, month } = getCurrentYearMonth();
  const [remitos, setRemitos] = useState<Remito[]>([]);
  const [stores, setStores] = useState<{ id: string; name: string }[]>([]);
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [filterMonth, setFilterMonth] = useState(month);
  const [filterYear, setFilterYear] = useState(year);
  const [filterStore, setFilterStore] = useState("all");
  const [filterSupplier, setFilterSupplier] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // Upload
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [parsedData, setParsedData] = useState<any>(null);

  // Form de revisión
  const [reviewForm, setReviewForm] = useState({
    storeId: "",
    supplierId: "",
    supplierRaw: "",
    noteNumber: "",
    date: new Date().toISOString().split("T")[0],
    total: 0,
    status: "pendiente",
    imageUrl: "",
    notes: "",
    items: [] as any[],
  });

  const loadRemitos = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({
      month: filterMonth.toString(),
      year: filterYear.toString(),
    });
    if (filterStore !== "all") params.set("storeId", filterStore);
    if (filterSupplier !== "all") params.set("supplierId", filterSupplier);
    if (filterStatus !== "all") params.set("status", filterStatus);

    fetch(`/api/remitos?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setRemitos(data);
        setLoading(false);
      });
  }, [filterMonth, filterYear, filterStore, filterSupplier, filterStatus]);

  useEffect(() => {
    fetch("/api/locales").then((r) => r.json()).then(setStores);
    fetch("/api/proveedores").then((r) => r.json()).then(setSuppliers);
  }, []);

  useEffect(() => { loadRemitos(); }, [loadRemitos]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", "remito");

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();

      if (data.error) {
        addToast(data.error, "error");
        setUploading(false);
        return;
      }

      setParsedData(data.parsed);
      setReviewForm({
        storeId: stores[0]?.id || "",
        supplierId: data.parsed.resolvedSupplierId || "",
        supplierRaw: data.parsed.supplierName || "",
        noteNumber: data.parsed.noteNumber || "",
        date: data.parsed.date || new Date().toISOString().split("T")[0],
        total: data.parsed.total || 0,
        status: "pendiente",
        imageUrl: data.imageUrl || "",
        notes: "",
        items: (data.parsed.items || []).map((item: any) => ({
          productId: item.resolvedProductId || "",
          productRaw: item.productName || "",
          quantity: item.quantity || 0,
          unitPrice: item.unitPrice || 0,
          subtotal: item.subtotal || 0,
        })),
      });
      setShowUpload(true);
    } catch (err) {
      addToast("Error subiendo archivo", "error");
    }
    setUploading(false);
  };

  const handleSaveRemito = async () => {
    if (!reviewForm.storeId) {
      addToast("Selecciona un local", "error");
      return;
    }
    if (!reviewForm.total) {
      addToast("El total es requerido", "error");
      return;
    }

    try {
      const res = await fetch("/api/remitos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...reviewForm,
          ocrRawData: parsedData,
        }),
      });

      if (res.status === 409) {
        addToast("Posible remito duplicado detectado", "error");
        return;
      }

      if (res.ok) {
        addToast("Remito guardado", "success");
        setShowUpload(false);
        setParsedData(null);
        loadRemitos();
      }
    } catch {
      addToast("Error guardando remito", "error");
    }
  };

  const handleManualRemito = () => {
    setParsedData(null);
    setReviewForm({
      storeId: stores[0]?.id || "",
      supplierId: "",
      supplierRaw: "",
      noteNumber: "",
      date: new Date().toISOString().split("T")[0],
      total: 0,
      status: "pendiente",
      imageUrl: "",
      notes: "",
      items: [],
    });
    setShowUpload(true);
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    await fetch("/api/remitos", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: newStatus }),
    });
    addToast(`Estado actualizado a ${STATUS_LABELS[newStatus]?.label}`, "success");
    loadRemitos();
  };

  const total = remitos.reduce((sum, r) => sum + r.total, 0);
  const validados = remitos.filter((r) => r.status === "validado");
  const totalValidados = validados.reduce((sum, r) => sum + r.total, 0);

  return (
    <div>
      <PageHeader
        title="Remitos"
        description="Carga y revisión de remitos de proveedores"
        icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        }
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleManualRemito}>
              + Manual
            </Button>
            <label className="cursor-pointer">
              <Button disabled={uploading} className="pointer-events-none">
                {uploading ? "Procesando..." : "📷 Subir imagen"}
              </Button>
              <input
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={handleUpload}
                disabled={uploading}
              />
            </label>
          </div>
        }
      />

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-4">
        <Select value={filterMonth.toString()} onChange={(e) => setFilterMonth(parseInt(e.target.value))}>
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i + 1} value={i + 1}>{getMonthLabel(filterYear, i + 1)}</option>
          ))}
        </Select>
        <Select value={filterYear.toString()} onChange={(e) => setFilterYear(parseInt(e.target.value))}>
          {[year - 1, year, year + 1].map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </Select>
        <Select value={filterStore} onChange={(e) => setFilterStore(e.target.value)}>
          <option value="all">Todos los locales</option>
          {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
        <Select value={filterSupplier} onChange={(e) => setFilterSupplier(e.target.value)}>
          <option value="all">Todos los proveedores</option>
          {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
        <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="all">Todos los estados</option>
          <option value="pendiente">Pendiente</option>
          <option value="validado">Validado</option>
          <option value="rechazado">Rechazado</option>
        </Select>
      </div>

      {/* Resumen rápido */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-white/40 uppercase tracking-wide font-medium">Total filtrado</p>
            <p className="text-xl font-bold text-brand-400 mt-1">{formatCurrency(total)}</p>
            <p className="text-xs text-white/30 mt-0.5">{remitos.length} remitos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-white/40 uppercase tracking-wide font-medium">Validados</p>
            <p className="text-xl font-bold text-emerald-400 mt-1">{formatCurrency(totalValidados)}</p>
            <p className="text-xs text-white/30 mt-0.5">{validados.length} remitos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-white/40 uppercase tracking-wide font-medium">Pendientes</p>
            <p className="text-xl font-bold text-amber-400 mt-1">
              {remitos.filter((r) => r.status === "pendiente").length}
            </p>
            <p className="text-xs text-white/30 mt-0.5">para revisar</p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de remitos */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <p className="p-8 text-center text-white/30">Cargando...</p>
          ) : remitos.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-4xl mb-3">📄</p>
              <p className="text-white/40 mb-4 text-sm">No hay remitos para este periodo</p>
              <Button variant="outline" size="sm" onClick={handleManualRemito}>
                Cargar primer remito
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Local</TableHead>
                  <TableHead>Nro</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {remitos.map((r) => {
                  const st = STATUS_LABELS[r.status] || STATUS_LABELS.pendiente;
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="whitespace-nowrap">{formatDate(r.date)}</TableCell>
                      <TableCell>{r.supplier?.name || r.supplierRaw || "—"}</TableCell>
                      <TableCell className="text-sm">{r.store.name}</TableCell>
                      <TableCell className="text-sm text-white/30">{r.noteNumber || "—"}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(r.total)}</TableCell>
                      <TableCell>
                        <span className={`badge ${st.color}`}>{st.label}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {r.status === "pendiente" && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleStatusChange(r.id, "validado")}
                              >
                                ✓
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleStatusChange(r.id, "rechazado")}
                              >
                                ✗
                              </Button>
                            </>
                          )}
                          {r.status === "rechazado" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleStatusChange(r.id, "pendiente")}
                            >
                              Restaurar
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Upload / Revisión */}
      <Dialog open={showUpload} onClose={() => setShowUpload(false)}>
        <DialogHeader>
          <DialogTitle>
            {parsedData ? "Revisar remito detectado" : "Cargar remito manual"}
          </DialogTitle>
        </DialogHeader>
        <DialogContent>
          {parsedData && parsedData.confidence < 0.7 && (
            <div className="bg-amber-500/10 border border-amber-500/25 rounded-lg p-3 mb-4 text-sm text-amber-300">
              ⚠️ Confianza del OCR baja ({Math.round(parsedData.confidence * 100)}%) — revisá bien los datos antes de guardar.
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-white/50 uppercase tracking-wide mb-1.5">Local *</label>
              <Select
                value={reviewForm.storeId}
                onChange={(e) => setReviewForm({ ...reviewForm, storeId: e.target.value })}
              >
                <option value="">Seleccionar...</option>
                {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/50 uppercase tracking-wide mb-1.5">Proveedor</label>
              <Select
                value={reviewForm.supplierId}
                onChange={(e) => setReviewForm({ ...reviewForm, supplierId: e.target.value })}
              >
                <option value="">Seleccionar...</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
              {reviewForm.supplierRaw && reviewForm.supplierRaw !== "" && (
                <p className="text-xs text-white/30 mt-1">
                  Detectado: &ldquo;{reviewForm.supplierRaw}&rdquo;
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/50 uppercase tracking-wide mb-1.5">Fecha *</label>
              <Input
                type="date"
                value={reviewForm.date}
                onChange={(e) => setReviewForm({ ...reviewForm, date: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/50 uppercase tracking-wide mb-1.5">Nro de remito</label>
              <Input
                value={reviewForm.noteNumber}
                onChange={(e) => setReviewForm({ ...reviewForm, noteNumber: e.target.value })}
                placeholder="R-0001"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/50 uppercase tracking-wide mb-1.5">Total *</label>
              <Input
                type="number"
                step="0.01"
                value={reviewForm.total || ""}
                onChange={(e) => setReviewForm({ ...reviewForm, total: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/50 uppercase tracking-wide mb-1.5">Notas</label>
              <Input
                value={reviewForm.notes}
                onChange={(e) => setReviewForm({ ...reviewForm, notes: e.target.value })}
                placeholder="Observaciones..."
              />
            </div>
          </div>

          {/* Items detectados */}
          {reviewForm.items.length > 0 && (
            <div className="mt-4">
              <h4 className="text-xs font-semibold text-white/40 uppercase tracking-wide mb-2">Items detectados</h4>
              <div className="rounded-lg overflow-hidden" style={{ border: "1px solid hsl(25, 8%, 18%)" }}>
                <table className="w-full text-sm">
                  <thead style={{ background: "hsl(25, 8%, 8%)" }}>
                    <tr>
                      <th className="px-3 py-2 text-left text-xs text-white/30 font-semibold uppercase">Producto</th>
                      <th className="px-3 py-2 text-right text-xs text-white/30 font-semibold uppercase">Cant.</th>
                      <th className="px-3 py-2 text-right text-xs text-white/30 font-semibold uppercase">P.Unit.</th>
                      <th className="px-3 py-2 text-right text-xs text-white/30 font-semibold uppercase">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody style={{ background: "hsl(25, 10%, 10%)" }}>
                    {reviewForm.items.map((item: any, idx: number) => (
                      <tr key={idx} className="border-t" style={{ borderColor: "hsl(25, 8%, 17%)" }}>
                        <td className="px-3 py-2">
                          <Input
                            value={item.productRaw}
                            onChange={(e) => {
                              const newItems = [...reviewForm.items];
                              newItems[idx] = { ...item, productRaw: e.target.value };
                              setReviewForm({ ...reviewForm, items: newItems });
                            }}
                            className="h-8 text-sm"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            value={item.quantity || ""}
                            onChange={(e) => {
                              const newItems = [...reviewForm.items];
                              newItems[idx] = { ...item, quantity: parseFloat(e.target.value) || 0 };
                              setReviewForm({ ...reviewForm, items: newItems });
                            }}
                            className="h-8 text-sm text-right w-20"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            step="0.01"
                            value={item.unitPrice || ""}
                            onChange={(e) => {
                              const newItems = [...reviewForm.items];
                              newItems[idx] = { ...item, unitPrice: parseFloat(e.target.value) || 0 };
                              setReviewForm({ ...reviewForm, items: newItems });
                            }}
                            className="h-8 text-sm text-right w-24"
                          />
                        </td>
                        <td className="px-3 py-2 text-right">
                          {formatCurrency(item.subtotal || (item.quantity || 0) * (item.unitPrice || 0))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowUpload(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSaveRemito}>
            Guardar remito
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
