# Mr Tasty · Operaciones

Aplicación privada de gestión para los dos locales Mr Tasty de San Miguel: **Balbín** (San Miguel 1) y **Perón** (San Miguel 2). Reúne pedidos a proveedores, carga de facturas, estado de resultados y búsqueda de personal en un solo lugar, sobre los datos que el equipo ya carga en Google Sheets.

## Qué hace cada sección

**Resumen** muestra facturación, gastos, resultado y margen del período elegido, con la comparación mensual entre locales, la distribución del gasto por categoría y el consumo medio por día de la semana. Separa los movimientos históricos importados de los que el equipo carga en la app.

**Pedidos y stock** calcula cuánto pedir de cada insumo a partir del consumo de las últimas ocho semanas, comparando el mismo día de la semana. Toma en cuenta el stock contado, el bulto del proveedor, la demora de entrega, la frecuencia de pedido, el margen de seguridad y las entregas pendientes. Guarda el pedido como borrador y lo exporta en CSV; el envío al proveedor queda a cargo del equipo.

**Facturas** guarda el original del comprobante, extrae su texto por OCR para acelerar la carga y exige revisión manual antes de contabilizarlo. Contempla notas de crédito, que restan, y bloquea cargar dos veces el mismo CUIT, tipo y número.

**Estado de resultados** combina el histórico importado de las planillas con el cierre preliminar del mes en curso. Admite ventas diarias o totales mensuales, pero no permite mezclarlos dentro del mismo local, canal y mes.

**Candidatos** importa los currículums que llegan por correo, lee los adjuntos y los hace buscables. La selección la hace el equipo: no hay puntajes automáticos ni envío de respuestas.

**Conexiones** configura y comprueba el acceso a Google, y dispara la actualización de consumos y estados de resultados.

## Puesta en marcha

Requiere Node.js 22.13 o superior.

```bash
npm install
cp .env.example .env.local   # completar los valores
npm run db:migrate           # crea las tablas
npm run dev                  # http://localhost:3000
```

Para desarrollo alcanza con una base SQLite en un archivo: dejando `TURSO_DATABASE_URL="file:./local.db"` no hace falta cuenta ni token. Generá el secreto de sesión con `npx auth secret` y cargá tu propio correo en `ALLOWED_EMAILS`, porque si esa variable queda vacía no entra nadie.

Para entrar sin dar de alta un cliente OAuth de Google, poné `DEV_AUTH_BYPASS="1"` en `.env.local`: la pantalla de acceso suma un botón de modo desarrollo. Depende de dos condiciones simultáneas, que `NODE_ENV` no sea `production` y que la variable esté puesta, así que el sitio publicado en Vercel nunca lo expone.

Otros comandos: `npm run build`, `npm test`, `npx tsc --noEmit`, `npm run db:generate` para crear una migración nueva tras cambiar `db/schema.ts`.

## Infraestructura

Next.js 16 con App Router y React 19, desplegado en **Vercel**. Los datos viven en **Turso** (SQLite gestionado, mismo motor que la app usaba originalmente, con las migraciones de `drizzle/` sin cambios). Los originales de las facturas van a **Vercel Blob en modo privado**, sin URL pública. El acceso se resuelve con **Auth.js y cuenta de Google**, restringido a la lista de `ALLOWED_EMAILS`.

`lib/db.ts` expone la interfaz de Cloudflare D1 sobre libSQL. Es deliberado: permitió migrar de plataforma sin reescribir ni una consulta ni una migración, y deja la puerta abierta a cambiar de proveedor de nuevo tocando un solo archivo.

La conexión con Google Sheets y Gmail pasa por un Apps Script propio, firmado con HMAC SHA-256, con ventana de cinco minutos y nonce de un solo uso. Usa permisos de Gmail de sólo lectura y `drive.file` para los documentos temporales del OCR, que el propio conector borra. Escribe únicamente en las pestañas nuevas `Registro App` y `EERR App AAAA-MM`: las planillas originales quedan intactas.

La sincronización de registros es idempotente por ID. Antes de enviar, el contenido se fija para impedir cambios concurrentes entre el registro local y Sheets; ante una respuesta incierta se puede reintentar sin duplicar. Un registro ya exportado no se edita: se corrige con un ajuste documentado, conservando el original.

Límites vigentes: 8 MB por archivo, tres adjuntos por lectura de correo, 10.000 registros por tipo, 5.000 filas de conteo y 60 pestañas de EERR por local. Al superarlos la app devuelve error en lugar de mostrar totales recortados.

## Variables de entorno

Se cargan en Vercel, en *Project → Settings → Environment Variables*, y nunca se versionan. `TURSO_DATABASE_URL` y `TURSO_AUTH_TOKEN` para la base; `AUTH_SECRET`, `AUTH_GOOGLE_ID` y `AUTH_GOOGLE_SECRET` para la sesión; `ALLOWED_EMAILS` con los correos habilitados separados por coma; `BLOB_READ_WRITE_TOKEN` lo inyecta Vercel al crear el Blob store. El detalle está en `.env.example`.

En Google Cloud Console, el cliente OAuth necesita como URI de redirección `https://TU-DOMINIO/api/auth/callback/google`, y `http://localhost:3000/api/auth/callback/google` para trabajar en local.

## Criterios sobre los datos

San Miguel y San Miguel 1 son **Balbín**; San Miguel 2 y San Miguel II son **Perón**.

La hoja «Conteo» registra **consumo diario**, confirmado por el usuario. Los blancos, los `?`, las anotaciones y las fechas duplicadas no se convierten en consumo cero, porque tratarlos así hundiría los promedios y con ellos las sugerencias de pedido.

Las pestañas antiguas de stock dicen «STOCK MUNRO» y quedaron excluidas del cálculo: son de otro local y usarlas produciría pedidos mal dimensionados. La app exige un conteo propio de menos de 24 horas.

Una sugerencia de pedido sólo se muestra con al menos 70 % de cobertura sobre 56 días, dos observaciones para el día de la semana proyectado y consumo registrado en los últimos cuatro días. Sin esa base no se arriesga una cantidad. Las papas se expresan en bolsas, como en la fuente, y los dos tamaños de carne se mantienen separados.

Hay 14 períodos por local importados de los estados de resultados. Julio de 2026 es el último mes completo en ambos locales; agosto está incompleto. Febrero de Balbín tiene versiones alternativas y enero muestra una diferencia entre canales y ventas: esas alertas se conservan a propósito en lugar de emprolijar los números.

«Mercadería» sigue las compras del estado de resultados y no equivale al costo de consumo ajustado por inventario. Que una importación esté completa no significa que el cierre contable esté aprobado. Las facturas nuevas no se suman a los estados históricos, porque podrían ya estar contabilizadas ahí.

El resumen curado está en `data/reviewed.json` y las pruebas de conciliación usan `tests/fixtures/eerr.json`.

## Lo que falta

Cargar los proveedores reales con su bulto y sus plazos, y hacer el primer conteo de stock: sin eso la app no sugiere cantidades, y no se inventaron parámetros. La cobertura actual abarca pan, papas y medallones de 80 g y 55 g, que son los insumos presentes en las hojas de consumo.

El conector de Google debe instalarse y autorizarse desde `mrtastysanmiguel@gmail.com`, con permiso sobre las cuatro planillas; las instrucciones completas están en `public/google-setup.html`, accesibles desde Conexiones. Los consumos se actualizan al abrir la app y cada 15 minutos mientras esté abierta; los estados históricos y Gmail se actualizan desde sus botones. Todavía no hay sincronización con la app cerrada.
