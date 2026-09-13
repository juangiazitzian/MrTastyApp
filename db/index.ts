import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

/**
 * Cliente Drizzle sobre Turso/libSQL. El acceso principal de la app pasa por
 * `lib/server.ts`, que usa SQL directo; esto queda para consultas tipadas.
 */
let cached: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (cached) return cached;

  const url = process.env.TURSO_DATABASE_URL;
  if (!url) {
    throw new Error(
      "Falta TURSO_DATABASE_URL. En desarrollo podés usar un archivo local: file:./local.db",
    );
  }

  cached = drizzle(
    createClient({
      url,
      authToken: url.startsWith("file:") ? undefined : process.env.TURSO_AUTH_TOKEN,
    }),
    { schema },
  );
  return cached;
}
