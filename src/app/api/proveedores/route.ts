import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const category = url.searchParams.get("category");

  const where: any = { active: true };
  if (category) where.category = category;

  const suppliers = await prisma.supplier.findMany({
    where,
    include: {
      aliases: true,
      eerrMappings: true,
      _count: { select: { deliveryNotes: true } },
    },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(suppliers);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const supplier = await prisma.supplier.create({
    data: {
      name: body.name,
      category: body.category || "MERCADERIA",
      eerrLabel: body.eerrLabel || body.name,
      isBlancaluna: body.isBlancaluna || false,
    },
  });

  // Crear alias si vienen
  if (body.aliases && Array.isArray(body.aliases)) {
    for (const alias of body.aliases) {
      await prisma.supplierAlias.create({
        data: { alias, supplierId: supplier.id },
      });
    }
  }

  // Crear EERR mapping
  if (body.eerrLabel || body.eerrCategory) {
    await prisma.eerrMapping.create({
      data: {
        supplierId: supplier.id,
        eerrCategory: body.eerrCategory || body.eerrLabel || body.name,
        eerrSection: body.eerrSection || "MERCADERIA",
      },
    });
  }

  return NextResponse.json(supplier, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const body = await request.json();

  const supplier = await prisma.supplier.update({
    where: { id: body.id },
    data: {
      name: body.name,
      category: body.category,
      eerrLabel: body.eerrLabel,
      isBlancaluna: body.isBlancaluna,
    },
  });

  // Actualizar aliases
  if (body.aliases !== undefined) {
    await prisma.supplierAlias.deleteMany({ where: { supplierId: body.id } });
    for (const alias of body.aliases) {
      await prisma.supplierAlias.create({
        data: { alias, supplierId: body.id },
      });
    }
  }

  // Actualizar EERR mapping
  if (body.eerrCategory) {
    await prisma.eerrMapping.upsert({
      where: { supplierId: body.id },
      update: { eerrCategory: body.eerrCategory, eerrSection: body.eerrSection || "MERCADERIA" },
      create: {
        supplierId: body.id,
        eerrCategory: body.eerrCategory,
        eerrSection: body.eerrSection || "MERCADERIA",
      },
    });
  }

  return NextResponse.json(supplier);
}
