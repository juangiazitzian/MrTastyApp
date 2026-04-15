import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const supplierId = url.searchParams.get("supplierId");

  let products;
  if (supplierId) {
    products = await prisma.product.findMany({
      where: {
        active: true,
        suppliers: { some: { supplierId } },
      },
      include: {
        aliases: true,
        suppliers: { include: { supplier: { select: { id: true, name: true } } } },
      },
      orderBy: { name: "asc" },
    });
  } else {
    products = await prisma.product.findMany({
      where: { active: true },
      include: {
        aliases: true,
        suppliers: { include: { supplier: { select: { id: true, name: true } } } },
      },
      orderBy: { name: "asc" },
    });
  }

  return NextResponse.json(products);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const product = await prisma.product.create({
    data: {
      name: body.name,
      unit: body.unit || "unidad",
      packSize: body.packSize || 1,
      safetyStock: body.safetyStock || 0,
      roundingUnit: body.roundingUnit || 1,
    },
  });

  if (body.aliases && Array.isArray(body.aliases)) {
    for (const alias of body.aliases) {
      await prisma.productAlias.create({
        data: { alias, productId: product.id },
      });
    }
  }

  if (body.supplierId) {
    await prisma.supplierProduct.create({
      data: { supplierId: body.supplierId, productId: product.id },
    });
  }

  return NextResponse.json(product, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const body = await request.json();

  const product = await prisma.product.update({
    where: { id: body.id },
    data: {
      name: body.name,
      unit: body.unit,
      packSize: body.packSize,
      safetyStock: body.safetyStock,
      roundingUnit: body.roundingUnit,
    },
  });

  if (body.aliases !== undefined) {
    await prisma.productAlias.deleteMany({ where: { productId: body.id } });
    for (const alias of body.aliases) {
      await prisma.productAlias.create({
        data: { alias, productId: body.id },
      });
    }
  }

  return NextResponse.json(product);
}
