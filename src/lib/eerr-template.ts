export type EerrTemplateItem = {
  category: string;
  source: "manual" | "remitos";
};

export type EerrTemplateSection = {
  name: string;
  kind: "income" | "expense";
  items: EerrTemplateItem[];
};

export const EERR_TEMPLATE: EerrTemplateSection[] = [
  {
    name: "VENTAS",
    kind: "income",
    items: [
      { category: "Cta Cte / Efectivo", source: "manual" },
      { category: "Pedidos YA Tarjeta", source: "manual" },
      { category: "Pedidos YA Efectivo", source: "manual" },
      { category: "Mercado Pago", source: "manual" },
    ],
  },
  {
    name: "MERCADERIA",
    kind: "expense",
    items: [
      { category: "Verduleria", source: "remitos" },
      { category: "Huevos", source: "remitos" },
      { category: "Aceite", source: "remitos" },
      { category: "CDP", source: "remitos" },
      { category: "The Bread Box", source: "remitos" },
      { category: "Coca Cola", source: "remitos" },
      { category: "Blanca Luna", source: "remitos" },
      { category: "TODO ENVASES", source: "remitos" },
      { category: "Papeleria", source: "remitos" },
    ],
  },
  {
    name: "SUELDOS",
    kind: "expense",
    items: [
      { category: "Sueldos", source: "manual" },
      { category: "Aguinaldos", source: "manual" },
      { category: "Liquidacion Final", source: "manual" },
      { category: "Cargas / UTHGRA", source: "manual" },
      { category: "Extras Feriados / Dobles", source: "manual" },
    ],
  },
  {
    name: "GASTOS DE LOCAL",
    kind: "expense",
    items: [
      { category: "SISTEMA TANGO", source: "manual" },
      { category: "INTERNET", source: "manual" },
      { category: "Alquiler", source: "manual" },
      { category: "Libreria", source: "manual" },
      { category: "Comida Empleados", source: "manual" },
      { category: "GAS", source: "manual" },
      { category: "Alarmas", source: "manual" },
      { category: "Fee Publicidad", source: "manual" },
      { category: "Regalias", source: "manual" },
      { category: "Luz", source: "manual" },
      { category: "Fumigacion", source: "manual" },
      { category: "Celular", source: "manual" },
      { category: "Contador", source: "manual" },
      { category: "Dispenser de AGUA", source: "manual" },
      { category: "Transporte", source: "manual" },
      { category: "Seguro local", source: "manual" },
      { category: "Abogado", source: "manual" },
    ],
  },
  {
    name: "IMPUESTOS, GASTOS BANCARIOS Y COMISIONES",
    kind: "expense",
    items: [
      { category: "Comision Mercado Pago + Impuestos", source: "manual" },
      { category: "Comision Rappi + Impuestos", source: "manual" },
      { category: "Comision Pedidos YA + Impuestos", source: "manual" },
      { category: "Gastos Bancarios BBVA + Impuestos", source: "manual" },
      { category: "Impuestos IIBB", source: "manual" },
      { category: "Percepcion SICREB Banco BBVA", source: "manual" },
      { category: "Percepcion IVA Banco BBVA", source: "manual" },
      { category: "Autonomos", source: "manual" },
      { category: "IVA / AFIP", source: "manual" },
    ],
  },
  {
    name: "GASTOS DE MANTENIMIENTO",
    kind: "expense",
    items: [
      { category: "Mantenimiento / Ferreteria", source: "manual" },
      { category: "Mantenimiento Mano de Obra", source: "manual" },
      { category: "Ferreteria / Bazar / Varios", source: "manual" },
      { category: "Elementos de LIMPIEZA", source: "manual" },
      { category: "Impresiones / Carteleria", source: "manual" },
      { category: "Compra Equipamentos Extra", source: "manual" },
    ],
  },
];

export function findTemplateItem(section: string, category: string) {
  return EERR_TEMPLATE
    .find((s) => s.name === section)
    ?.items.find((i) => i.category === category);
}
