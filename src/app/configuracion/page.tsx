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

type Tab = "locales" | "proveedores" | "productos" | "consumo" | "entregas";

export default function ConfiguracionPage() {
  const { addToast } = useToast();
  const [tab, setTab] = useState<Tab>("locales");
  const [stores, setStores] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [baselines, setBaselines] = useState<any[]>([]);

  // Forms
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    fetch("/api/locales").then((r) => r.json()).then(setStores);
    fetch("/api/proveedores").then((r) => r.json()).then(setSuppliers);
    fetch("/api/productos").then((r) => r.json()).then(setProducts);
  };

  // ── Locales ──
  const handleAddStore = async () => {
    if (!formData.name) return;
    await fetch("/api/locales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });
    addToast("Local creado", "success");
    setShowForm(false);
    setFormData({});
    loadData();
  };

  // ── Proveedores ──
  const handleAddSupplier = async () => {
    if (!formData.name) return;
    const aliases = formData.aliasesRaw
      ? formData.aliasesRaw.split(",").map((a: string) => a.trim()).filter(Boolean)
      : [];
    await fetch("/api/proveedores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...formData, aliases, eerrCategory: formData.eerrLabel }),
    });
    addToast("Proveedor creado", "success");
    setShowForm(false);
    setFormData({});
    loadData();
  };

  // ── Productos ──
  const handleAddProduct = async () => {
    if (!formData.name) return;
    const aliases = formData.aliasesRaw
      ? formData.aliasesRaw.split(",").map((a: string) => a.trim()).filter(Boolean)
      : [];
    await fetch("/api/productos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...formData, aliases }),
    });
    addToast("Producto creado", "success");
    setShowForm(false);
    setFormData({});
    loadData();
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: "locales", label: "Locales" },
    { key: "proveedores", label: "Proveedores" },
    { key: "productos", label: "Productos" },
    { key: "entregas", label: "Dias de entrega" },
  ];

  return (
    <div>
      <PageHeader
        title="Configuracion"
        description="Locales, proveedores, productos, alias y parametros"
      />

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? "border-brand-500 text-brand-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── LOCALES ── */}
      {tab === "locales" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Locales</CardTitle>
            <Button
              size="sm"
              onClick={() => {
                setFormData({ type: "store" });
                setShowForm(true);
              }}
            >
              + Nuevo local
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Direccion</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stores.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="text-gray-500">{s.address || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={s.active ? "success" : "default"}>
                        {s.active ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* ── PROVEEDORES ── */}
      {tab === "proveedores" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Proveedores</CardTitle>
            <Button
              size="sm"
              onClick={() => {
                setFormData({ type: "supplier", category: "MERCADERIA" });
                setShowForm(true);
              }}
            >
              + Nuevo proveedor
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Etiqueta EERR</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Alias</TableHead>
                  <TableHead>Remitos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.map((s: any) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">
                      {s.name}
                      {s.isBlancaluna && (
                        <Badge variant="info" className="ml-2">BL</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-gray-500">{s.eerrLabel || "—"}</TableCell>
                    <TableCell>
                      <Badge>{s.category}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-gray-400 max-w-48 truncate">
                      {s.aliases?.map((a: any) => a.alias).join(", ") || "—"}
                    </TableCell>
                    <TableCell>{s._count?.deliveryNotes || 0}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* ── PRODUCTOS ── */}
      {tab === "productos" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Productos</CardTitle>
            <Button
              size="sm"
              onClick={() => {
                setFormData({ type: "product", unit: "unidad", packSize: 1, safetyStock: 0, roundingUnit: 1 });
                setShowForm(true);
              }}
            >
              + Nuevo producto
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Unidad</TableHead>
                  <TableHead className="text-right">Stock seg.</TableHead>
                  <TableHead className="text-right">Redondeo</TableHead>
                  <TableHead>Alias</TableHead>
                  <TableHead>Proveedor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>{p.unit}</TableCell>
                    <TableCell className="text-right">{p.safetyStock}</TableCell>
                    <TableCell className="text-right">{p.roundingUnit}</TableCell>
                    <TableCell className="text-xs text-gray-400 max-w-36 truncate">
                      {p.aliases?.map((a: any) => a.alias).join(", ") || "—"}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {p.suppliers?.map((sp: any) => sp.supplier?.name).join(", ") || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* ── DÍAS DE ENTREGA ── */}
      {tab === "entregas" && <DeliveryScheduleConfig />}

      {/* ── DIALOG FORMULARIO ── */}
      <Dialog open={showForm} onClose={() => setShowForm(false)}>
        <DialogHeader>
          <DialogTitle>
            {formData.type === "store" && "Nuevo local"}
            {formData.type === "supplier" && "Nuevo proveedor"}
            {formData.type === "product" && "Nuevo producto"}
          </DialogTitle>
        </DialogHeader>
        <DialogContent>
          {formData.type === "store" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nombre *</label>
                <Input
                  value={formData.name || ""}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej: San Miguel Centro"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Direccion</label>
                <Input
                  value={formData.address || ""}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
            </div>
          )}

          {formData.type === "supplier" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nombre *</label>
                <Input
                  value={formData.name || ""}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Etiqueta EERR</label>
                <Input
                  value={formData.eerrLabel || ""}
                  onChange={(e) => setFormData({ ...formData, eerrLabel: e.target.value })}
                  placeholder="Como aparece en el EERR"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Categoria</label>
                <Select
                  value={formData.category || "MERCADERIA"}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  <option value="MERCADERIA">MERCADERIA</option>
                  <option value="GASTOS_LOCAL">GASTOS DE LOCAL</option>
                  <option value="MANTENIMIENTO">MANTENIMIENTO</option>
                  <option value="OTROS">OTROS</option>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Alias (separados por coma)</label>
                <Input
                  value={formData.aliasesRaw || ""}
                  onChange={(e) => setFormData({ ...formData, aliasesRaw: e.target.value })}
                  placeholder="Ej: BLANCA LUNA, blancaluna"
                />
              </div>
            </div>
          )}

          {formData.type === "product" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nombre *</label>
                <Input
                  value={formData.name || ""}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Unidad</label>
                  <Select
                    value={formData.unit || "unidad"}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  >
                    <option value="unidad">Unidad</option>
                    <option value="kg">Kg</option>
                    <option value="litro">Litro</option>
                    <option value="bolsa">Bolsa</option>
                    <option value="caja">Caja</option>
                    <option value="pack">Pack</option>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Tam. pack</label>
                  <Input
                    type="number"
                    value={formData.packSize || 1}
                    onChange={(e) => setFormData({ ...formData, packSize: parseInt(e.target.value) || 1 })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Stock de seguridad</label>
                  <Input
                    type="number"
                    value={formData.safetyStock || 0}
                    onChange={(e) => setFormData({ ...formData, safetyStock: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Unidad de redondeo</label>
                  <Input
                    type="number"
                    value={formData.roundingUnit || 1}
                    onChange={(e) => setFormData({ ...formData, roundingUnit: parseFloat(e.target.value) || 1 })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Proveedor</label>
                <Select
                  value={formData.supplierId || ""}
                  onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                >
                  <option value="">Sin proveedor</option>
                  {suppliers.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Alias (separados por coma)</label>
                <Input
                  value={formData.aliasesRaw || ""}
                  onChange={(e) => setFormData({ ...formData, aliasesRaw: e.target.value })}
                  placeholder="Ej: M. Pollo, medallon pollo"
                />
              </div>
            </div>
          )}
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowForm(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => {
              if (formData.type === "store") handleAddStore();
              if (formData.type === "supplier") handleAddSupplier();
              if (formData.type === "product") handleAddProduct();
            }}
          >
            Guardar
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

// ── Componente de configuración de entregas ──
function DeliveryScheduleConfig() {
  const { addToast } = useToast();
  const [schedule, setSchedule] = useState<Record<string, { coverageDays: number; label: string }>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/pedidos?action=schedule")
      .then((r) => r.json())
      .then((data) => {
        setSchedule(data);
        setLoading(false);
      });
  }, []);

  const dayNames: Record<string, string> = {
    "0": "Domingo",
    "1": "Lunes",
    "2": "Martes",
    "3": "Miercoles",
    "4": "Jueves",
    "5": "Viernes",
    "6": "Sabado",
  };

  const handleSave = async () => {
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: "blancaluna_delivery_schedule",
        value: schedule,
        label: "Calendario de entregas BLANCALUNA",
      }),
    });
    addToast("Calendario de entregas guardado", "success");
  };

  if (loading) return <p className="text-gray-400">Cargando...</p>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dias de entrega BLANCALUNA</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-500 mb-4">
          Configura que dias se hacen pedidos y cuantos dias de cobertura tiene cada uno.
        </p>

        <div className="space-y-3">
          {Object.entries(schedule).map(([day, config]) => (
            <div key={day} className="flex items-center gap-4 p-3 border rounded-lg">
              <span className="font-medium w-28">{dayNames[day] || `Dia ${day}`}</span>
              <div className="flex-1">
                <Input
                  value={config.label}
                  onChange={(e) =>
                    setSchedule({
                      ...schedule,
                      [day]: { ...config, label: e.target.value },
                    })
                  }
                  placeholder="Ej: Lunes → Miercoles"
                  className="h-8"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Dias:</span>
                <Input
                  type="number"
                  value={config.coverageDays}
                  onChange={(e) =>
                    setSchedule({
                      ...schedule,
                      [day]: { ...config, coverageDays: parseInt(e.target.value) || 1 },
                    })
                  }
                  className="w-16 h-8 text-center"
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const newSchedule = { ...schedule };
                  delete newSchedule[day];
                  setSchedule(newSchedule);
                }}
              >
                ✗
              </Button>
            </div>
          ))}
        </div>

        <div className="mt-4 flex gap-2">
          <Select
            id="new-day"
            className="w-40"
          >
            {Object.entries(dayNames).map(([num, name]) => (
              <option key={num} value={num}>{name}</option>
            ))}
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const select = document.getElementById("new-day") as HTMLSelectElement;
              const day = select?.value || "0";
              if (!schedule[day]) {
                setSchedule({
                  ...schedule,
                  [day]: { coverageDays: 2, label: `${dayNames[day]} → ...` },
                });
              }
            }}
          >
            + Agregar dia
          </Button>
        </div>

        <div className="mt-6">
          <Button onClick={handleSave}>Guardar cambios</Button>
        </div>
      </CardContent>
    </Card>
  );
}
