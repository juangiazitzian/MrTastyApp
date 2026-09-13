import { createClient, type Client, type InValue, type ResultSet } from "@libsql/client";

/**
 * Adaptador de base de datos.
 *
 * La app nació sobre Cloudflare D1 y todo `lib/server.ts` está escrito contra
 * su interfaz (`prepare().bind().first()/.all()/.run()`). Turso es el mismo
 * SQLite por debajo, así que en vez de reescribir cada consulta se replica esa
 * interfaz sobre `@libsql/client`. El SQL y las migraciones quedan intactos.
 */

let cached: Client | null = null;

function client(): Client {
  if (cached) return cached;

  const url = process.env.TURSO_DATABASE_URL;
  if (!url) {
    throw new Error(
      "Falta TURSO_DATABASE_URL. En desarrollo podés usar un archivo local: file:./local.db",
    );
  }

  cached = createClient({
    url,
    // Una base local (file:) no lleva token.
    authToken: url.startsWith("file:") ? undefined : process.env.TURSO_AUTH_TOKEN,
  });
  return cached;
}

/** Convierte las filas de libSQL en objetos planos, sin índices numéricos. */
function rows<T>(result: ResultSet): T[] {
  return result.rows.map(
    (row) =>
      Object.fromEntries(
        result.columns.map((column, index) => [column, row[index]]),
      ) as T,
  );
}

class Statement {
  constructor(
    private readonly sql: string,
    private readonly args: InValue[] = [],
  ) {}

  bind(...args: unknown[]): Statement {
    return new Statement(this.sql, args as InValue[]);
  }

  private execute() {
    return client().execute({ sql: this.sql, args: this.args });
  }

  async first<T = Record<string, unknown>>(): Promise<T | null> {
    const result = await this.execute();
    return rows<T>(result)[0] ?? null;
  }

  async all<T = Record<string, unknown>>(): Promise<{ results: T[]; success: true }> {
    const result = await this.execute();
    return { results: rows<T>(result), success: true };
  }

  async run(): Promise<{ meta: { changes: number; last_row_id: number }; success: true }> {
    const result = await this.execute();
    return {
      meta: {
        changes: result.rowsAffected,
        last_row_id: Number(result.lastInsertRowid ?? 0),
      },
      success: true,
    };
  }
}

/** Punto de entrada con la misma forma que el binding `DB` de D1. */
export function database() {
  return { prepare: (sql: string) => new Statement(sql) };
}

export type Database = ReturnType<typeof database>;
