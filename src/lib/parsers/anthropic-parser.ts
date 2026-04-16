/**
 * Parser usando la API de Anthropic Claude Vision.
 * Configurable via ENV: DOCUMENT_PARSER_PROVIDER=anthropic
 * Requiere: ANTHROPIC_API_KEY en las variables de entorno.
 */

import type {
  DocumentParser,
  StockImageParser,
  DeliveryNoteParsed,
  StockImageParsed,
} from "./types";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-opus-4-5";

async function callClaude(
  prompt: string,
  imageBase64: string,
  mimeType: string
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY no configurada");

  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mimeType as
                  | "image/jpeg"
                  | "image/png"
                  | "image/gif"
                  | "image/webp",
                data: imageBase64,
              },
            },
            { type: "text", text: prompt },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Anthropic API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  return data.content?.[0]?.text ?? "";
}

function safeParseJSON<T>(text: string, fallback: T): T {
  // Extraer JSON del texto (puede venir con markdown code blocks)
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  const raw = match ? match[1] ?? match[0] : text;
  try {
    return JSON.parse(raw.trim()) as T;
  } catch {
    return fallback;
  }
}

// ──────────────────────────────────────────────
// Remitos
// ──────────────────────────────────────────────

const DELIVERY_PROMPT = `Analizá esta imagen de un remito o factura de proveedor argentino.
Extraé la siguiente información y devolvé SOLO un JSON con este formato exacto (sin texto adicional):

{
  "supplierName": "nombre del proveedor o null",
  "date": "fecha en formato YYYY-MM-DD o null",
  "noteNumber": "número de remito/factura o null",
  "total": número_decimal_o_null,
  "currency": "ARS",
  "storeName": "nombre del local si aparece o null",
  "items": [
    {
      "productName": "nombre del producto",
      "quantity": número_o_null,
      "unitPrice": número_o_null,
      "subtotal": número_o_null
    }
  ],
  "confidence": número_entre_0_y_1,
  "rawText": "texto plano extraído de la imagen"
}

Notas:
- Si el total tiene puntos como separador de miles, interpretalo correctamente (ej: 1.234,56 = 1234.56)
- Si no podés leer algo con seguridad, usá null
- confidence debe reflejar qué tan seguro estás de la extracción (0=no seguro, 1=muy seguro)`;

export class AnthropicDocumentParser implements DocumentParser {
  async parseDeliveryNote(
    imageBase64: string,
    mimeType: string
  ): Promise<DeliveryNoteParsed> {
    const text = await callClaude(DELIVERY_PROMPT, imageBase64, mimeType);
    const parsed = safeParseJSON<Partial<DeliveryNoteParsed>>(text, {});
    return {
      supplierName: parsed.supplierName ?? null,
      date: parsed.date ?? null,
      noteNumber: parsed.noteNumber ?? null,
      total: parsed.total ?? null,
      currency: parsed.currency ?? "ARS",
      storeName: parsed.storeName ?? null,
      items: Array.isArray(parsed.items) ? parsed.items : [],
      confidence: parsed.confidence ?? 0.5,
      rawText: parsed.rawText ?? text,
    };
  }
}

// ──────────────────────────────────────────────
// Stock
// ──────────────────────────────────────────────

const STOCK_PROMPT = `Analizá esta imagen que muestra un inventario o listado de stock.
Puede ser una foto de pizarra, una hoja escrita a mano, o cualquier formato.
Extraé los productos y sus cantidades. Devolvé SOLO un JSON con este formato exacto:

{
  "items": [
    {
      "productName": "nombre del producto tal como aparece",
      "quantity": número,
      "confidence": número_entre_0_y_1
    }
  ],
  "confidence": número_entre_0_y_1_general,
  "rawText": "texto plano extraído"
}

Notas:
- Interpretá abreviaturas comunes: "M. Pollo" = medallón de pollo, "Cheddarliq" = cheddar líquido
- Si una cantidad no se puede leer con seguridad, ponele confidence bajo pero incluila igual
- El campo confidence por item indica qué tan seguro estás de ese item específico`;

export class AnthropicStockImageParser implements StockImageParser {
  async parseStockImage(
    imageBase64: string,
    mimeType: string
  ): Promise<StockImageParsed> {
    const text = await callClaude(STOCK_PROMPT, imageBase64, mimeType);
    const parsed = safeParseJSON<Partial<StockImageParsed>>(text, { items: [], confidence: 0, rawText: "" });
    return {
      items: Array.isArray(parsed.items) ? parsed.items : [],
      confidence: parsed.confidence ?? 0.5,
      rawText: parsed.rawText ?? text,
    };
  }
}
