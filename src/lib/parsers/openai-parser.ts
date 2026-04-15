import type {
  DocumentParser,
  StockImageParser,
  DeliveryNoteParsed,
  StockImageParsed,
} from "./types";

/**
 * Parser real usando OpenAI GPT-4 Vision.
 * Requiere OPENAI_API_KEY en las variables de entorno.
 */
export class OpenAIDocumentParser implements DocumentParser {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || "";
    if (!this.apiKey) {
      throw new Error("OPENAI_API_KEY no configurada");
    }
  }

  async parseDeliveryNote(imageBase64: string, mimeType: string): Promise<DeliveryNoteParsed> {
    const prompt = `Analizá esta imagen de un remito/factura de una hamburguesería en Argentina.
Extraé la siguiente información en formato JSON:
{
  "supplierName": "nombre del proveedor",
  "date": "YYYY-MM-DD",
  "noteNumber": "número de remito/factura",
  "total": número_total,
  "currency": "ARS",
  "storeName": "nombre del local si aparece",
  "items": [
    {"productName": "nombre", "quantity": cantidad, "unitPrice": precio_unitario, "subtotal": subtotal}
  ],
  "confidence": 0.0 a 1.0 (tu confianza en la extracción),
  "rawText": "texto crudo que pudiste leer"
}
Si no podés leer algún campo, poné null. Los montos son en pesos argentinos (ARS).
Respondé SOLO con el JSON, sin texto adicional.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "image_url",
                image_url: { url: `data:${mimeType};base64,${imageBase64}` },
              },
            ],
          },
        ],
        max_tokens: 2000,
      }),
    });

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "{}";

    try {
      const cleaned = content.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      return JSON.parse(cleaned) as DeliveryNoteParsed;
    } catch {
      return {
        supplierName: null,
        date: null,
        noteNumber: null,
        total: null,
        currency: "ARS",
        storeName: null,
        items: [],
        confidence: 0,
        rawText: content,
      };
    }
  }
}

export class OpenAIStockImageParser implements StockImageParser {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || "";
    if (!this.apiKey) {
      throw new Error("OPENAI_API_KEY no configurada");
    }
  }

  async parseStockImage(imageBase64: string, mimeType: string): Promise<StockImageParsed> {
    const prompt = `Analizá esta imagen de una lista de stock/inventario de una hamburguesería.
Puede ser una foto de pizarra, escrita a mano, o un listado impreso.
Extraé los productos y cantidades en formato JSON:
{
  "items": [
    {"productName": "nombre del producto", "quantity": cantidad_numérica, "confidence": 0.0 a 1.0}
  ],
  "confidence": 0.0 a 1.0 (confianza general),
  "rawText": "texto crudo que pudiste leer"
}
Si no estás seguro de un nombre o cantidad, poné la mejor estimación con confianza baja.
Respondé SOLO con el JSON.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "image_url",
                image_url: { url: `data:${mimeType};base64,${imageBase64}` },
              },
            ],
          },
        ],
        max_tokens: 2000,
      }),
    });

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "{}";

    try {
      const cleaned = content.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      return JSON.parse(cleaned) as StockImageParsed;
    } catch {
      return { items: [], confidence: 0, rawText: content };
    }
  }
}
