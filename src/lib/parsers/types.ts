/** Resultado del parseo de un remito */
export interface DeliveryNoteParsed {
  supplierName: string | null;
  date: string | null; // ISO string
  noteNumber: string | null;
  total: number | null;
  currency: string;
  storeName: string | null;
  items: DeliveryNoteItemParsed[];
  confidence: number; // 0-1
  rawText: string;
}

export interface DeliveryNoteItemParsed {
  productName: string;
  quantity: number | null;
  unitPrice: number | null;
  subtotal: number | null;
}

/** Resultado del parseo de una foto de stock */
export interface StockImageParsed {
  items: StockItemParsed[];
  confidence: number;
  rawText: string;
}

export interface StockItemParsed {
  productName: string;
  quantity: number;
  confidence: number;
}

/** Interface para parsers de documentos */
export interface DocumentParser {
  parseDeliveryNote(imageBase64: string, mimeType: string): Promise<DeliveryNoteParsed>;
}

/** Interface para parsers de fotos de stock */
export interface StockImageParser {
  parseStockImage(imageBase64: string, mimeType: string): Promise<StockImageParsed>;
}
