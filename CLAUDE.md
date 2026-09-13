# CLAUDE.md — Mr Tasty · Operaciones

Contexto para trabajar en este repo. Leer antes de tocar código.

## Qué es

App privada de gestión para los dos locales **Mr Tasty** de San Miguel:

- **Balbín** = `balbin` (aparece en las planillas como "San Miguel" / "San Miguel 1")
- **Perón** = `peron` (aparece como "San Miguel 2" / "San Miguel II")

Junta en un solo lugar pedidos a proveedores, carga de facturas, estado de resultados y búsqueda de personal, **sobre los datos que el equipo ya carga en Google Sheets**. No reemplaza las planillas: las lee y escribe únicamente en pestañas nuevas.

Todo el producto (UI, mensajes de error, comentarios de código, docs) está **en español rioplatense**. Mantener ese registro al escribir código nuevo.

## Stack

| Pieza | Qué se usa |
|---|---|
| Framework | Next.js 16 (App Router) + React 19, TypeScript |
| Deploy | **Vercel** |
| Base | **Turso** (SQLite gestionado / libSQL) + Drizzle |
| Archivos | **Vercel Blob** en modo privado (originales de facturas) |
| Auth | **Auth.js (next-auth v5)** con Google, lista blanca `ALLOWED_EMAILS` |
| Estilos | Tailwind 4 + shadcn/ui (`components/ui`, vendored en `vendor/`) |
| Gráficos | Recharts |
| Validación | Zod |
| Google | Apps Script propio (Sheets + Gmail + OCR), firmado con HMAC |

Node ≥ 22.13. Requiere `npm run db:migrate` antes del primer `npm run dev`.

## Historia importante: migración desde Cloudflare

La app **nació sobre Cloudflare** (D1 + R2 + Workers) y se migró a Vercel + Turso + Blob. La migración se hizo **sin reescribir consultas ni migraciones**:

- `lib/db.ts` **replica la interfaz de D1** (`prepare().bind().first()/.all()/.run()`) sobre `@libsql/client`. Todo `lib/server.ts` está escrito contra esa forma. **No refactorizar a Drizzle "para limpiar"**: es deliberado y deja la puerta abierta a cambiar de proveedor tocando un solo archivo.
- `lib/blob.ts` replica la interfaz de R2 (`put` / `get` con `body` y `arrayBuffer`) sobre Vercel Blob privado.
- `db/index.ts` (Drizzle) existe sólo para consultas tipadas puntuales; **el camino principal es SQL directo vía `lib/server.ts`**.

Quedan restos inofensivos de la etapa anterior (`.wrangler/`, `scripts/migrate-off-cloudflare.py`).

## Mapa del repo

```
app/
  tasty-shell.tsx      Shell principal, navegación, estado global (cliente)
  workflows.tsx        ~48k: TODOS los flujos (pedidos, facturas, EERR, candidatos, conexiones)
  operating-insights.tsx / ledger-overview.tsx   Resumen
  login/               Pantalla de acceso
  api/
    records/route.ts   CRUD genérico de registros (GET por kind, POST crear/actualizar)
    google/route.ts    Todo lo que pasa por el conector (status/counts/finances/ocr/gmail/sync)
    files/route.ts     Subida y descarga de originales (Blob)
    state/route.ts     Estado liviano
    auth/[...nextauth]
  *.css                brand.css, globals.css, workflows.css, insights.css, login.css
lib/
  domain.ts            Zod schemas, SKUs, forecast(), suggestOrder(), dedupe, CSV seguro
  server.ts            auth, helpers HTTP, list/get/put, bridge() a Apps Script, syncRecord()
  db.ts                Adaptador D1-sobre-libSQL
  blob.ts              Adaptador R2-sobre-Vercel-Blob
  imports.ts           normalizeCounts, normalizeFinances, parseInvoiceText
db/schema.ts           3 tablas: records, audit, sales_periods
drizzle/               Migraciones (sin cambios desde la etapa Cloudflare)
data/                  reviewed.json (resumen curado), extractos de planillas
tests/ + scripts/      fixtures y scripts de preparación/QA (Python y mjs)
public/google-setup.html   Instrucciones de instalación del Apps Script
Claude outputs/        Capturas y snapshots de trabajo previo, NO es código vivo
```

### Modelo de datos

Una sola tabla `records` genérica: `id`, `kind`, `payload` (JSON), `dedupe`, `version`, timestamps. Los `kind` son `invoice`, `candidate`, `stock`, `supply`, `order`, `sale`, `expense`, `file`, más singletons (`google-bridge`, `counts-live`, `finances-live`, `gmail-cursor-*`). `audit` registra create/update. `sales_periods` fija el modo (mensual vs diario) por local+mes+canal.

Concurrencia optimista por `version`: un UPDATE que no cambia filas devuelve **409**, no pisa.

## Reglas del dominio (no romper)

Estas decisiones están tomadas a propósito. Si algo parece "un bug", probablemente sea una de estas:

