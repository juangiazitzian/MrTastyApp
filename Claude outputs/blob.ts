import { put as blobPut, get as blobGet } from "@vercel/blob";

/**
 * Almacenamiento de los originales de facturas.
 *
 * Reemplaza el bucket R2 de Cloudflare por Vercel Blob en modo **privado**:
 * los comprobantes no quedan accesibles por URL pública. Se conserva la misma
 * interfaz que usaba R2 (`put` / `get`, con `body` y `arrayBuffer`) para no
 * tocar las rutas de archivos ni el OCR.
 */

export type StoredObject = {
  body: ReadableStream<Uint8Array>;
  arrayBuffer: () => Promise<ArrayBuffer>;
};

export function bucket() {
  return {
    async put(
      key: string,
      bytes: ArrayBuffer | Uint8Array,
      options?: { httpMetadata?: { contentType?: string } },
    ) {
      return blobPut(key, bytes as ArrayBuffer, {
        access: "private",
        contentType: options?.httpMetadata?.contentType,
        addRandomSuffix: false,
        allowOverwrite: true,
      });
    },

    async get(key: string): Promise<StoredObject | null> {
      const result = await blobGet(key, { access: "private" });
      if (!result || result.statusCode !== 200 || !result.stream) return null;

      const stream = result.stream;
      return {
        body: stream,
        // El stream se consume una sola vez: quien pida los bytes no usa `body`.
        arrayBuffer: async () => new Response(stream).arrayBuffer(),
      };
    },
  };
}
