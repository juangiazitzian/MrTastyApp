import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { getDocumentParser, getStockImageParser } from "@/lib/parsers";
import { resolveSupplier, resolveProduct } from "@/lib/alias-resolver";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file") as File;
  const type = formData.get("type") as string; // "remito" | "stock"

  if (!file) {
    return NextResponse.json({ error: "No se proporcionó archivo" }, { status: 400 });
  }

  // Guardar archivo
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const base64 = buffer.toString("base64");

  const uploadsDir = join(process.cwd(), "public", "uploads");
  await mkdir(uploadsDir, { recursive: true });

  const timestamp = Date.now();
  const filename = `${timestamp}-${file.name}`;
  const filepath = join(uploadsDir, filename);
  await writeFile(filepath, buffer);

  const imageUrl = `/uploads/${filename}`;
  const mimeType = file.type || "image/jpeg";

  try {
    if (type === "stock") {
      const parser = getStockImageParser();
      const result = await parser.parseStockImage(base64, mimeType);

      // Intentar resolver productos por alias
      const resolvedItems = await Promise.all(
        result.items.map(async (item) => {
          const resolved = await resolveProduct(item.productName);
          return {
            ...item,
            resolvedProductId: resolved?.id || null,
            resolvedProductName: resolved?.name || null,
          };
        })
      );

      return NextResponse.json({
        type: "stock",
        imageUrl,
        parsed: { ...result, items: resolvedItems },
      });
    } else {
      // Remito
      const parser = getDocumentParser();
      const result = await parser.parseDeliveryNote(base64, mimeType);

      // Intentar resolver proveedor
      let resolvedSupplier = null;
      if (result.supplierName) {
        resolvedSupplier = await resolveSupplier(result.supplierName);
      }

      // Intentar resolver productos en items
      const resolvedItems = await Promise.all(
        result.items.map(async (item) => {
          const resolved = await resolveProduct(item.productName);
          return {
            ...item,
            resolvedProductId: resolved?.id || null,
            resolvedProductName: resolved?.name || null,
          };
        })
      );

      return NextResponse.json({
        type: "remito",
        imageUrl,
        parsed: {
          ...result,
          items: resolvedItems,
          resolvedSupplierId: resolvedSupplier?.id || null,
          resolvedSupplierName: resolvedSupplier?.name || null,
        },
      });
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: `Error procesando imagen: ${error.message}`, imageUrl },
      { status: 500 }
    );
  }
}
