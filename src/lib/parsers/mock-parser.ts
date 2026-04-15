import type {
  DocumentParser,
  StockImageParser,
  DeliveryNoteParsed,
  StockImageParsed,
} from "./types";

/**
 * Parser mock para desarrollo local.
 * Devuelve datos de ejemplo para poder testear el flujo sin un servicio de OCR real.
 */
export class MockDocumentParser implements DocumentParser {
  async parseDeliveryNote(_imageBase64: string, _mimeType: string): Promise<DeliveryNoteParsed> {
    // Simular delay de procesamiento
    await new Promise((r) => setTimeout(r, 800));

    return {
      supplierName: "BLANCALUNA",
      date: new Date().toISOString().split("T")[0],
      noteNumber: `R-${Math.floor(Math.random() * 10000)}`,
      total: Math.round(Math.random() * 50000 + 10000),
      currency: "ARS",
      storeName: null,
      items: [
        { productName: "Papas", quantity: 20, unitPrice: 500, subtotal: 10000 },
        { productName: "Cheddar", quantity: 10, unitPrice: 800, subtotal: 8000 },
        { productName: "Nuggets", quantity: 5, unitPrice: 1200, subtotal: 6000 },
      ],
      confidence: 0.75,
      rawText: "[MOCK] Remito simulado para desarrollo",
    };
  }
}

export class MockStockImageParser implements StockImageParser {
  async parseStockImage(_imageBase64: string, _mimeType: string): Promise<StockImageParsed> {
    await new Promise((r) => setTimeout(r, 600));

    return {
      items: [
        { productName: "Papas", quantity: 140, confidence: 0.9 },
        { productName: "Cheddar", quantity: 30, confidence: 0.85 },
        { productName: "Nuggets", quantity: 8, confidence: 0.9 },
        { productName: "M. Pollo", quantity: 9, confidence: 0.7 },
        { productName: "Sal", quantity: 1, confidence: 0.95 },
        { productName: "Leche", quantity: 8, confidence: 0.8 },
        { productName: "Ketchup", quantity: 70, confidence: 0.85 },
        { productName: "Mayo", quantity: 70, confidence: 0.85 },
        { productName: "Mostaza", quantity: 5, confidence: 0.9 },
        { productName: "Cheddarliq", quantity: 6, confidence: 0.7 },
      ],
      confidence: 0.82,
      rawText: "[MOCK] Stock simulado para desarrollo",
    };
  }
}
