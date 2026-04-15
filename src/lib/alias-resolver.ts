import { prisma } from "./db";

/**
 * Intenta resolver un nombre de proveedor a su ID usando la tabla de aliases.
 * Busca primero match exacto por nombre, luego por alias (case-insensitive).
 */
export async function resolveSupplier(
  rawName: string
): Promise<{ id: string; name: string } | null> {
  if (!rawName) return null;

  const normalized = rawName.trim();

  // Match exacto por nombre
  const byName = await prisma.supplier.findFirst({
    where: { name: { equals: normalized } },
  });
  if (byName) return { id: byName.id, name: byName.name };

  // Match por alias
  const aliases = await prisma.supplierAlias.findMany({
    include: { supplier: true },
  });

  const lower = normalized.toLowerCase();
  const match = aliases.find((a) => a.alias.toLowerCase() === lower);
  if (match) return { id: match.supplier.id, name: match.supplier.name };

  // Match parcial (contiene)
  const partial = aliases.find(
    (a) =>
      a.alias.toLowerCase().includes(lower) ||
      lower.includes(a.alias.toLowerCase())
  );
  if (partial) return { id: partial.supplier.id, name: partial.supplier.name };

  return null;
}

/**
 * Intenta resolver un nombre de producto a su ID usando la tabla de aliases.
 */
export async function resolveProduct(
  rawName: string
): Promise<{ id: string; name: string } | null> {
  if (!rawName) return null;

  const normalized = rawName.trim();

  // Match exacto por nombre
  const byName = await prisma.product.findFirst({
    where: { name: { equals: normalized } },
  });
  if (byName) return { id: byName.id, name: byName.name };

  // Match por alias
  const aliases = await prisma.productAlias.findMany({
    include: { product: true },
  });

  const lower = normalized.toLowerCase();
  const match = aliases.find((a) => a.alias.toLowerCase() === lower);
  if (match) return { id: match.product.id, name: match.product.name };

  // Match parcial
  const partial = aliases.find(
    (a) =>
      a.alias.toLowerCase().includes(lower) ||
      lower.includes(a.alias.toLowerCase())
  );
  if (partial) return { id: partial.product.id, name: partial.product.name };

  return null;
}