- **Consumo, no stock.** La hoja «Conteo» registra consumo diario confirmado. Blancos, `?`, anotaciones y fechas duplicadas **no** se convierten en cero: eso hundiría los promedios y con ellos las sugerencias de pedido. Se marcan como inválidos y se excluyen.
- **«STOCK MUNRO» está excluido** del cálculo: es otro local. Usarlo produce pedidos mal dimensionados.
- **Umbral de sugerencia de pedido**: sólo se muestra cantidad con ≥70 % de cobertura sobre 56 días, ≥2 observaciones para el día de la semana proyectado y consumo en los últimos 4 días. Sin esa base, `demand = null` y no se arriesga un número.
- Papas en **bolsas** (como en la fuente). Los dos tamaños de carne (`carne80`, `carne55`) se mantienen **separados**.
- **Facturas**: dedupe por `CUIT:tipo:número`. Las **notas de crédito restan** (`signedAmount`). Exigen revisión manual (`status: draft → reviewed`) antes de contabilizarse.
- **Un registro ya exportado a Sheets no se edita**: se corrige con un ajuste documentado. La API devuelve 409 si tiene `syncedAt` o `syncLockedAt`.
- **Ventas**: no se pueden mezclar totales mensuales y ventas diarias dentro del mismo local + canal + mes (`sales_periods`).
- **Las facturas nuevas no se suman a los estados históricos**, porque podrían ya estar contabilizadas ahí.
- «Mercadería» sigue **compras** del EERR, no costo de consumo ajustado por inventario.
- **Alertas que se conservan a propósito**: febrero de Balbín tiene versiones alternativas y enero muestra diferencia entre canales y ventas. No emprolijar esos números.
- Hay 14 períodos por local importados. **Julio 2026 es el último mes completo**; agosto está incompleto.
- **Límites duros** (al superarlos se devuelve error, nunca totales recortados): 8 MB por archivo, 3 adjuntos por lectura de correo, 10.000 registros por tipo, 5.000 filas de conteo, 60 pestañas de EERR por local.

## Seguridad / conector

- `ALLOWED_EMAILS` vacío = **no entra nadie** (falla cerrado, a propósito).
- `DEV_AUTH_BYPASS="1"` agrega botón de acceso local. Tiene dos candados: `NODE_ENV !== "production"` **y** la variable. Vercel siempre compila en producción, así que nunca se expone publicado.
- Escrituras: se valida que el `origin` coincida con el de la request (anti-CSRF).
- El puente a Google (`bridge()` en `lib/server.ts`) firma cada mensaje con **HMAC SHA-256**, ventana de 5 minutos y nonce de un solo uso. Permisos: Gmail **sólo lectura** y `drive.file` para los docs temporales del OCR, que el conector borra.
- El Apps Script escribe **sólo** en las pestañas `Registro App` y `EERR App AAAA-MM`. Las planillas originales quedan intactas.
- La sincronización es **idempotente por ID**: se fija el contenido (`syncLockedAt`) antes de enviar, así un timeout se puede reintentar sin duplicar.
- Nunca commitear `.env.local` ni claves. Todo va en Vercel → Settings → Environment Variables.

## Comandos

```bash
npm install
cp .env.example .env.local    # completar
npm run db:migrate            # crea las tablas
npm run dev                   # http://localhost:3000

npm run build
npm test                      # scripts/domain.test.ts + scripts/connector.test.mjs
npx tsc --noEmit
npm run lint
npm run db:generate           # nueva migración tras cambiar db/schema.ts
```

Para desarrollo alcanza `TURSO_DATABASE_URL="file:./local.db"` (sin cuenta ni token). Secreto de sesión: `npx auth secret`.

## Estado actual / lo que falta

- **Faltan los proveedores reales** (bulto, plazo de entrega, frecuencia) y el **primer conteo de stock**. Sin eso la app no sugiere cantidades — y **no se inventaron parámetros** a propósito.
- Cobertura actual de insumos: **pan, papas, carne 80 g y carne 55 g** (los que están en las hojas de consumo).
- El conector de Google debe instalarse y autorizarse desde `mrtastysanmiguel@gmail.com` con permiso sobre las cuatro planillas (instrucciones en `public/google-setup.html`, accesibles desde Conexiones).
- Consumos: se actualizan al abrir la app y cada 15 min mientras esté abierta. EERR históricos y Gmail: a botón. **Todavía no hay sincronización con la app cerrada.**
- El envío del pedido al proveedor lo hace el equipo (la app exporta CSV). La selección de candidatos también: **no hay puntajes automáticos ni respuestas automáticas**.

## Criterio de trabajo

Cuando falta un dato, **la app dice que falta** en vez de estimarlo. Cuando un número puede estar mal, **se muestra la alerta** en vez de emprolijarlo. Mantener ese criterio: preferimos una pantalla que diga "no alcanzan los datos" antes que un pedido mal dimensionado o un margen que parece prolijo y es falso.

Ver también `README.md` (funcional + infraestructura) y `DEPLOY.md` (puesta en producción paso a paso).
