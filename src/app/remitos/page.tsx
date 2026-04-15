"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { PageHeader } from "@/components/layout/page-header";
import { useToast } from "@/components/ui/toast";
import { formatCurrency, formatDate, getCurrentYearMonth, getMonthLabel, getTodayInputDate } from "@/lib/utils";

interface Remito {
  id: string;
  storeId: string;
  supplierId: string | null;
  supplierRaw: string | null;
  noteNumber: string | null;
  date: string;
  total: number;
  currency: string;
  imageUrl: string | null;
  store: { id: string; name: string };
  supplier: { id: string; name: string } | null;
  items: any[];
}

interface BatchRow {
  tempId: string;
  storeId: string;
  supplierId: string;
  supplierRaw: string;
  noteNumber: string;
  date: string;
  total: string;
  notes: string;
}

const makeBatchRows = (count: number, storeId: string, date: string): BatchRow[] =>
  Array.from({ length: count }, (_, index) => ({
    tempId: `${Date.now()}-${index}-${Math.random().toString(36).slice(2)}`,
    storeId,
    supplierId: "",
    supplierRaw: "",
    noteNumber: "",
    date,
    total: "",
    notes: "",
  }));

export default function RemitosPage() {
  const { addToast } = useToast();
  const { year, month } = getCurrentYearMonth();
  const [remitos, setRemitos] = useState<Remito[]>([]);
  const [stores, setStores] = useState<{ id: string; name: string }[]>([]);
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterMonth, setFilterMonth] = useState(month);
  const [filterYear, setFilterYear] = useState(year);
  const [filterStore, setFilterStore] = useState("all");
  const [filterSupplier, setFilterSupplier] = useState("all");

  const [showUpload, setShowUpload] = useState(false);
  const [showBatch, setShowBatch] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [savingBatch, setSavingBatch] = useState(false);
  const [parsedData, setParsedData] = useState<any>(null);
  const [batchRows, setBatchRows] = useState<BatchRow[]>([]);

  const [reviewForm, setReviewForm] = useState({
    storeId: "",
    supplierId: "",
    supplierRaw: "",
    noteNumber: "",
    date: getTodayInputDate(),
    total: 0,
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

    fetch(`/api/remitos?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setRemitos(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [filterMonth, filterYear, filterStore, filterSupplier]);

  useEffect(() => {
    fetch("/api/locales").then((r) => r.json()).then(setStores);
    fetch("/api/proveedores").then((r) => r.json()).then(setSuppliers);
  }, []);

  useEffect(() => { loadRemitos(); }, [loadRemitos]);

  const resetReviewForm = (overrides: Partial<typeof reviewForm> = {}) => {
    setParsedData(null);
    setReviewForm({
      storeId: stores[0]?.id || "",
      supplierId: "",
      supplierRaw: "",
      noteNumber: "",
      date: getTodayInputDate(),
      total: 0,
      imageUrl: "",
      notes: "",
      items: [],
      ...overrides,
    });
  };

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
        date: data.parsed.date || getTodayInputDate(),
        total: data.parsed.total || 0,
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
    } catch {
      addToast("Error subiendo archivo", "error");
    }
    setUploading(false);
    e.target.value = "";
  };

  const handleSaveRemito = async (keepOpen = false) => {
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
        loadRemitos();
        if (keepOpen) {
          resetReviewForm({
            storeId: reviewForm.storeId,
            supplierId: reviewForm.supplierId,
            supplierRaw: reviewForm.supplierRaw,
            date: reviewForm.date,
          });
        } else {
          setShowUpload(false);
          setParsedData(null);
        }
      }
    } catch {
      addToast("Error guardando remito", "error");
    }
  };

  const handleManualRemito = () => {
    resetReviewForm();
    setShowUpload(true);
  };

  const handleBatchRemito = () => {
    const defaultStoreId = filterStore !== "all" ? filterStore : stores[0]?.id || "";
    setBatchRows(makeBatchRows(12, defaultStoreId, getTodayInputDate()));
    setShowBatch(true);
  };

  const updateBatchRow = (tempId: string, changes: Partial<BatchRow>) => {
    setBatchRows((rows) => rows.map((row) => (row.tempId === tempId ? { ...row, ...changes } : row)));
  };

  const handleSaveBatch = async () => {
    const validRows = batchRows.filter((row) => row.storeId && row.date && Number(row.total) > 0);
    if (validRows.length === 0) {
      addToast("Carga al menos una fila con local, fecha y total", "error");
      return;
    }

    setSavingBatch(true);
    try {
      const res = await fetch("/api/remitos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          remitos: validRows.map((row) => ({
            storeId: row.storeId,
            supplierId: row.supplierId || null,
            supplierRaw: row.supplierRaw || null,
            noteNumber: row.noteNumber || null,
            date: row.date,
            total: Number(row.total),
            notes: row.notes || null,
          })),
        }),
      });
      const result = await res.json();

      if (res.ok) {
        const createdCount = result.created?.length || 0;
        const duplicateCount = result.duplicates?.length || 0;
        addToast(`${createdCount} remitos guardados${duplicateCount ? `, ${duplicateCount} duplicados omitidos` : ""}`, "success");
        setShowBatch(false);
        loadRemitos();
      } else {
        addToast(result.error || "Error guardando remitos", "error");
      }
    } catch {
      addToast("Error guardando remitos", "error");
    }
    setSavingBatch(false);
  };

  const handleDeleteRemito = async (remito: Remito) => {
    const label = `${remito.supplier?.name || remito.supplierRaw || "Sin proveedor"} - ${formatCurrency(remito.total)}`;
    if (!window.confirm(`Eliminar remito ${label}?`)) return;

    const res = await fetch(`/api/remitos?id=${remito.id}`, { method: "DELETE" });
    if (res.ok) {
      addToast("Remito eliminado", "success");
      loadRemitos();
    } else {
      addToast("No se pudo eliminar el remito", "error");
    }
  };

  const total = remitos.reduce((sum, r) => sum + r.total, 0);
  const average = remitos.length > 0 ? total / remitos.length : 0;
  const suppliersCount = new Set(remitos.map((r) => r.supplier?.id || r.supplierRaw || "sin-proveedor")).size;

  return (
    <div>
      <PageHeader
        title="Remitos"
        description="Carga rapida, revision y guardado de remitos"
        icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        }
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleBatchRemito}>
              Batch
            </Button>
            <Button variant="outline" onClick={handleManualRemito}>
              + Manual
            </Button>
            <label className="cursor-pointer">
              <Button disabled={uploading} className="pointer-events-none">
                {uploading ? "Procesando..." : "Subir imagen"}
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
      </div>

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
            <p className="text-xs text-white/40 uppercase tracking-wide font-medium">Promedio</p>
            <p className="text-xl font-bold text-emerald-400 mt-1">{formatCurrency(average)}</p>
            <p className="text-xs text-white/30 mt-0.5">por remito</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-white/40 uppercase tracking-wide font-medium">Proveedores</p>
            <p className="text-xl font-bold text-gold-400 mt-1">{suppliersCount}</p>
            <p className="text-xs text-white/30 mt-0.5">con remitos cargados</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <p className="p-8 text-center text-white/30">Cargando...</p>
          ) : remitos.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-white/40 mb-4 text-sm">No hay remitos para este periodo</p>
              <div className="flex justify-center gap-2">
                <Button variant="outline" size="sm" onClick={handleManualRemito}>
                  Cargar uno
                </Button>
                <Button size="sm" onClick={handleBatchRemito}>
                  Carga batch
                </Button>
              </div>
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
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {remitos.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap">{formatDate(r.date)}</TableCell>
                    <TableCell>{r.supplier?.name || r.supplierRaw || "-"}</TableCell>
                    <TableCell className="text-sm">{r.store.name}</TableCell>
                    <TableCell className="text-sm text-white/30">{r.noteNumber || "-"}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(r.total)}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => handleDeleteRemito(r)}>
                        Eliminar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showUpload} onClose={() => setShowUpload(false)}>
        <DialogHeader>
          <DialogTitle>
            {parsedData ? "Revisar remito detectado" : "Cargar remito manual"}
          </DialogTitle>
        </DialogHeader>
        <DialogContent>
          {parsedData && parsedData.confidence < 0.7 && (
            <div className="bg-amber-500/10 border border-amber-500/25 rounded-lg p-3 mb-4 text-sm text-amber-300">
              Confianza del OCR baja ({Math.round(parsedData.confidence * 100)}%). Revisa los datos antes de guardar.
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
              {reviewForm.supplierRaw && (
                <p className="text-xs text-white/30 mt-1">Detectado: &ldquo;{reviewForm.supplierRaw}&rdquo;</p>
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
          {!parsedData && (
            <Button variant="outline" onClick={() => handleSaveRemito(true)}>
              Guardar y nuevo
            </Button>
          )}
          <Button onClick={() => handleSaveRemito(false)}>
            Guardar remito
          </Button>
        </DialogFooter>
      </Dialog>

      <Dialog open={showBatch} onClose={() => setShowBatch(false)}>
        <DialogHeader>
          <DialogTitle>Carga batch de remitos</DialogTitle>
        </DialogHeader>
        <DialogContent>
          <p className="text-sm text-white/45 mb-4">
            Completa solo las filas que necesites. Se guardan las filas con local, fecha y total.
          </p>
          <div className="overflow-x-auto rounded-lg" style={{ border: "1px solid hsl(25, 8%, 18%)" }}>
            <table className="w-full min-w-[900px] text-sm">
              <thead style={{ background: "hsl(25, 8%, 8%)" }}>
                <tr>
                  <th className="px-2 py-2 text-left text-xs text-white/30 font-semibold uppercase">Fecha</th>
                  <th className="px-2 py-2 text-left text-xs text-white/30 font-semibold uppercase">Local</th>
                  <th className="px-2 py-2 text-left text-xs text-white/30 font-semibold uppercase">Proveedor</th>
                  <th className="px-2 py-2 text-left text-xs text-white/30 font-semibold uppercase">Nro</th>
                  <th className="px-2 py-2 text-right text-xs text-white/30 font-semibold uppercase">Total</th>
                  <th className="px-2 py-2 text-left text-xs text-white/30 font-semibold uppercase">Notas</th>
                </tr>
              </thead>
              <tbody style={{ background: "hsl(25, 10%, 10%)" }}>
                {batchRows.map((row) => (
                  <tr key={row.tempId} className="border-t" style={{ borderColor: "hsl(25, 8%, 17%)" }}>
                    <td className="px-2 py-2">
                      <Input type="date" value={row.date} onChange={(e) => updateBatchRow(row.tempId, { date: e.target.value })} className="h-8" />
                    </td>
                    <td className="px-2 py-2">
                      <Select value={row.storeId} onChange={(e) => updateBatchRow(row.tempId, { storeId: e.target.value })} className="h-8">
                        <option value="">Local...</option>
                        {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </Select>
                    </td>
                    <td className="px-2 py-2">
                      <Select value={row.supplierId} onChange={(e) => updateBatchRow(row.tempId, { supplierId: e.target.value })} className="h-8">
                        <option value="">Proveedor...</option>
                        {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </Select>
                    </td>
                    <td className="px-2 py-2">
                      <Input value={row.noteNumber} onChange={(e) => updateBatchRow(row.tempId, { noteNumber: e.target.value })} className="h-8" />
                    </td>
                    <td className="px-2 py-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={row.total}
                        onChange={(e) => updateBatchRow(row.tempId, { total: e.target.value })}
                        className="h-8 text-right"
                        placeholder="0.00"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <Input value={row.notes} onChange={(e) => updateBatchRow(row.tempId, { notes: e.target.value })} className="h-8" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setBatchRows((rows) => [...rows, ...makeBatchRows(10, filterStore !== "all" ? filterStore : stores[0]?.id || "", getTodayInputDate())])}>
            Agregar 10 filas
          </Button>
          <Button variant="outline" onClick={() => setShowBatch(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSaveBatch} disabled={savingBatch}>
            {savingBatch ? "Guardando..." : "Guardar batch"}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
